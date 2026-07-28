<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
$configFile = __DIR__ . '/config.php';
if (!file_exists($configFile)) fail('Server configuration missing. Copy config.example.php to config.php.', 500);
$config = require $configFile;

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin && in_array($origin, $config['allowed_origins'], true)) {
  header('Access-Control-Allow-Origin: ' . $origin);
  header('Vary: Origin');
}
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('Method not allowed.', 405);

try {
  $db = $config['db'];
  $pdo = new PDO("mysql:host={$db['host']};dbname={$db['name']};charset={$db['charset']}", $db['user'], $db['password'], [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
  ]);
} catch (Throwable $e) { fail('Database connection failed.', 500); }

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) $input = [];
$action = $_GET['action'] ?? '';

try {
  switch ($action) {
    case 'send_signup_otp': sendSignupOtp($pdo, $config, $input); break;
    case 'complete_signup': completeSignup($pdo, $config, $input); break;
    case 'login': login($pdo, $config, $input); break;
    case 'verify_login_otp': verifyLoginOtp($pdo, $config, $input); break;
    case 'request_password_reset': requestPasswordReset($pdo, $config, $input); break;
    case 'reset_password': resetPassword($pdo, $config, $input); break;
    case 'create_invitation': createInvitation($pdo, $config, $input); break;
    case 'list_users': listUsers($pdo); break;
    case 'set_user_status': setUserStatus($pdo, $input); break;
    case 'me': currentUser($pdo); break;
    case 'logout': logout($pdo); break;
    default: fail('Unknown action.', 404);
  }
} catch (Throwable $e) {
  error_log('NexuxHR auth error: ' . $e->getMessage());
  fail($e instanceof DomainException ? $e->getMessage() : 'Internal server error.', $e instanceof DomainException ? 400 : 500);
}

function sendSignupOtp(PDO $pdo, array $config, array $in): never {
  $email = email($in['email'] ?? '');
  $existing = one($pdo, 'SELECT id FROM users WHERE email=?', [$email]);
  if ($existing) throw new DomainException('An account already exists for this email.');
  $otp = otp();
  saveOtp($pdo, $config, $email, 'signup', $otp, null);
  sendMail($config, $email, 'Your NexuxHR verification code', "Your NexuxHR verification code is: {$otp}\n\nIt expires in {$config['security']['otp_minutes']} minutes. Do not share this code.");
  ok(['message' => 'Verification code sent to your email.']);
}

function completeSignup(PDO $pdo, array $config, array $in): never {
  $email = email($in['email'] ?? '');
  $password = (string)($in['password'] ?? '');
  $otp = (string)($in['otp'] ?? '');
  $profile = is_array($in['profile'] ?? null) ? $in['profile'] : [];
  if (strlen($password) < 8) throw new DomainException('Password must be at least 8 characters.');
  verifyOtp($pdo, $email, 'signup', $otp, null);
  $role = 'team_member';
  $invitationCode = trim((string)($in['invitationCode'] ?? ''));
  if ($invitationCode !== '') {
    $invite = one($pdo, 'SELECT * FROM invitations WHERE invitation_code=? AND used_at IS NULL AND expires_at>NOW()', [$invitationCode]);
    if (!$invite || strtolower($invite['email']) !== $email) throw new DomainException('Invitation code is invalid or expired.');
    $role = $invite['role'];
  }
  $stmt = $pdo->prepare('INSERT INTO users(email,password_hash,full_name,employee_code,designation,department,role) VALUES(?,?,?,?,?,?,?)');
  $stmt->execute([$email, password_hash($password, PASSWORD_DEFAULT), trim((string)($profile['name'] ?? 'Employee')), trim((string)($profile['employeeCode'] ?? '')), trim((string)($profile['designation'] ?? '')), trim((string)($profile['department'] ?? '')), $role]);
  if ($invitationCode !== '') $pdo->prepare('UPDATE invitations SET used_at=NOW() WHERE invitation_code=?')->execute([$invitationCode]);
  $user = one($pdo, 'SELECT * FROM users WHERE id=?', [(int)$pdo->lastInsertId()]);
  $token = createSession($pdo, $config, (int)$user['id']);
  ok(['token'=>$token, 'user'=>publicUser($user)]);
}

function login(PDO $pdo, array $config, array $in): never {
  $email = email($in['email'] ?? '');
  $password = (string)($in['password'] ?? '');
  $user = one($pdo, 'SELECT * FROM users WHERE email=? AND status="active"', [$email]);
  if (!$user || !password_verify($password, $user['password_hash'])) throw new DomainException('Invalid email or password.');
  $otp = otp(); $challenge = bin2hex(random_bytes(32));
  saveOtp($pdo, $config, $email, 'login', $otp, $challenge);
  sendMail($config, $email, 'NexuxHR login verification code', "Your login verification code is: {$otp}\n\nIt expires in {$config['security']['otp_minutes']} minutes.");
  ok(['message'=>'Login OTP sent to your email.', 'challengeId'=>$challenge]);
}

function verifyLoginOtp(PDO $pdo, array $config, array $in): never {
  $email = email($in['email'] ?? '');
  $otp = (string)($in['otp'] ?? '');
  $challenge = (string)($in['challengeId'] ?? '');
  verifyOtp($pdo, $email, 'login', $otp, $challenge);
  $user = one($pdo, 'SELECT * FROM users WHERE email=? AND status="active"', [$email]);
  if (!$user) throw new DomainException('Account not found or inactive.');
  $token = createSession($pdo, $config, (int)$user['id']);
  ok(['token'=>$token, 'user'=>publicUser($user)]);
}

function requestPasswordReset(PDO $pdo, array $config, array $in): never {
  $email = email($in['email'] ?? '');
  $user = one($pdo, 'SELECT * FROM users WHERE email=?', [$email]);
  if ($user) {
    $plain = bin2hex(random_bytes(32));
    $hash = hash('sha256', $plain);
    $minutes = (int)$config['security']['reset_minutes'];
    $pdo->prepare('INSERT INTO password_resets(user_id,token_hash,expires_at) VALUES(?,?,DATE_ADD(NOW(), INTERVAL ? MINUTE))')->execute([(int)$user['id'], $hash, $minutes]);
    $link = rtrim($config['app_url'], '/') . '/?email=' . rawurlencode($email) . '&token=' . rawurlencode($plain);
    sendMail($config, $email, 'Reset your NexuxHR password', "Open this secure link to reset your password:\n{$link}\n\nThis link expires in {$minutes} minutes.");
  }
  ok(['message'=>'If that email exists, a password reset link has been sent.']);
}

function resetPassword(PDO $pdo, array $config, array $in): never {
  $email = email($in['email'] ?? ''); $token = (string)($in['resetToken'] ?? ''); $password = (string)($in['newPassword'] ?? '');
  if (strlen($password) < 8) throw new DomainException('Password must be at least 8 characters.');
  $user = one($pdo, 'SELECT * FROM users WHERE email=?', [$email]);
  if (!$user) throw new DomainException('Invalid reset link.');
  $row = one($pdo, 'SELECT * FROM password_resets WHERE user_id=? AND token_hash=? AND used_at IS NULL AND expires_at>NOW() ORDER BY id DESC LIMIT 1', [(int)$user['id'], hash('sha256',$token)]);
  if (!$row) throw new DomainException('Reset link is invalid or expired.');
  $pdo->prepare('UPDATE users SET password_hash=? WHERE id=?')->execute([password_hash($password,PASSWORD_DEFAULT),(int)$user['id']]);
  $pdo->prepare('UPDATE password_resets SET used_at=NOW() WHERE id=?')->execute([(int)$row['id']]);
  $pdo->prepare('UPDATE auth_sessions SET revoked_at=NOW() WHERE user_id=? AND revoked_at IS NULL')->execute([(int)$user['id']]);
  ok(['message'=>'Password updated. You can now sign in.']);
}

function createInvitation(PDO $pdo, array $config, array $in): never {
  $session = requireSession($pdo);
  $actor = one($pdo, 'SELECT * FROM users WHERE id=?', [(int)$session['user_id']]);
  if (!$actor || !in_array($actor['role'], ['admin','superadmin','hr_manager'], true)) throw new DomainException('You are not allowed to invite team members.');
  $email = email($in['email'] ?? '');
  $role = (string)($in['role'] ?? 'team_member');
  if (!in_array($role, ['admin','hr_manager','team_member'], true)) throw new DomainException('Invalid role.');
  $existingUser = one($pdo, 'SELECT id FROM users WHERE email=?', [$email]);
  if ($existingUser) throw new DomainException('An account already exists for this email.');
  $pdo->prepare('UPDATE invitations SET expires_at=NOW() WHERE email=? AND used_at IS NULL')->execute([$email]);
  $code = 'INV-' . random_int(10000, 99999);
  $days = 7;
  $pdo->prepare('INSERT INTO invitations(email,invitation_code,role,expires_at) VALUES(?,?,?,DATE_ADD(NOW(), INTERVAL ? DAY))')->execute([$email, $code, $role, $days]);
  $link = rtrim($config['app_url'], '/') . '/?invite=' . rawurlencode($code) . '&email=' . rawurlencode($email);
  sendMail($config, $email, 'You are invited to join NexuxHR', "You have been invited to join NexuxHR as {$role}.\n\nYour invitation code is: {$code}\n\nOpen this link to create your account:\n{$link}\n\nThis invitation expires in {$days} days.");
  ok(['message' => 'Invitation sent.', 'code' => $code]);
}

function listUsers(PDO $pdo): never {
  requireSession($pdo);
  $rows = $pdo->query('SELECT id,email,full_name,employee_code,designation,department,role,status,created_at FROM users ORDER BY created_at DESC')->fetchAll();
  $users = array_map(static function (array $u): array {
    return [
      'id' => (int)$u['id'],
      'email' => $u['email'],
      'fullName' => $u['full_name'],
      'employeeCode' => $u['employee_code'],
      'designation' => $u['designation'],
      'department' => $u['department'],
      'role' => $u['role'],
      'status' => $u['status'],
      'createdAt' => $u['created_at'],
    ];
  }, $rows);
  ok(['users' => $users]);
}

function setUserStatus(PDO $pdo, array $in): never {
  $session = requireSession($pdo);
  $actor = one($pdo, 'SELECT * FROM users WHERE id=?', [(int)$session['user_id']]);
  if (!$actor || !in_array($actor['role'], ['admin','superadmin','hr_manager'], true)) throw new DomainException('You are not allowed to change user status.');
  $userId = (int)($in['userId'] ?? 0);
  $status = (string)($in['status'] ?? '');
  if (!in_array($status, ['active','inactive'], true)) throw new DomainException('Invalid status.');
  if ($userId === (int)$actor['id']) throw new DomainException('You cannot change your own status.');
  $pdo->prepare('UPDATE users SET status=? WHERE id=?')->execute([$status, $userId]);
  if ($status === 'inactive') $pdo->prepare('UPDATE auth_sessions SET revoked_at=NOW() WHERE user_id=? AND revoked_at IS NULL')->execute([$userId]);
  ok(['message' => 'User status updated.']);
}

function currentUser(PDO $pdo): never {
  $session = requireSession($pdo); $user = one($pdo, 'SELECT * FROM users WHERE id=?', [(int)$session['user_id']]);
  ok(['user'=>publicUser($user)]);
}
function logout(PDO $pdo): never { $raw=bearer(); if ($raw) $pdo->prepare('UPDATE auth_sessions SET revoked_at=NOW() WHERE token_hash=?')->execute([hash('sha256',$raw)]); ok(['message'=>'Signed out.']); }

function saveOtp(PDO $pdo, array $config, string $email, string $purpose, string $otp, ?string $challenge): void {
  $pdo->prepare('UPDATE auth_otps SET used_at=NOW() WHERE email=? AND purpose=? AND used_at IS NULL')->execute([$email,$purpose]);
  $minutes=(int)$config['security']['otp_minutes'];
  $pdo->prepare('INSERT INTO auth_otps(email,purpose,challenge_id,otp_hash,expires_at) VALUES(?,?,?,?,DATE_ADD(NOW(), INTERVAL ? MINUTE))')->execute([$email,$purpose,$challenge,hash('sha256',$otp),$minutes]);
}
function verifyOtp(PDO $pdo, string $email, string $purpose, string $otp, ?string $challenge): void {
  $sql='SELECT * FROM auth_otps WHERE email=? AND purpose=? AND used_at IS NULL AND expires_at>NOW()'; $params=[$email,$purpose];
  if ($challenge !== null) { $sql.=' AND challenge_id=?'; $params[]=$challenge; }
  $sql.=' ORDER BY id DESC LIMIT 1'; $row=one($pdo,$sql,$params);
  if (!$row) throw new DomainException('OTP is invalid or expired.');
  if ((int)$row['attempts']>=5) throw new DomainException('Too many incorrect attempts. Request a new OTP.');
  if (!hash_equals($row['otp_hash'],hash('sha256',$otp))) { $pdo->prepare('UPDATE auth_otps SET attempts=attempts+1 WHERE id=?')->execute([(int)$row['id']]); throw new DomainException('Incorrect OTP.'); }
  $pdo->prepare('UPDATE auth_otps SET used_at=NOW() WHERE id=?')->execute([(int)$row['id']]);
}
function createSession(PDO $pdo, array $config, int $userId): string {
  $raw=bin2hex(random_bytes(32)); $days=(int)$config['security']['session_days'];
  $pdo->prepare('INSERT INTO auth_sessions(user_id,token_hash,expires_at) VALUES(?,?,DATE_ADD(NOW(), INTERVAL ? DAY))')->execute([$userId,hash('sha256',$raw),$days]);
  return $raw;
}
function requireSession(PDO $pdo): array { $raw=bearer(); if(!$raw) fail('Authentication required.',401); $s=one($pdo,'SELECT * FROM auth_sessions WHERE token_hash=? AND revoked_at IS NULL AND expires_at>NOW()',[hash('sha256',$raw)]); if(!$s) fail('Session expired.',401); return $s; }
function bearer(): ?string { $h=$_SERVER['HTTP_AUTHORIZATION']??''; return preg_match('/Bearer\s+(\S+)/i',$h,$m)?$m[1]:null; }
function email(mixed $value): string { $v=strtolower(trim((string)$value)); if(!filter_var($v,FILTER_VALIDATE_EMAIL)) throw new DomainException('Enter a valid email address.'); return $v; }
function otp(): string { return str_pad((string)random_int(0,999999),6,'0',STR_PAD_LEFT); }
function one(PDO $pdo,string $sql,array $params=[]): ?array { $s=$pdo->prepare($sql); $s->execute($params); $r=$s->fetch(); return $r?:null; }
function publicUser(array $u): array { return ['id'=>(int)$u['id'],'email'=>$u['email'],'fullName'=>$u['full_name'],'role'=>$u['role'],'employeeCode'=>$u['employee_code'],'designation'=>$u['designation'],'department'=>$u['department']]; }
function ok(array $data=[]): never { echo json_encode(['success'=>true]+$data,JSON_UNESCAPED_SLASHES); exit; }
function fail(string $message,int $status=400): never { http_response_code($status); echo json_encode(['success'=>false,'message'=>$message],JSON_UNESCAPED_SLASHES); exit; }

function sendMail(array $config,string $to,string $subject,string $body): void {
  $s=$config['smtp']; $context=stream_context_create(['ssl'=>['verify_peer'=>false,'verify_peer_name'=>false,'allow_self_signed'=>true]]); $fp=stream_socket_client('ssl://'.$s['host'].':'.$s['port'],$errno,$errstr,20,STREAM_CLIENT_CONNECT,$context);
  if(!$fp) throw new RuntimeException('Could not connect to mail server.');
  stream_set_timeout($fp,20); smtpExpect($fp,[220]); smtpCmd($fp,'EHLO nexuxhr.com',[250]); smtpCmd($fp,'AUTH LOGIN',[334]); smtpCmd($fp,base64_encode($s['username']),[334]); smtpCmd($fp,base64_encode($s['password']),[235]); smtpCmd($fp,'MAIL FROM:<'.$s['from_email'].'>',[250]); smtpCmd($fp,'RCPT TO:<'.$to.'>',[250,251]); smtpCmd($fp,'DATA',[354]);
  $headers=['From: '.$s['from_name'].' <'.$s['from_email'].'>','To: <'.$to.'>','Subject: '.$subject,'MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Date: '.date(DATE_RFC2822),'Message-ID: <'.bin2hex(random_bytes(12)).'@nexuxhr.com>'];
  $payload=implode("\r\n",$headers)."\r\n\r\n".str_replace("\n","\r\n",$body); $payload=preg_replace('/^\./m','..',$payload); fwrite($fp,$payload."\r\n.\r\n"); smtpExpect($fp,[250]); smtpCmd($fp,'QUIT',[221]); fclose($fp);
}
function smtpCmd($fp,string $command,array $codes): void { fwrite($fp,$command."\r\n"); smtpExpect($fp,$codes); }
function smtpExpect($fp,array $codes): void { $response=''; do { $line=fgets($fp,515); if($line===false) break; $response.=$line; } while(isset($line[3])&&$line[3]==='-'); $code=(int)substr($response,0,3); if(!in_array($code,$codes,true)) throw new RuntimeException('SMTP error: '.$response); }
