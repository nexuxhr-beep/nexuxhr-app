<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| NexuxHR Authentication + Multi-Tenant API
|--------------------------------------------------------------------------
| Frontend:
|   Production: https://app.nexuxhr.com
|   Local:      http://localhost:3000 or http://localhost:5173
|--------------------------------------------------------------------------
| Registration is invite-only. There is no self-signup action.
| Roles: superadmin > admin (company owner) > hr_manager > team_member
|--------------------------------------------------------------------------
*/

header('Content-Type: application/json; charset=utf-8');

$configFile = __DIR__ . '/config.php';

if (!file_exists($configFile)) {
  fail('Server configuration missing. Copy config.example.php to config.php.', 500);
}

$config = require $configFile;

/*
 * Launch-safe frontend URL normalization.
 * Older installs stored localhost in config.php, which produced unusable links
 * in invitation and password-reset emails. Environment variables take priority.
 */
$launchAppUrl = getenv('NEXUXHR_APP_URL') ?: 'https://nexux-hr-app.vercel.app';
if (empty($config['app_url']) || str_contains((string)$config['app_url'], 'localhost') || str_contains((string)$config['app_url'], '127.0.0.1')) {
  $config['app_url'] = $launchAppUrl;
}
$config['allowed_origins'] = array_values(array_unique(array_merge(
  is_array($config['allowed_origins'] ?? null) ? $config['allowed_origins'] : [],
  ['https://nexux-hr-app.vercel.app', 'https://app.nexuxhr.com']
)));

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

$defaultAllowedOrigins = [
  'https://app.nexuxhr.com',
  'https://www.app.nexuxhr.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

$configuredOrigins = $config['allowed_origins'] ?? [];
if (!is_array($configuredOrigins)) {
  $configuredOrigins = [];
}

$allowedOrigins = array_values(array_unique(array_merge(
  $defaultAllowedOrigins,
  $configuredOrigins
)));

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
  header('Access-Control-Allow-Origin: ' . $origin);
  header('Access-Control-Allow-Credentials: true');
  header('Vary: Origin');
}

header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept');
header('Access-Control-Max-Age: 86400');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
  http_response_code(204);
  exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
  fail('Method not allowed.', 405);
}

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
    // Auth
    case 'send_signup_otp': sendSignupOtp($pdo, $config, $input); break;
    case 'complete_signup': completeSignup($pdo, $config, $input); break;
    case 'login': login($pdo, $config, $input); break;
    case 'verify_login_otp': verifyLoginOtp($pdo, $config, $input); break;
    case 'request_password_reset': requestPasswordReset($pdo, $config, $input); break;
    case 'reset_password': resetPassword($pdo, $config, $input); break;
    case 'me': currentUser($pdo); break;
    case 'logout': logout($pdo); break;

    // Companies (superadmin only)
    case 'create_company_invite': createCompanyInvite($pdo, $config, $input); break;
    case 'list_companies': listCompanies($pdo); break;
    case 'update_company_status': updateCompanyStatus($pdo, $input); break;
    case 'delete_company': deleteCompany($pdo, $input); break;

    // Invitations (admin / hr_manager, scoped to their own company)
    case 'create_invitation': createInvitation($pdo, $config, $input); break;
    case 'list_invitations': listInvitations($pdo); break;
    case 'delete_invitation': deleteInvitation($pdo, $input); break;

    // Users
    case 'list_users': listUsers($pdo); break;
    case 'set_user_status': setUserStatus($pdo, $input); break;

    // Leave requests
    case 'submit_leave_request': submitLeaveRequest($pdo, $input); break;
    case 'list_leave_requests': listLeaveRequests($pdo); break;
    case 'review_leave_request': reviewLeaveRequest($pdo, $input); break;

    // Phase 2: Tasks
    case 'create_task': createTask($pdo, $input); break;
    case 'list_tasks': listTasks($pdo); break;
    case 'update_task_status': updateTaskStatus($pdo, $input); break;
    case 'delete_task': deleteTask($pdo, $input); break;

    // Phase 2: Employee requests
    case 'submit_employee_request': submitEmployeeRequest($pdo, $input); break;
    case 'list_employee_requests': listEmployeeRequests($pdo); break;
    case 'review_employee_request': reviewEmployeeRequest($pdo, $input); break;

    // Phase 2: Notifications
    case 'list_notifications': listNotifications($pdo); break;
    case 'set_notification_read': setNotificationRead($pdo, $input); break;
    case 'mark_all_notifications_read': markAllNotificationsRead($pdo); break;

    // Phase 2: Attendance
    case 'list_attendance': listAttendance($pdo, $input); break;
    case 'check_in': checkIn($pdo, $input); break;
    case 'check_out': checkOut($pdo); break;
    case 'upsert_attendance': upsertAttendance($pdo, $input); break;

    // Phase 6: Attendance management
    case 'attendance_overview': attendanceOverview($pdo, $input); break;
    case 'list_attendance_shifts': listAttendanceShifts($pdo); break;
    case 'save_attendance_shift': saveAttendanceShift($pdo, $input); break;
    case 'save_attendance_policy': saveAttendancePolicy($pdo, $input); break;
    case 'list_attendance_corrections': listAttendanceCorrections($pdo, $input); break;
    case 'submit_attendance_correction': submitAttendanceCorrection($pdo, $input); break;
    case 'review_attendance_correction': reviewAttendanceCorrection($pdo, $input); break;
    case 'lock_attendance_month': lockAttendanceMonth($pdo, $input); break;

    // Phase 7: BS-month attendance ranges, biometric import, HR leave record sheet
    case 'list_attendance_range': listAttendanceRange($pdo, $input); break;
    case 'attendance_overview_range': attendanceOverviewRange($pdo, $input); break;
    case 'import_biometric_attendance': importBiometricAttendance($pdo, $input); break;
    case 'list_leave_records': listLeaveRecords($pdo, $input); break;
    case 'save_leave_record': saveLeaveRecord($pdo, $input); break;
    case 'delete_leave_record': deleteLeaveRecord($pdo, $input); break;

    // Phase 8: birthdays and urgent notice acknowledgement
    case 'list_upcoming_birthdays': listUpcomingBirthdays($pdo, $input); break;
    case 'list_pending_urgent_notices': listPendingUrgentNotices($pdo); break;
    case 'acknowledge_notice': acknowledgeNotice($pdo, $input); break;

    // Phase 9: office expenses + onboarding profile setup
    case 'list_office_expenses': listOfficeExpenses($pdo, $input); break;
    case 'save_office_expense': saveOfficeExpense($pdo, $input); break;
    case 'delete_office_expense': deleteOfficeExpense($pdo, $input); break;
    case 'office_expense_stores': officeExpenseStores($pdo); break;
    case 'get_office_expense_photos': getOfficeExpensePhotos($pdo, $input); break;
    case 'complete_profile_setup': completeProfileSetup($pdo); break;

    // Notices
    case 'create_notice': createNotice($pdo, $input); break;
    case 'list_notices': listNotices($pdo); break;
    case 'delete_notice': deleteNotice($pdo, $input); break;

    // Assets
    case 'create_asset': createAsset($pdo, $input); break;
    case 'list_assets': listAssets($pdo); break;
    case 'get_asset_detail': getAssetDetail($pdo, $input); break;
    case 'update_asset': updateAsset($pdo, $input); break;
    case 'update_asset_status': updateAssetStatus($pdo, $input); break;

    // Phase 3: Employee profiles, documents, contracts and audit logs
    case 'list_employee_profiles': listEmployeeProfiles($pdo); break;
    case 'get_employee_profile': getEmployeeProfile($pdo, $input); break;
    case 'save_employee_profile': saveEmployeeProfile($pdo, $input); break;
    case 'delete_employee_document': deleteEmployeeDocument($pdo, $input); break;
    case 'list_contracts': listContracts($pdo); break;
    case 'save_contract': saveContract($pdo, $input); break;
    case 'list_audit_logs': listAuditLogs($pdo, $input); break;

    // Phase 5A: company letterhead and HR document generation
    case 'get_company_letterhead': getCompanyLetterhead($pdo); break;
    case 'save_company_letterhead': saveCompanyLetterhead($pdo, $input); break;
    case 'list_generated_documents': listGeneratedDocuments($pdo); break;
    case 'generate_hr_document': generateHrDocument($pdo, $input); break;
    case 'delete_generated_document': deleteGeneratedDocument($pdo, $input); break;

    default: fail('Unknown action.', 404);
  }
} catch (Throwable $e) {
  error_log('NexuxHR auth error: ' . $e->getMessage());
  fail($e instanceof DomainException ? $e->getMessage() : 'Internal server error.', $e instanceof DomainException ? 400 : 500);
}

/*
|--------------------------------------------------------------------------
| Auth
|--------------------------------------------------------------------------
*/

function sendSignupOtp(PDO $pdo, array $config, array $in): never {
  $email = email($in['email'] ?? '');
  $existing = one($pdo, 'SELECT id FROM users WHERE email=?', [$email]);
  if ($existing) throw new DomainException('An account already exists for this email.');
  // Registration is invite-only: a valid, unused, unexpired invitation must exist for this email.
  $invite = one($pdo, 'SELECT * FROM invitations WHERE email=? AND used_at IS NULL AND expires_at>NOW() ORDER BY id DESC LIMIT 1', [$email]);
  if (!$invite) throw new DomainException('This email has not been invited. Ask your Admin or HR for an invitation link.');
  $otp = otp();
  saveOtp($pdo, $config, $email, 'signup', $otp, null);
  sendMail($config, $email, 'Your NexuxHR verification code', renderEmailHtml('Verify your email', otpEmailHtml($otp, (int)$config['security']['otp_minutes'], 'Use this code to verify your email and finish setting up your NexuxHR account.')), true);
  ok(['message' => 'Verification code sent to your email.']);
}

function completeSignup(PDO $pdo, array $config, array $in): never {
  $email = email($in['email'] ?? '');
  $password = (string)($in['password'] ?? '');
  $otp = (string)($in['otp'] ?? '');
  $profile = is_array($in['profile'] ?? null) ? $in['profile'] : [];
  if (strlen($password) < 8) throw new DomainException('Password must be at least 8 characters.');
  verifyOtp($pdo, $email, 'signup', $otp, null);

  $invitationCode = trim((string)($in['invitationCode'] ?? ''));
  if ($invitationCode === '') throw new DomainException('An invitation code is required to create an account.');
  $invite = one($pdo, 'SELECT * FROM invitations WHERE invitation_code=? AND used_at IS NULL AND expires_at>NOW()', [$invitationCode]);
  if (!$invite || strtolower($invite['email']) !== $email) throw new DomainException('Invitation code is invalid or expired.');
  $existingUser = one($pdo, 'SELECT id FROM users WHERE email=?', [$email]);
  if ($existingUser) throw new DomainException('An account already exists for this email. Please sign in instead.');
  $role = $invite['role'];
  $companyId = $invite['company_id'] !== null ? (int)$invite['company_id'] : null;

  $stmt = $pdo->prepare('INSERT INTO users(email,password_hash,full_name,employee_code,designation,department,role,company_id) VALUES(?,?,?,?,?,?,?,?)');
  $stmt->execute([
    $email,
    password_hash($password, PASSWORD_DEFAULT),
    trim((string)($profile['name'] ?? 'Employee')),
    trim((string)($profile['employeeCode'] ?? '')),
    trim((string)($profile['designation'] ?? '')),
    trim((string)($profile['department'] ?? '')),
    $role,
    $companyId,
  ]);
  $pdo->prepare('UPDATE invitations SET used_at=NOW() WHERE invitation_code=?')->execute([$invitationCode]);
  $user = one($pdo, 'SELECT * FROM users WHERE email=?', [$email]);
  if (!$user) throw new DomainException('Account creation failed. Please try again.');
  $token = createSession($pdo, $config, (int)$user['id']);
  ok(['token'=>$token, 'user'=>publicUser($pdo, $user)]);
}

function login(PDO $pdo, array $config, array $in): never {
  $email = email($in['email'] ?? '');
  $password = (string)($in['password'] ?? '');
  $user = one($pdo, 'SELECT * FROM users WHERE email=? AND status="active"', [$email]);
  if (!$user || !password_verify($password, $user['password_hash'])) throw new DomainException('Invalid email or password.');
  if ($user['company_id'] !== null) {
    $company = one($pdo, 'SELECT status FROM companies WHERE id=?', [(int)$user['company_id']]);
    if ($company && $company['status'] === 'suspended') throw new DomainException('This company\'s access has been suspended.');
  }
  $token = createSession($pdo, $config, (int)$user['id']);
  ok(['token'=>$token, 'user'=>publicUser($pdo, $user)]);
}

function verifyLoginOtp(PDO $pdo, array $config, array $in): never {
  $email = email($in['email'] ?? '');
  $otp = (string)($in['otp'] ?? '');
  $challenge = (string)($in['challengeId'] ?? '');
  verifyOtp($pdo, $email, 'login', $otp, $challenge);
  $user = one($pdo, 'SELECT * FROM users WHERE email=? AND status="active"', [$email]);
  if (!$user) throw new DomainException('Account not found or inactive.');
  $token = createSession($pdo, $config, (int)$user['id']);
  ok(['token'=>$token, 'user'=>publicUser($pdo, $user)]);
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
    sendMail($config, $email, 'Reset your NexuxHR password', renderEmailHtml('Reset your password', linkEmailHtml('We received a request to reset your NexuxHR password. Click below to choose a new one.', $link, 'Reset Password', "This link expires in {$minutes} minutes. If you didn't request this, you can ignore this email.")), true);
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

function currentUser(PDO $pdo): never {
  $session = requireSession($pdo); $user = one($pdo, 'SELECT * FROM users WHERE id=?', [(int)$session['user_id']]);
  ok(['user'=>publicUser($pdo, $user)]);
}
function logout(PDO $pdo): never { $raw=bearer(); if ($raw) $pdo->prepare('UPDATE auth_sessions SET revoked_at=NOW() WHERE token_hash=?')->execute([hash('sha256',$raw)]); ok(['message'=>'Signed out.']); }

/*
|--------------------------------------------------------------------------
| Companies (superadmin only)
|--------------------------------------------------------------------------
*/

function requireSuperadmin(PDO $pdo): array {
  $session = requireSession($pdo);
  $actor = one($pdo, 'SELECT * FROM users WHERE id=?', [(int)$session['user_id']]);
  if (!$actor || $actor['role'] !== 'superadmin') throw new DomainException('Only the superadmin can do this.');
  return $actor;
}

function createCompanyInvite(PDO $pdo, array $config, array $in): never {
  requireSuperadmin($pdo);
  $companyName = trim((string)($in['companyName'] ?? ''));
  $adminEmail = email($in['adminEmail'] ?? '');
  if ($companyName === '') throw new DomainException('Company name is required.');

  $existingUser = one($pdo, 'SELECT id FROM users WHERE email=?', [$adminEmail]);
  if ($existingUser) throw new DomainException('An account already exists for this email.');

  $code = strtoupper(preg_replace('/[^A-Z0-9]/', '', strtoupper($companyName)));
  $code = substr($code !== '' ? $code : 'CO', 0, 10) . '-' . random_int(100, 999);

  $pdo->prepare('INSERT INTO companies(name, code) VALUES (?, ?)')->execute([$companyName, $code]);
  $companyId = (int)$pdo->lastInsertId();

  $pdo->prepare('UPDATE invitations SET expires_at=NOW() WHERE email=? AND used_at IS NULL')->execute([$adminEmail]);
  $inviteCode = 'INV-' . strtoupper(bin2hex(random_bytes(6)));
  $days = 7;
  $pdo->prepare('INSERT INTO invitations(email,invitation_code,role,company_id,expires_at) VALUES(?,?,?,?,DATE_ADD(NOW(), INTERVAL ? DAY))')
    ->execute([$adminEmail, $inviteCode, 'admin', $companyId, $days]);

  $link = rtrim($config['app_url'], '/') . '/?invite=' . rawurlencode($inviteCode) . '&email=' . rawurlencode($adminEmail);
  sendMail($config, $adminEmail, "You're invited to lead {$companyName} on NexuxHR",
    renderEmailHtml("Welcome to {$companyName}", linkEmailHtml("You've been invited to be the Admin/owner of <strong>{$companyName}</strong> on NexuxHR.", $link, 'Set Up My Account', "This invitation expires in {$days} days.")), true);

  ok(['message' => 'Company created and admin invited.', 'code' => $inviteCode, 'companyId' => $companyId]);
}

function updateCompanyStatus(PDO $pdo, array $in): never {
  requireSuperadmin($pdo);
  $companyId = (int)($in['companyId'] ?? 0);
  $status = (string)($in['status'] ?? '');
  if (!in_array($status, ['active','suspended'], true)) throw new DomainException('Invalid status.');
  $company = one($pdo, 'SELECT * FROM companies WHERE id=?', [$companyId]);
  if (!$company) throw new DomainException('Company not found.');
  $pdo->prepare('UPDATE companies SET status=? WHERE id=?')->execute([$status, $companyId]);
  if ($status === 'suspended') {
    $pdo->prepare('UPDATE auth_sessions SET revoked_at=NOW() WHERE user_id IN (SELECT id FROM users WHERE company_id=?) AND revoked_at IS NULL')->execute([$companyId]);
  }
  ok(['message' => 'Company status updated.']);
}


function deleteCompany(PDO $pdo, array $in): never {
  $actor = requireSuperadmin($pdo);
  $companyId = (int)($in['companyId'] ?? 0);
  $confirmationName = trim((string)($in['confirmationName'] ?? ''));
  $company = one($pdo, 'SELECT * FROM companies WHERE id=?', [$companyId]);
  if (!$company) throw new DomainException('Company not found.');
  if (strcasecmp($confirmationName, (string)$company['name']) !== 0) {
    throw new DomainException('Company name confirmation does not match.');
  }
  if ((int)($actor['company_id'] ?? 0) === $companyId) {
    throw new DomainException('You cannot delete the company attached to your current superadmin account.');
  }

  $pdo->beginTransaction();
  try {
    $tables = [
      'notice_acknowledgements','asset_photos','office_expense_photos',
      'attendance_corrections','attendance_records','attendance_month_locks',
      'leave_records','leave_requests','employee_documents','employee_contracts',
      'generated_hr_documents','company_letterheads','employee_requests','tasks',
      'notifications','notices','assets','office_expenses','employee_profiles',
      'attendance_policies','attendance_shifts','invitations','audit_logs'
    ];
    foreach ($tables as $table) {
      $exists = one($pdo, 'SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=?', [$table]);
      if (!$exists || (int)$exists['c'] === 0) continue;
      $columns = $pdo->query("SHOW COLUMNS FROM `{$table}`")->fetchAll(PDO::FETCH_COLUMN);
      if (in_array('company_id', $columns, true)) {
        $pdo->prepare("DELETE FROM `{$table}` WHERE company_id=?")->execute([$companyId]);
      } elseif (in_array('user_id', $columns, true)) {
        $pdo->prepare("DELETE FROM `{$table}` WHERE user_id IN (SELECT id FROM users WHERE company_id=?)")->execute([$companyId]);
      }
    }
    $pdo->prepare('DELETE FROM auth_sessions WHERE user_id IN (SELECT id FROM users WHERE company_id=?)')->execute([$companyId]);
    $pdo->prepare('DELETE FROM auth_otps WHERE email IN (SELECT email FROM users WHERE company_id=?)')->execute([$companyId]);
    $pdo->prepare('DELETE FROM password_resets WHERE email IN (SELECT email FROM users WHERE company_id=?)')->execute([$companyId]);
    $pdo->prepare('DELETE FROM users WHERE company_id=?')->execute([$companyId]);
    $pdo->prepare('DELETE FROM companies WHERE id=?')->execute([$companyId]);
    $pdo->commit();
  } catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    throw $e;
  }
  ok(['message' => 'Company and related tenant data deleted.']);
}

function listCompanies(PDO $pdo): never {
  requireSuperadmin($pdo);
  $rows = $pdo->query(
    'SELECT c.id, c.name, c.code, c.status, c.created_at,
            (SELECT full_name FROM users WHERE company_id = c.id AND role = "admin" ORDER BY id ASC LIMIT 1) AS admin_name,
            (SELECT email FROM users WHERE company_id = c.id AND role = "admin" ORDER BY id ASC LIMIT 1) AS admin_email,
            (SELECT COUNT(*) FROM users WHERE company_id = c.id) AS employee_count
     FROM companies c ORDER BY c.created_at DESC'
  )->fetchAll();
  $companies = array_map(static function (array $c): array {
    return [
      'id' => (int)$c['id'],
      'name' => $c['name'],
      'code' => $c['code'],
      'status' => $c['status'],
      'createdAt' => $c['created_at'],
      'adminName' => $c['admin_name'],
      'adminEmail' => $c['admin_email'],
      'employeeCount' => (int)$c['employee_count'],
    ];
  }, $rows);
  ok(['companies' => $companies]);
}

/*
|--------------------------------------------------------------------------
| Invitations (admin / hr_manager only, scoped to their own company)
|--------------------------------------------------------------------------
*/

function createInvitation(PDO $pdo, array $config, array $in): never {
  $session = requireSession($pdo);
  $actor = one($pdo, 'SELECT * FROM users WHERE id=?', [(int)$session['user_id']]);
  if (!$actor || !in_array($actor['role'], ['admin','hr_manager'], true) || $actor['company_id'] === null) {
    throw new DomainException('You are not allowed to invite team members.');
  }
  $email = email($in['email'] ?? '');
  $role = (string)($in['role'] ?? 'team_member');
  $allowedRolesToInvite = $actor['role'] === 'admin'
    ? ['hr_manager', 'operation_manager', 'accountant', 'team_member']
    : ['team_member'];
  if (!in_array($role, $allowedRolesToInvite, true)) throw new DomainException('You are not allowed to invite that role.');

  $existingUser = one($pdo, 'SELECT id FROM users WHERE email=?', [$email]);
  if ($existingUser) throw new DomainException('An account already exists for this email.');

  $companyId = (int)$actor['company_id'];
  $company = one($pdo, 'SELECT name FROM companies WHERE id=?', [$companyId]);

  $pdo->prepare('UPDATE invitations SET expires_at=NOW() WHERE email=? AND used_at IS NULL')->execute([$email]);
  $code = 'INV-' . strtoupper(bin2hex(random_bytes(6)));
  $days = 7;
  $pdo->prepare('INSERT INTO invitations(email,invitation_code,role,company_id,expires_at) VALUES(?,?,?,?,DATE_ADD(NOW(), INTERVAL ? DAY))')
    ->execute([$email, $code, $role, $companyId, $days]);

  $link = rtrim($config['app_url'], '/') . '/?invite=' . rawurlencode($code) . '&email=' . rawurlencode($email);
  $companyName = $company ? $company['name'] : 'NexuxHR';
  $roleLabels = [
    'hr_manager' => 'HR Manager',
    'operation_manager' => 'Operation Manager',
    'accountant' => 'Accountant',
    'team_member' => 'Team Member',
  ];
  $roleLabel = $roleLabels[$role] ?? ucwords(str_replace('_', ' ', $role));
  sendMail($config, $email, "You're invited to join {$companyName} on NexuxHR",
    renderEmailHtml("Welcome to {$companyName}", linkEmailHtml("You've been invited to join <strong>{$companyName}</strong> on NexuxHR as {$roleLabel}.", $link, 'Create My Account', "This invitation expires in {$days} days.")), true);

  ok(['message' => 'Invitation sent.', 'code' => $code]);
}

function requireInviter(PDO $pdo): array {
  $session = requireSession($pdo);
  $actor = one($pdo, 'SELECT * FROM users WHERE id=?', [(int)$session['user_id']]);
  if (!$actor || !in_array($actor['role'], ['admin','hr_manager'], true) || $actor['company_id'] === null) {
    throw new DomainException('You are not allowed to manage invitations.');
  }
  return $actor;
}

function listInvitations(PDO $pdo): never {
  $actor = requireInviter($pdo);
  $stmt = $pdo->prepare('SELECT * FROM invitations WHERE company_id=? ORDER BY id DESC');
  $stmt->execute([(int)$actor['company_id']]);
  $rows = $stmt->fetchAll();
  $invitations = array_map(static function (array $inv): array {
    $status = 'Pending';
    if ($inv['used_at'] !== null) $status = 'Accepted';
    elseif (strtotime($inv['expires_at']) < time()) $status = 'Expired';
    return [
      'id' => (int)$inv['id'],
      'email' => $inv['email'],
      'role' => $inv['role'],
      'code' => $inv['invitation_code'],
      'status' => $status,
      'createdAt' => $inv['created_at'],
      'expiresAt' => $inv['expires_at'],
    ];
  }, $rows);
  ok(['invitations' => $invitations]);
}

function deleteInvitation(PDO $pdo, array $in): never {
  $actor = requireInviter($pdo);
  $invitationId = (int)($in['invitationId'] ?? 0);
  $invite = one($pdo, 'SELECT * FROM invitations WHERE id=?', [$invitationId]);
  if (!$invite || (int)$invite['company_id'] !== (int)$actor['company_id']) throw new DomainException('Invitation not found.');
  if ($invite['used_at'] !== null) throw new DomainException('This invitation was already accepted — the account already exists.');
  $pdo->prepare('DELETE FROM invitations WHERE id=?')->execute([$invitationId]);
  ok(['message' => 'Invitation deleted. You can now invite this email again.']);
}

/*
|--------------------------------------------------------------------------
| Users
|--------------------------------------------------------------------------
*/

function listUsers(PDO $pdo): never {
  $session = requireSession($pdo);
  $actor = one($pdo, 'SELECT * FROM users WHERE id=?', [(int)$session['user_id']]);
  if (!$actor) throw new DomainException('Session user not found.');

  if ($actor['role'] === 'superadmin') {
    $rows = $pdo->query('SELECT id,email,full_name,employee_code,designation,department,role,company_id,status,created_at FROM users ORDER BY created_at DESC')->fetchAll();
  } elseif (in_array($actor['role'], ['admin','hr_manager'], true)) {
    if ($actor['company_id'] === null) { ok(['users' => []]); }
    $stmt = $pdo->prepare('SELECT id,email,full_name,employee_code,designation,department,role,company_id,status,created_at FROM users WHERE company_id=? ORDER BY created_at DESC');
    $stmt->execute([(int)$actor['company_id']]);
    $rows = $stmt->fetchAll();
  } else {
    $stmt = $pdo->prepare('SELECT id,email,full_name,employee_code,designation,department,role,company_id,status,created_at FROM users WHERE id=? LIMIT 1');
    $stmt->execute([(int)$actor['id']]);
    $rows = $stmt->fetchAll();
  }

  $users = array_map(static function (array $u): array {
    return [
      'id' => (int)$u['id'],
      'email' => $u['email'],
      'fullName' => $u['full_name'],
      'employeeCode' => $u['employee_code'],
      'designation' => $u['designation'],
      'department' => $u['department'],
      'role' => $u['role'],
      'companyId' => $u['company_id'] !== null ? (int)$u['company_id'] : null,
      'status' => $u['status'],
      'createdAt' => $u['created_at'],
    ];
  }, $rows);
  ok(['users' => $users]);
}

function setUserStatus(PDO $pdo, array $in): never {
  $session = requireSession($pdo);
  $actor = one($pdo, 'SELECT * FROM users WHERE id=?', [(int)$session['user_id']]);
  if (!$actor) throw new DomainException('Session user not found.');
  $userId = (int)($in['userId'] ?? 0);
  $status = (string)($in['status'] ?? '');
  if (!in_array($status, ['active','inactive'], true)) throw new DomainException('Invalid status.');
  if ($userId === (int)$actor['id']) throw new DomainException('You cannot change your own status.');

  $target = one($pdo, 'SELECT * FROM users WHERE id=?', [$userId]);
  if (!$target) throw new DomainException('User not found.');

  $allowed = $actor['role'] === 'superadmin'
    || (in_array($actor['role'], ['admin','hr_manager'], true) && $actor['company_id'] !== null && (int)$actor['company_id'] === (int)$target['company_id']);
  if (!$allowed) throw new DomainException("You are not allowed to change this user's status.");

  $pdo->prepare('UPDATE users SET status=? WHERE id=?')->execute([$status, $userId]);
  if ($status === 'inactive') $pdo->prepare('UPDATE auth_sessions SET revoked_at=NOW() WHERE user_id=? AND revoked_at IS NULL')->execute([$userId]);
  ok(['message' => 'User status updated.']);
}

/*
|--------------------------------------------------------------------------
| Leave requests
|--------------------------------------------------------------------------
*/

function submitLeaveRequest(PDO $pdo, array $in): never {
  $session = requireSession($pdo);
  $actor = one($pdo, 'SELECT * FROM users WHERE id=?', [(int)$session['user_id']]);
  if (!$actor || $actor['company_id'] === null) throw new DomainException('You must belong to a company to request leave.');

  $leaveType = trim((string)($in['leaveType'] ?? ''));
  $startDate = trim((string)($in['startDate'] ?? ''));
  $endDate = trim((string)($in['endDate'] ?? ''));
  $days = (int)($in['days'] ?? 0);
  $reason = trim((string)($in['reason'] ?? ''));
  if ($leaveType === '' || $startDate === '' || $endDate === '' || $days <= 0) throw new DomainException('Please fill in all leave request fields.');
  if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $endDate)) throw new DomainException('Invalid leave date.');
  if ($endDate < $startDate) throw new DomainException('Leave end date cannot be earlier than the start date.');

  $stmt = $pdo->prepare('INSERT INTO leave_requests(company_id,user_id,leave_type,start_date,end_date,days,reason) VALUES(?,?,?,?,?,?,?)');
  $stmt->execute([(int)$actor['company_id'], (int)$actor['id'], $leaveType, $startDate, $endDate, $days, $reason]);
  $leaveId = (int)$pdo->lastInsertId();
  notifyCompanyManagers($pdo, (int)$actor['company_id'], (int)$actor['id'], 'New leave request', $actor['full_name'] . ' requested ' . $leaveType . '.', 'request', 'request', $leaveId);
  ok(['message' => 'Leave request submitted.', 'id' => $leaveId]);
}

function listLeaveRequests(PDO $pdo): never {
  $session = requireSession($pdo);
  $actor = one($pdo, 'SELECT * FROM users WHERE id=?', [(int)$session['user_id']]);
  if (!$actor) throw new DomainException('Session user not found.');

  if ($actor['role'] === 'team_member') {
    $stmt = $pdo->prepare(
      'SELECT l.*, u.full_name AS employee_name, u.designation AS employee_designation, r.full_name AS reviewer_name, r.role AS reviewer_role
       FROM leave_requests l JOIN users u ON u.id=l.user_id LEFT JOIN users r ON r.id=l.reviewed_by_user_id
       WHERE l.user_id=? ORDER BY l.applied_on DESC'
    );
    $stmt->execute([(int)$actor['id']]);
  } elseif (in_array($actor['role'], ['admin','hr_manager'], true) && $actor['company_id'] !== null) {
    $stmt = $pdo->prepare(
      'SELECT l.*, u.full_name AS employee_name, u.designation AS employee_designation, r.full_name AS reviewer_name, r.role AS reviewer_role
       FROM leave_requests l JOIN users u ON u.id=l.user_id LEFT JOIN users r ON r.id=l.reviewed_by_user_id
       WHERE l.company_id=? ORDER BY l.applied_on DESC'
    );
    $stmt->execute([(int)$actor['company_id']]);
  } else {
    ok(['leaveRequests' => []]);
  }

  $rows = $stmt->fetchAll();
  $leaves = array_map(static function (array $l): array {
    return [
      'id' => (int)$l['id'],
      'employeeId' => (int)$l['user_id'],
      'employeeName' => $l['employee_name'],
      'designation' => $l['employee_designation'],
      'leaveType' => $l['leave_type'],
      'startDate' => $l['start_date'],
      'endDate' => $l['end_date'],
      'days' => (int)$l['days'],
      'reason' => $l['reason'],
      'status' => $l['status'],
      'appliedOn' => $l['applied_on'],
      'reviewedBy' => $l['reviewer_name'] ? ($l['reviewer_name'] . ' (' . ($l['reviewer_role'] === 'admin' ? 'Admin' : 'HR') . ')') : null,
      'reviewComment' => $l['review_comment'],
    ];
  }, $rows);
  ok(['leaveRequests' => $leaves]);
}

function reviewLeaveRequest(PDO $pdo, array $in): never {
  $session = requireSession($pdo);
  $actor = one($pdo, 'SELECT * FROM users WHERE id=?', [(int)$session['user_id']]);
  if (!$actor || !in_array($actor['role'], ['admin','hr_manager'], true) || $actor['company_id'] === null) {
    throw new DomainException('You are not allowed to review leave requests.');
  }
  $leaveId = (int)($in['leaveId'] ?? 0);
  $status = (string)($in['status'] ?? '');
  $comment = trim((string)($in['comment'] ?? ''));
  if (!in_array($status, ['Approved','Rejected'], true)) throw new DomainException('Invalid status.');

  $leave = one($pdo, 'SELECT * FROM leave_requests WHERE id=?', [$leaveId]);
  if (!$leave || (int)$leave['company_id'] !== (int)$actor['company_id']) throw new DomainException('Leave request not found.');

  $pdo->prepare('UPDATE leave_requests SET status=?, review_comment=?, reviewed_by_user_id=?, reviewed_at=NOW() WHERE id=?')
    ->execute([$status, $comment !== '' ? $comment : null, (int)$actor['id'], $leaveId]);
  createNotification($pdo, (int)$actor['company_id'], (int)$leave['user_id'], 'Leave request updated', 'Your leave request is now ' . $status . ($comment !== '' ? ': ' . $comment : '.'), 'request', 'request', $leaveId);
  ok(['message' => 'Leave request updated.']);
}

/*
|--------------------------------------------------------------------------
| Notices
|--------------------------------------------------------------------------
*/

function createNotice(PDO $pdo, array $in): never {
  $session = requireSession($pdo);
  $actor = one($pdo, 'SELECT * FROM users WHERE id=?', [(int)$session['user_id']]);
  if (!$actor || !in_array($actor['role'], ['admin','hr_manager'], true) || $actor['company_id'] === null) {
    throw new DomainException('You are not allowed to post notices.');
  }
  $title = trim((string)($in['title'] ?? ''));
  $content = trim((string)($in['content'] ?? ''));
  $priority = (string)($in['priority'] ?? 'Normal');
  if (!in_array($priority, ['Normal','Important','Urgent'], true)) $priority = 'Normal';
  if ($title === '' || $content === '') throw new DomainException('Title and content are required.');

  $stmt = $pdo->prepare('INSERT INTO notices(company_id,title,content,posted_by_user_id,priority) VALUES(?,?,?,?,?)');
  $stmt->execute([(int)$actor['company_id'], $title, $content, (int)$actor['id'], $priority]);
  $noticeId = (int)$pdo->lastInsertId();
  notifyCompanyUsers(
    $pdo,
    (int)$actor['company_id'],
    (int)$actor['id'],
    'New company notice',
    $title,
    'notice',
    'notice',
    $noticeId
  );
  ok(['message' => 'Notice posted.', 'id' => $noticeId]);
}

function listNotices(PDO $pdo): never {
  $session = requireSession($pdo);
  $actor = one($pdo, 'SELECT * FROM users WHERE id=?', [(int)$session['user_id']]);
  if (!$actor || $actor['company_id'] === null) { ok(['notices' => []]); }

  $stmt = $pdo->prepare(
    'SELECT n.*, u.full_name AS posted_by_name FROM notices n JOIN users u ON u.id=n.posted_by_user_id
     WHERE n.company_id=? ORDER BY n.created_at DESC'
  );
  $stmt->execute([(int)$actor['company_id']]);
  $rows = $stmt->fetchAll();
  $notices = array_map(static function (array $n): array {
    return [
      'id' => (int)$n['id'],
      'title' => $n['title'],
      'content' => $n['content'],
      'postedBy' => (int)$n['posted_by_user_id'],
      'postedByName' => $n['posted_by_name'],
      'date' => $n['created_at'],
      'priority' => $n['priority'],
    ];
  }, $rows);
  ok(['notices' => $notices]);
}

function deleteNotice(PDO $pdo, array $in): never {
  $session = requireSession($pdo);
  $actor = one($pdo, 'SELECT * FROM users WHERE id=?', [(int)$session['user_id']]);
  if (!$actor || !in_array($actor['role'], ['admin','hr_manager'], true) || $actor['company_id'] === null) {
    throw new DomainException('You are not allowed to delete notices.');
  }
  $noticeId = (int)($in['noticeId'] ?? 0);
  $notice = one($pdo, 'SELECT * FROM notices WHERE id=?', [$noticeId]);
  if (!$notice || (int)$notice['company_id'] !== (int)$actor['company_id']) throw new DomainException('Notice not found.');
  $pdo->prepare('DELETE FROM notices WHERE id=?')->execute([$noticeId]);
  ok(['message' => 'Notice deleted.']);
}

/*
|--------------------------------------------------------------------------
| Phase 2: Shared helpers
|--------------------------------------------------------------------------
*/

function requireCompanyUser(PDO $pdo): array {
  $session = requireSession($pdo);
  $actor = one($pdo, 'SELECT * FROM users WHERE id=?', [(int)$session['user_id']]);
  if (!$actor || $actor['company_id'] === null) throw new DomainException('You must belong to a company to use this module.');
  return $actor;
}

function requireCompanyManager(PDO $pdo): array {
  $actor = requireCompanyUser($pdo);
  if (!in_array($actor['role'], ['admin','hr_manager'], true)) throw new DomainException('Only Admin or HR can do this.');
  return $actor;
}

function createNotification(PDO $pdo, int $companyId, int $userId, string $title, string $message, string $type, ?string $entityType = null, ?int $entityId = null): void {
  $stmt = $pdo->prepare('INSERT INTO notifications(company_id,user_id,title,message,notification_type,entity_type,entity_id) VALUES(?,?,?,?,?,?,?)');
  $stmt->execute([$companyId, $userId, $title, $message, $type, $entityType, $entityId]);
}

function notifyCompanyManagers(PDO $pdo, int $companyId, int $excludeUserId, string $title, string $message, string $type, ?string $entityType = null, ?int $entityId = null): void {
  $stmt = $pdo->prepare('SELECT id FROM users WHERE company_id=? AND role IN ("admin","hr_manager") AND status="active" AND id<>?');
  $stmt->execute([$companyId, $excludeUserId]);
  foreach ($stmt->fetchAll() as $row) createNotification($pdo, $companyId, (int)$row['id'], $title, $message, $type, $entityType, $entityId);
}

function notifyCompanyUsers(PDO $pdo, int $companyId, int $excludeUserId, string $title, string $message, string $type, ?string $entityType = null, ?int $entityId = null): void {
  $stmt = $pdo->prepare('SELECT id FROM users WHERE company_id=? AND status="active" AND id<>?');
  $stmt->execute([$companyId, $excludeUserId]);
  foreach ($stmt->fetchAll() as $row) createNotification($pdo, $companyId, (int)$row['id'], $title, $message, $type, $entityType, $entityId);
}

/*
|--------------------------------------------------------------------------
| Phase 2: Tasks
|--------------------------------------------------------------------------
*/

function createTask(PDO $pdo, array $in): never {
  $actor = requireCompanyManager($pdo);
  $title = trim((string)($in['title'] ?? ''));
  $notes = trim((string)($in['notes'] ?? ''));
  $status = (string)($in['status'] ?? 'not_started');
  $priority = (string)($in['priority'] ?? 'Medium');
  $dueDate = trim((string)($in['dueDate'] ?? ''));
  $assignedTo = (int)($in['assignedToUserId'] ?? 0);
  if ($title === '' || $dueDate === '' || $assignedTo <= 0) throw new DomainException('Task title, employee and due date are required.');
  if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dueDate)) throw new DomainException('Invalid task due date.');
  if (!in_array($status, ['not_started','in_progress','completed','overdue'], true)) $status = 'not_started';
  if (!in_array($priority, ['Low','Medium','High','Critical'], true)) $priority = 'Medium';
  $target = one($pdo, 'SELECT * FROM users WHERE id=? AND company_id=? AND status="active" AND role="team_member"', [$assignedTo, (int)$actor['company_id']]);
  if (!$target) throw new DomainException('Selected active team member was not found in your company.');

  $stmt = $pdo->prepare('INSERT INTO tasks(company_id,title,notes,status,priority,due_date,assigned_to_user_id,assigned_by_user_id) VALUES(?,?,?,?,?,?,?,?)');
  $stmt->execute([(int)$actor['company_id'], $title, $notes !== '' ? $notes : null, $status, $priority, $dueDate, $assignedTo, (int)$actor['id']]);
  $taskId = (int)$pdo->lastInsertId();
  createNotification($pdo, (int)$actor['company_id'], $assignedTo, 'New task assigned', $actor['full_name'] . ' assigned you: ' . $title, 'task', 'task', $taskId);
  ok(['message' => 'Task assigned successfully.', 'id' => $taskId]);
}

function listTasks(PDO $pdo): never {
  $actor = requireCompanyUser($pdo);
  $pdo->prepare('UPDATE tasks SET status="overdue" WHERE company_id=? AND due_date<CURDATE() AND status NOT IN ("completed","overdue")')->execute([(int)$actor['company_id']]);
  $sql = 'SELECT t.*, assignee.full_name AS assigned_to_name, assigner.full_name AS assigned_by_name
          FROM tasks t JOIN users assignee ON assignee.id=t.assigned_to_user_id
          JOIN users assigner ON assigner.id=t.assigned_by_user_id WHERE t.company_id=?';
  $params = [(int)$actor['company_id']];
  if ($actor['role'] === 'team_member') { $sql .= ' AND t.assigned_to_user_id=?'; $params[] = (int)$actor['id']; }
  $sql .= ' ORDER BY FIELD(t.status,"overdue","in_progress","not_started","completed"), t.due_date ASC, t.id DESC';
  $stmt = $pdo->prepare($sql); $stmt->execute($params);
  $tasks = array_map(static function (array $t): array {
    return [
      'id'=>(int)$t['id'], 'title'=>$t['title'], 'notes'=>$t['notes'], 'status'=>$t['status'],
      'priority'=>$t['priority'], 'dueDate'=>$t['due_date'],
      'assignedTo'=>(int)$t['assigned_to_user_id'], 'assignedToName'=>$t['assigned_to_name'],
      'assignedBy'=>(int)$t['assigned_by_user_id'], 'assignedByName'=>$t['assigned_by_name'],
      'createdAt'=>$t['created_at'], 'updatedAt'=>$t['updated_at'],
    ];
  }, $stmt->fetchAll());
  ok(['tasks'=>$tasks]);
}

function updateTaskStatus(PDO $pdo, array $in): never {
  $actor = requireCompanyUser($pdo);
  $taskId = (int)($in['taskId'] ?? 0);
  $status = (string)($in['status'] ?? '');
  if (!in_array($status, ['not_started','in_progress','completed','overdue'], true)) throw new DomainException('Invalid task status.');
  $task = one($pdo, 'SELECT * FROM tasks WHERE id=? AND company_id=?', [$taskId, (int)$actor['company_id']]);
  if (!$task) throw new DomainException('Task not found.');
  $canUpdate = in_array($actor['role'], ['admin','hr_manager'], true) || (int)$task['assigned_to_user_id'] === (int)$actor['id'];
  if (!$canUpdate) throw new DomainException('You are not allowed to update this task.');
  $pdo->prepare('UPDATE tasks SET status=? WHERE id=?')->execute([$status, $taskId]);
  $recipient = (int)$actor['id'] === (int)$task['assigned_to_user_id'] ? (int)$task['assigned_by_user_id'] : (int)$task['assigned_to_user_id'];
  if ($recipient !== (int)$actor['id']) createNotification($pdo, (int)$actor['company_id'], $recipient, 'Task status updated', $actor['full_name'] . ' changed a task to ' . str_replace('_', ' ', $status) . '.', 'task', 'task', $taskId);
  ok(['message'=>'Task status updated.']);
}

function deleteTask(PDO $pdo, array $in): never {
  $actor = requireCompanyManager($pdo);
  $taskId = (int)($in['taskId'] ?? 0);
  $task = one($pdo, 'SELECT * FROM tasks WHERE id=? AND company_id=?', [$taskId, (int)$actor['company_id']]);
  if (!$task) throw new DomainException('Task not found.');
  if ((int)$task['assigned_to_user_id'] !== (int)$actor['id']) {
    createNotification($pdo, (int)$actor['company_id'], (int)$task['assigned_to_user_id'], 'Task removed', $actor['full_name'] . ' removed a task assignment.', 'task', 'task', $taskId);
  }
  $pdo->prepare('DELETE FROM tasks WHERE id=?')->execute([$taskId]);
  ok(['message'=>'Task deleted.']);
}

/*
|--------------------------------------------------------------------------
| Phase 2: Employee requests
|--------------------------------------------------------------------------
*/

function submitEmployeeRequest(PDO $pdo, array $in): never {
  $actor = requireCompanyUser($pdo);
  $type = (string)($in['requestType'] ?? '');
  $allowed = ['Leave','Salary Slip','Appointment','Attendance Correction','Asset Issue / Repair','Employment Letter','Document Request','Work From Home','Reimbursement','Other'];
  if (!in_array($type, $allowed, true)) throw new DomainException('Invalid request type.');
  $subject = trim((string)($in['subject'] ?? ''));
  $description = trim((string)($in['description'] ?? ''));
  $startDate = trim((string)($in['startDate'] ?? '')) ?: null;
  $endDate = trim((string)($in['endDate'] ?? '')) ?: null;
  $amountRaw = $in['amount'] ?? null;
  $amount = ($amountRaw === null || $amountRaw === '') ? null : (float)$amountRaw;
  if ($subject === '' || $description === '') throw new DomainException('Subject and request details are required.');
  foreach ([$startDate, $endDate] as $requestDate) {
    if ($requestDate !== null && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $requestDate)) throw new DomainException('Invalid request date.');
  }
  if ($startDate !== null && $endDate !== null && $endDate < $startDate) throw new DomainException('End date cannot be earlier than the start date.');
  if ($amount !== null && $amount < 0) throw new DomainException('Amount cannot be negative.');

  $stmt = $pdo->prepare('INSERT INTO employee_requests(company_id,user_id,request_type,subject,description,start_date,end_date,amount) VALUES(?,?,?,?,?,?,?,?)');
  $stmt->execute([(int)$actor['company_id'], (int)$actor['id'], $type, $subject, $description, $startDate, $endDate, $amount]);
  $requestId = (int)$pdo->lastInsertId();
  notifyCompanyManagers($pdo, (int)$actor['company_id'], (int)$actor['id'], 'New employee request', $actor['full_name'] . ' submitted: ' . $subject, 'request', 'request', $requestId);
  ok(['message'=>'Request submitted successfully.', 'id'=>$requestId]);
}

function listEmployeeRequests(PDO $pdo): never {
  $actor = requireCompanyUser($pdo);
  $sql = 'SELECT er.*, u.full_name AS employee_name, u.employee_code, u.designation, reviewer.full_name AS reviewer_name
          FROM employee_requests er JOIN users u ON u.id=er.user_id
          LEFT JOIN users reviewer ON reviewer.id=er.reviewed_by_user_id WHERE er.company_id=?';
  $params = [(int)$actor['company_id']];
  if ($actor['role'] === 'team_member') { $sql .= ' AND er.user_id=?'; $params[] = (int)$actor['id']; }
  $sql .= ' ORDER BY er.submitted_at DESC';
  $stmt=$pdo->prepare($sql); $stmt->execute($params);
  $requests=array_map(static function(array $r): array {
    return [
      'id'=>(int)$r['id'], 'employeeId'=>(int)$r['user_id'], 'employeeName'=>$r['employee_name'],
      'employeeCode'=>$r['employee_code'], 'designation'=>$r['designation'], 'requestType'=>$r['request_type'],
      'subject'=>$r['subject'], 'description'=>$r['description'], 'startDate'=>$r['start_date'],
      'endDate'=>$r['end_date'], 'amount'=>$r['amount'] !== null ? (float)$r['amount'] : null,
      'status'=>$r['status'], 'submittedAt'=>$r['submitted_at'], 'updatedAt'=>$r['updated_at'],
      'reviewedBy'=>$r['reviewed_by_user_id'] !== null ? (int)$r['reviewed_by_user_id'] : null,
      'reviewedByName'=>$r['reviewer_name'], 'reviewComment'=>$r['review_comment'],
    ];
  }, $stmt->fetchAll());
  ok(['requests'=>$requests]);
}

function reviewEmployeeRequest(PDO $pdo, array $in): never {
  $actor = requireCompanyManager($pdo);
  $requestId = (int)($in['requestId'] ?? 0);
  $status = (string)($in['status'] ?? '');
  $comment = trim((string)($in['comment'] ?? ''));
  if (!in_array($status, ['Pending','Accepted','Rejected'], true)) throw new DomainException('Invalid request status.');
  $request = one($pdo, 'SELECT * FROM employee_requests WHERE id=? AND company_id=?', [$requestId, (int)$actor['company_id']]);
  if (!$request) throw new DomainException('Request not found.');
  $pdo->prepare('UPDATE employee_requests SET status=?,reviewed_by_user_id=?,review_comment=? WHERE id=?')
    ->execute([$status, (int)$actor['id'], $comment !== '' ? $comment : null, $requestId]);
  createNotification($pdo, (int)$actor['company_id'], (int)$request['user_id'], 'Request updated', 'Your request is now ' . $status . ($comment !== '' ? ': ' . $comment : '.'), 'request', 'request', $requestId);
  ok(['message'=>'Request updated.']);
}

/*
|--------------------------------------------------------------------------
| Phase 2: Notifications
|--------------------------------------------------------------------------
*/

function listNotifications(PDO $pdo): never {
  $actor = requireCompanyUser($pdo);
  $stmt=$pdo->prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100');
  $stmt->execute([(int)$actor['id']]);
  $notifications=array_map(static function(array $n): array {
    return [
      'id'=>(int)$n['id'], 'title'=>$n['title'], 'message'=>$n['message'], 'type'=>$n['notification_type'],
      'entityType'=>$n['entity_type'], 'entityId'=>$n['entity_id'] !== null ? (int)$n['entity_id'] : null,
      'isRead'=>(bool)$n['is_read'], 'createdAt'=>$n['created_at'], 'readAt'=>$n['read_at'],
    ];
  }, $stmt->fetchAll());
  $count=one($pdo,'SELECT COUNT(*) AS c FROM notifications WHERE user_id=? AND is_read=0',[(int)$actor['id']]);
  ok(['notifications'=>$notifications,'unreadCount'=>(int)($count['c'] ?? 0)]);
}

function setNotificationRead(PDO $pdo, array $in): never {
  $actor = requireCompanyUser($pdo);
  $id=(int)($in['notificationId'] ?? 0); $isRead=(bool)($in['isRead'] ?? false);
  $row=one($pdo,'SELECT id FROM notifications WHERE id=? AND user_id=?',[$id,(int)$actor['id']]);
  if(!$row) throw new DomainException('Notification not found.');
  if($isRead) $pdo->prepare('UPDATE notifications SET is_read=1,read_at=NOW() WHERE id=?')->execute([$id]);
  else $pdo->prepare('UPDATE notifications SET is_read=0,read_at=NULL WHERE id=?')->execute([$id]);
  ok(['message'=>'Notification updated.']);
}

function markAllNotificationsRead(PDO $pdo): never {
  $actor = requireCompanyUser($pdo);
  $pdo->prepare('UPDATE notifications SET is_read=1,read_at=COALESCE(read_at,NOW()) WHERE user_id=? AND is_read=0')->execute([(int)$actor['id']]);
  ok(['message'=>'All notifications marked as read.']);
}

/*
|--------------------------------------------------------------------------
| Phase 2: Attendance
|--------------------------------------------------------------------------
*/

function attendancePayload(array $r): array {
  return [
    'id'=>(int)$r['id'], 'employeeId'=>(int)$r['user_id'], 'employeeName'=>$r['employee_name'],
    'date'=>$r['attendance_date'], 'month'=>substr($r['attendance_date'],0,7),
    'checkIn'=>$r['check_in'], 'checkOut'=>$r['check_out'], 'status'=>$r['status'],
    'workHours'=>$r['work_hours'] !== null ? (float)$r['work_hours'] : null, 'notes'=>$r['notes'],
  ];
}

function listAttendance(PDO $pdo, array $in): never {
  $actor=requireCompanyUser($pdo);
  $month=trim((string)($in['month'] ?? date('Y-m')));
  if(!preg_match('/^\d{4}-\d{2}$/',$month)) throw new DomainException('Invalid attendance month.');
  $sql='SELECT ar.*,u.full_name AS employee_name FROM attendance_records ar JOIN users u ON u.id=ar.user_id WHERE ar.company_id=? AND DATE_FORMAT(ar.attendance_date,"%Y-%m")=?';
  $params=[(int)$actor['company_id'],$month];
  if($actor['role']==='team_member'){ $sql.=' AND ar.user_id=?'; $params[]=(int)$actor['id']; }
  $sql.=' ORDER BY ar.attendance_date DESC,u.full_name ASC';
  $stmt=$pdo->prepare($sql); $stmt->execute($params);
  ok(['attendance'=>array_map('attendancePayload',$stmt->fetchAll())]);
}

function checkIn(PDO $pdo, array $in): never {
  $actor=requireCompanyUser($pdo);
  $existing=one($pdo,'SELECT * FROM attendance_records WHERE user_id=? AND attendance_date=CURDATE()',[(int)$actor['id']]);
  if($existing && $existing['check_in'] !== null) throw new DomainException('You have already checked in today.');
  $notes=trim((string)($in['notes'] ?? ''));
  if($existing){
    $pdo->prepare('UPDATE attendance_records SET check_in=CURTIME(),status="Present",notes=?,created_by_user_id=? WHERE id=?')->execute([$notes !== '' ? $notes : null,(int)$actor['id'],(int)$existing['id']]);
  }else{
    $pdo->prepare('INSERT INTO attendance_records(company_id,user_id,attendance_date,check_in,status,notes,created_by_user_id) VALUES(?,?,CURDATE(),CURTIME(),"Present",?,?)')
      ->execute([(int)$actor['company_id'],(int)$actor['id'],$notes !== '' ? $notes : null,(int)$actor['id']]);
  }
  $row=one($pdo,'SELECT ar.*,u.full_name AS employee_name FROM attendance_records ar JOIN users u ON u.id=ar.user_id WHERE ar.user_id=? AND ar.attendance_date=CURDATE()',[(int)$actor['id']]);
  ok(['message'=>'Checked in successfully.','attendance'=>attendancePayload($row)]);
}

function checkOut(PDO $pdo): never {
  $actor=requireCompanyUser($pdo);
  $row=one($pdo,'SELECT * FROM attendance_records WHERE user_id=? AND attendance_date=CURDATE()',[(int)$actor['id']]);
  if(!$row || $row['check_in'] === null) throw new DomainException('Check in before checking out.');
  if($row['check_out'] !== null) throw new DomainException('You have already checked out today.');
  $pdo->prepare('UPDATE attendance_records SET check_out=CURTIME(),work_hours=ROUND(TIMESTAMPDIFF(MINUTE,CONCAT(attendance_date," ",check_in),NOW())/60,2) WHERE id=?')->execute([(int)$row['id']]);
  $updated=one($pdo,'SELECT ar.*,u.full_name AS employee_name FROM attendance_records ar JOIN users u ON u.id=ar.user_id WHERE ar.id=?',[(int)$row['id']]);
  ok(['message'=>'Checked out successfully.','attendance'=>attendancePayload($updated)]);
}

function upsertAttendance(PDO $pdo, array $in): never {
  $actor=requireCompanyManager($pdo);
  $userId=(int)($in['userId'] ?? 0); $date=trim((string)($in['date'] ?? '')); $status=(string)($in['status'] ?? 'Present');
  $checkIn=trim((string)($in['checkIn'] ?? '')) ?: null; $checkOut=trim((string)($in['checkOut'] ?? '')) ?: null; $notes=trim((string)($in['notes'] ?? '')) ?: null;
  if($userId<=0 || $date==='') throw new DomainException('Employee and date are required.');
  if(!in_array($status,['Present','Absent','Late','Half Day','On Leave'],true)) throw new DomainException('Invalid attendance status.');
  $target=one($pdo,'SELECT id,full_name FROM users WHERE id=? AND company_id=?',[$userId,(int)$actor['company_id']]);
  if(!$target) throw new DomainException('Employee not found in your company.');
  $workHours=null;
  if($checkIn && $checkOut){ $start=strtotime($date.' '.$checkIn); $end=strtotime($date.' '.$checkOut); if($end>$start) $workHours=round(($end-$start)/3600,2); }
  $stmt=$pdo->prepare('INSERT INTO attendance_records(company_id,user_id,attendance_date,check_in,check_out,status,work_hours,notes,created_by_user_id)
    VALUES(?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE check_in=VALUES(check_in),check_out=VALUES(check_out),status=VALUES(status),work_hours=VALUES(work_hours),notes=VALUES(notes),created_by_user_id=VALUES(created_by_user_id)');
  $stmt->execute([(int)$actor['company_id'],$userId,$date,$checkIn,$checkOut,$status,$workHours,$notes,(int)$actor['id']]);
  if($userId !== (int)$actor['id']) createNotification($pdo,(int)$actor['company_id'],$userId,'Attendance updated',$actor['full_name'].' updated your attendance for '.$date.'.','attendance','attendance',null);
  ok(['message'=>'Attendance saved.']);
}

/*
|--------------------------------------------------------------------------
| Assets Register
|--------------------------------------------------------------------------
*/

function createAsset(PDO $pdo, array $in): never {
  $session = requireSession($pdo);
  $actor = one($pdo, 'SELECT * FROM users WHERE id=?', [(int)$session['user_id']]);
  if (!$actor || $actor['company_id'] === null) {
    throw new DomainException('You are not allowed to register assets.');
  }

  $isManager = in_array($actor['role'], ['admin','hr_manager'], true);
  $isEmployee = $actor['role'] === 'team_member';
  if (!$isManager && !$isEmployee) throw new DomainException('You are not allowed to register assets.');

  $assignedToUserId = $isEmployee ? (int)$actor['id'] : (int)($in['assignedToUserId'] ?? 0);
  $target = one($pdo, 'SELECT * FROM users WHERE id=? AND status="active"', [$assignedToUserId]);
  if (!$target || (int)$target['company_id'] !== (int)$actor['company_id']) throw new DomainException('Select a valid employee from your company.');
  if ($isEmployee && (int)$target['id'] !== (int)$actor['id']) throw new DomainException('Employees can only register assets assigned to themselves.');

  $assetType = (string)($in['assetType'] ?? '');
  if (!in_array($assetType, ['mobile','laptop','pc'], true)) throw new DomainException('Invalid asset type.');

  $issuedDate = trim((string)($in['issuedDate'] ?? ''));
  if ($issuedDate === '') throw new DomainException('Issued date is required.');
  $returnDate = trim((string)($in['returnDate'] ?? '')) ?: null;
  $renewalDays = isset($in['renewalIntervalDays']) && $in['renewalIntervalDays'] !== '' ? (int)$in['renewalIntervalDays'] : null;
  $purpose = trim((string)($in['purpose'] ?? ''));
  $accessories = trim((string)($in['accessories'] ?? ''));
  $acknowledged = !empty($in['acknowledged']) ? 1 : 0;
  $signature = is_string($in['signatureData'] ?? null) && $in['signatureData'] !== '' ? $in['signatureData'] : null;
  if ($acknowledged !== 1) throw new DomainException('Asset acknowledgement is required.');
  if ($signature === null) throw new DomainException('Employee signature is required.');

  $stmt = $pdo->prepare(
    'INSERT INTO assets(company_id,assigned_to_user_id,asset_type,model_name,imei1,imei2,device_type,brand_model,processor,device_id,operating_system,issued_date,return_date,renewal_interval_days,purpose,accessories,acknowledged,signature_data)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
  );
  $stmt->execute([
    (int)$actor['company_id'],
    $assignedToUserId,
    $assetType,
    trim((string)($in['modelName'] ?? '')) ?: null,
    trim((string)($in['imei1'] ?? '')) ?: null,
    trim((string)($in['imei2'] ?? '')) ?: null,
    trim((string)($in['deviceType'] ?? '')) ?: null,
    trim((string)($in['brandModel'] ?? '')) ?: null,
    trim((string)($in['processor'] ?? '')) ?: null,
    trim((string)($in['deviceId'] ?? '')) ?: null,
    trim((string)($in['operatingSystem'] ?? '')) ?: null,
    $issuedDate,
    $returnDate,
    $renewalDays,
    $purpose ?: null,
    $accessories ?: null,
    $acknowledged,
    $signature,
  ]);
  $assetId = (int)$pdo->lastInsertId();

  $photos = is_array($in['photos'] ?? null) ? $in['photos'] : [];
  foreach ($photos as $photo) {
    if (!is_array($photo)) continue;
    $type = in_array($photo['type'] ?? '', ['imei','device'], true) ? $photo['type'] : 'device';
    $data = (string)($photo['data'] ?? '');
    if ($data === '') continue;
    $pdo->prepare('INSERT INTO asset_photos(asset_id,photo_type,photo_data) VALUES(?,?,?)')->execute([$assetId, $type, $data]);
  }

  ok(['message' => 'Asset registered.', 'id' => $assetId]);
}

function listAssets(PDO $pdo): never {
  $session = requireSession($pdo);
  $actor = one($pdo, 'SELECT * FROM users WHERE id=?', [(int)$session['user_id']]);
  if (!$actor) throw new DomainException('Session user not found.');

  $cols = 'a.id,a.asset_type,a.model_name,a.imei1,a.imei2,a.device_type,a.brand_model,a.processor,a.device_id,a.operating_system,
            a.issued_date,a.return_date,a.renewal_interval_days,a.purpose,a.accessories,a.acknowledged,a.status,a.created_at,
            a.assigned_to_user_id,u.full_name AS assigned_to_name, u.designation AS assigned_to_designation';

  if ($actor['role'] === 'team_member') {
    $stmt = $pdo->prepare("SELECT {$cols} FROM assets a JOIN users u ON u.id=a.assigned_to_user_id WHERE a.assigned_to_user_id=? ORDER BY a.created_at DESC");
    $stmt->execute([(int)$actor['id']]);
  } elseif (in_array($actor['role'], ['admin','hr_manager'], true) && $actor['company_id'] !== null) {
    $stmt = $pdo->prepare("SELECT {$cols} FROM assets a JOIN users u ON u.id=a.assigned_to_user_id WHERE a.company_id=? ORDER BY a.created_at DESC");
    $stmt->execute([(int)$actor['company_id']]);
  } else {
    ok(['assets' => []]);
  }

  $rows = $stmt->fetchAll();
  $assets = array_map(static function (array $a): array {
    return [
      'id' => (int)$a['id'],
      'assetType' => $a['asset_type'],
      'modelName' => $a['model_name'],
      'imei1' => $a['imei1'],
      'imei2' => $a['imei2'],
      'deviceType' => $a['device_type'],
      'brandModel' => $a['brand_model'],
      'processor' => $a['processor'],
      'deviceId' => $a['device_id'],
      'operatingSystem' => $a['operating_system'],
      'issuedDate' => $a['issued_date'],
      'returnDate' => $a['return_date'],
      'renewalIntervalDays' => $a['renewal_interval_days'] !== null ? (int)$a['renewal_interval_days'] : null,
      'purpose' => $a['purpose'],
      'accessories' => $a['accessories'],
      'acknowledged' => (bool)$a['acknowledged'],
      'status' => $a['status'],
      'createdAt' => $a['created_at'],
      'assignedToUserId' => (int)$a['assigned_to_user_id'],
      'assignedToName' => $a['assigned_to_name'],
      'assignedToDesignation' => $a['assigned_to_designation'],
    ];
  }, $rows);
  ok(['assets' => $assets]);
}

function getAssetDetail(PDO $pdo, array $in): never {
  $session = requireSession($pdo);
  $actor = one($pdo, 'SELECT * FROM users WHERE id=?', [(int)$session['user_id']]);
  if (!$actor) throw new DomainException('Session user not found.');
  $assetId = (int)($in['assetId'] ?? 0);
  $a = one($pdo, 'SELECT a.*, u.full_name AS assigned_to_name, u.designation AS assigned_to_designation, u.email AS assigned_to_email
                   FROM assets a JOIN users u ON u.id=a.assigned_to_user_id WHERE a.id=?', [$assetId]);
  if (!$a) throw new DomainException('Asset not found.');
  $allowed = ($actor['role'] === 'team_member' && (int)$a['assigned_to_user_id'] === (int)$actor['id'])
    || (in_array($actor['role'], ['admin','hr_manager'], true) && $actor['company_id'] !== null && (int)$actor['company_id'] === (int)$a['company_id']);
  if (!$allowed) throw new DomainException('You are not allowed to view this asset.');

  $stmt = $pdo->prepare('SELECT id,photo_type,photo_data FROM asset_photos WHERE asset_id=? ORDER BY id ASC');
  $stmt->execute([$assetId]);
  $photos = array_map(static function (array $p): array {
    return ['id' => (int)$p['id'], 'type' => $p['photo_type'], 'data' => $p['photo_data']];
  }, $stmt->fetchAll());

  ok(['asset' => [
    'id' => (int)$a['id'],
    'assetType' => $a['asset_type'],
    'modelName' => $a['model_name'],
    'imei1' => $a['imei1'],
    'imei2' => $a['imei2'],
    'deviceType' => $a['device_type'],
    'brandModel' => $a['brand_model'],
    'processor' => $a['processor'],
    'deviceId' => $a['device_id'],
    'operatingSystem' => $a['operating_system'],
    'issuedDate' => $a['issued_date'],
    'returnDate' => $a['return_date'],
    'renewalIntervalDays' => $a['renewal_interval_days'] !== null ? (int)$a['renewal_interval_days'] : null,
    'purpose' => $a['purpose'],
    'accessories' => $a['accessories'],
    'acknowledged' => (bool)$a['acknowledged'],
    'signatureData' => $a['signature_data'],
    'status' => $a['status'],
    'createdAt' => $a['created_at'],
    'assignedToUserId' => (int)$a['assigned_to_user_id'],
    'assignedToName' => $a['assigned_to_name'],
    'assignedToDesignation' => $a['assigned_to_designation'],
    'assignedToEmail' => $a['assigned_to_email'],
    'photos' => $photos,
  ]]);
}

function updateAsset(PDO $pdo, array $in): never {
  $session = requireSession($pdo);
  $actor = one($pdo, 'SELECT * FROM users WHERE id=?', [(int)$session['user_id']]);
  if (!$actor || !in_array($actor['role'], ['admin','hr_manager'], true) || $actor['company_id'] === null) {
    throw new DomainException('Only Admin or HR can edit an asset record.');
  }

  $assetId = (int)($in['assetId'] ?? 0);
  $asset = one($pdo, 'SELECT * FROM assets WHERE id=?', [$assetId]);
  if (!$asset || (int)$asset['company_id'] !== (int)$actor['company_id']) throw new DomainException('Asset not found.');

  $issuedDate = trim((string)($in['issuedDate'] ?? ''));
  if ($issuedDate === '') throw new DomainException('Issued date is required.');
  $returnDate = trim((string)($in['returnDate'] ?? '')) ?: null;
  $renewalDays = isset($in['renewalIntervalDays']) && $in['renewalIntervalDays'] !== '' ? (int)$in['renewalIntervalDays'] : null;
  if ($renewalDays !== null && $renewalDays < 1) throw new DomainException('Renewal days must be at least 1.');
  $status = (string)($in['status'] ?? 'active');
  if (!in_array($status, ['active','returned','lost','damaged'], true)) throw new DomainException('Invalid asset status.');
  if ($status === 'returned' && $returnDate === null) $returnDate = date('Y-m-d');

  $stmt = $pdo->prepare(
    'UPDATE assets SET model_name=?,imei1=?,imei2=?,device_type=?,brand_model=?,processor=?,device_id=?,operating_system=?,issued_date=?,return_date=?,renewal_interval_days=?,purpose=?,accessories=?,status=? WHERE id=?'
  );
  $stmt->execute([
    trim((string)($in['modelName'] ?? '')) ?: null,
    trim((string)($in['imei1'] ?? '')) ?: null,
    trim((string)($in['imei2'] ?? '')) ?: null,
    trim((string)($in['deviceType'] ?? '')) ?: null,
    trim((string)($in['brandModel'] ?? '')) ?: null,
    trim((string)($in['processor'] ?? '')) ?: null,
    trim((string)($in['deviceId'] ?? '')) ?: null,
    trim((string)($in['operatingSystem'] ?? '')) ?: null,
    $issuedDate,
    $returnDate,
    $renewalDays,
    trim((string)($in['purpose'] ?? '')) ?: null,
    trim((string)($in['accessories'] ?? '')) ?: null,
    $status,
    $assetId,
  ]);

  ok(['message' => 'Asset details updated.']);
}

function updateAssetStatus(PDO $pdo, array $in): never {
  $session = requireSession($pdo);
  $actor = one($pdo, 'SELECT * FROM users WHERE id=?', [(int)$session['user_id']]);
  if (!$actor || !in_array($actor['role'], ['admin','hr_manager'], true) || $actor['company_id'] === null) {
    throw new DomainException('You are not allowed to update assets.');
  }
  $assetId = (int)($in['assetId'] ?? 0);
  $status = (string)($in['status'] ?? '');
  if (!in_array($status, ['active','returned','lost','damaged'], true)) throw new DomainException('Invalid status.');
  $asset = one($pdo, 'SELECT * FROM assets WHERE id=?', [$assetId]);
  if (!$asset || (int)$asset['company_id'] !== (int)$actor['company_id']) throw new DomainException('Asset not found.');
  if ($status === 'returned' && $asset['return_date'] === null) {
    $pdo->prepare('UPDATE assets SET status=?, return_date=CURDATE() WHERE id=?')->execute([$status, $assetId]);
  } else {
    $pdo->prepare('UPDATE assets SET status=? WHERE id=?')->execute([$status, $assetId]);
  }
  ok(['message' => 'Asset status updated.']);
}

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| Phase 3: Employee profiles, documents, contracts and audit logs
|--------------------------------------------------------------------------
*/

function phase3Actor(PDO $pdo): array {
  $session = requireSession($pdo);
  $actor = one($pdo, 'SELECT * FROM users WHERE id=?', [(int)$session['user_id']]);
  if (!$actor) throw new DomainException('Authenticated user was not found.');
  return $actor;
}

function canManageEmployee(array $actor, array $target): bool {
  if ($actor['role'] === 'superadmin') return true;
  if ((int)$actor['id'] === (int)$target['id']) return true;
  return in_array($actor['role'], ['admin','hr_manager'], true)
    && $actor['company_id'] !== null
    && (int)$actor['company_id'] === (int)$target['company_id'];
}

function nullableDataImage(mixed $value, int $maxBytes): ?string {
  $data=trim((string)$value); if($data==='') return null;
  if(!preg_match('#^data:image/(jpeg|png|webp);base64,#',$data)) throw new DomainException('Invalid profile photo format.');
  $decoded=base64_decode(substr($data,strpos($data,',')+1),true);
  if($decoded===false || strlen($decoded)>$maxBytes) throw new DomainException('Profile photo is too large.');
  return $data;
}
function nullableText(mixed $value, int $max = 1000): ?string {
  $text = trim((string)($value ?? ''));
  if ($text === '') return null;
  if (mb_strlen($text) > $max) throw new DomainException('One of the entered values is too long.');
  return $text;
}

function nullableDate(mixed $value): ?string {
  $date = trim((string)($value ?? ''));
  if ($date === '') return null;
  $parsed = DateTime::createFromFormat('Y-m-d', $date);
  if (!$parsed || $parsed->format('Y-m-d') !== $date) throw new DomainException('One of the dates is invalid.');
  return $date;
}

function profileCompletion(array $values): int {
  $important = [
    'employee_name','employee_code','job_title','joining_date','department','gender','marital_status',
    'highest_qualification','phone_number','email_address','permanent_address','temporary_address',
    'father_name','mother_name','citizenship_number','pan_number','bank_account_number','bank_name_branch',
    'emergency_contact_name','emergency_relationship','emergency_phone','emergency_address'
  ];
  $filled = 0;
  foreach ($important as $key) if (isset($values[$key]) && trim((string)$values[$key]) !== '') $filled++;
  return (int)round(($filled / count($important)) * 100);
}

function auditEvent(PDO $pdo, array $actor, string $action, string $details, ?string $entityType = null, ?int $entityId = null): void {
  $stmt = $pdo->prepare('INSERT INTO audit_logs(company_id,user_id,action,entity_type,entity_id,details,ip_address) VALUES(?,?,?,?,?,?,?)');
  $stmt->execute([
    $actor['company_id'] !== null ? (int)$actor['company_id'] : null,
    (int)$actor['id'],
    mb_substr($action, 0, 160),
    $entityType,
    $entityId,
    mb_substr($details, 0, 1500),
    $_SERVER['REMOTE_ADDR'] ?? null,
  ]);
}

function employeeProfilePayload(array $row, array $documents = []): array {
  return [
    'userId' => (int)$row['user_id'],
    'employeeCode' => $row['employee_code'] ?? null,
    'employeeName' => $row['employee_name'],
    'emailAddress' => $row['email_address'],
    'role' => $row['role'],
    'department' => $row['department'] ?? null,
    'jobTitle' => $row['job_title'] ?? null,
    'joiningDate' => $row['joining_date'] ?? null,
    'gender' => $row['gender'] ?? null,
    'maritalStatus' => $row['marital_status'] ?? null,
    'highestQualification' => $row['highest_qualification'] ?? null,
    'phoneNumber' => $row['phone_number'] ?? null,
    'permanentAddress' => $row['permanent_address'] ?? null,
    'temporaryAddress' => $row['temporary_address'] ?? null,
    'fatherName' => $row['father_name'] ?? null,
    'motherName' => $row['mother_name'] ?? null,
    'citizenshipNumber' => $row['citizenship_number'] ?? null,
    'panNumber' => $row['pan_number'] ?? null,
    'nidNumber' => $row['nid_number'] ?? null,
    'bankAccountNumber' => $row['bank_account_number'] ?? null,
    'bankAccountName' => $row['bank_account_name'] ?? null,
    'bankNameBranch' => $row['bank_name_branch'] ?? null,
    'bankBranch' => $row['bank_branch'] ?? null,
    'contractDate' => $row['contract_date'] ?? null,
    'contractExpireDate' => $row['contract_expire_date'] ?? null,
    'emergencyContactName' => $row['emergency_contact_name'] ?? null,
    'emergencyRelationship' => $row['emergency_relationship'] ?? null,
    'emergencyPhone' => $row['emergency_phone'] ?? null,
    'emergencyAddress' => $row['emergency_address'] ?? null,
    'dateOfBirth' => $row['date_of_birth'] ?? null,
    'profileCompletion' => (int)($row['profile_completion'] ?? 0),
    'documentCount' => (int)($row['document_count'] ?? count($documents)),
    'documents' => $documents,
    'updatedAt' => $row['updated_at'] ?? null,
    'profilePhoto' => $row['profile_photo'] ?? null,
  ];
}

function employeeProfileQuery(): string {
  return 'SELECT u.id AS user_id,u.employee_code,u.full_name AS employee_name,u.email AS email_address,u.role,u.department,
    COALESCE(p.job_title,u.designation) AS job_title,p.joining_date,p.gender,p.marital_status,p.highest_qualification,
    p.phone_number,p.permanent_address,p.temporary_address,p.father_name,p.mother_name,p.citizenship_number,p.pan_number,p.nid_number,p.bank_account_name,p.bank_branch,
    p.bank_account_number,p.bank_name_branch,p.contract_date,p.contract_expire_date,p.emergency_contact_name,
    p.emergency_relationship,p.emergency_phone,p.emergency_address,p.date_of_birth,p.profile_photo,COALESCE(p.profile_completion,0) AS profile_completion,
    p.updated_at,(SELECT COUNT(*) FROM employee_documents d WHERE d.user_id=u.id) AS document_count
    FROM users u LEFT JOIN employee_profiles p ON p.user_id=u.id';
}

function listEmployeeProfiles(PDO $pdo): never {
  $actor = phase3Actor($pdo);
  $sql = employeeProfileQuery();
  $params = [];
  if ($actor['role'] === 'superadmin') {
    $sql .= ' WHERE u.role<>"superadmin"';
  } elseif (in_array($actor['role'], ['admin','hr_manager'], true)) {
    if ($actor['company_id'] === null) throw new DomainException('Company assignment is required.');
    $sql .= ' WHERE u.company_id=? AND u.role<>"superadmin"';
    $params[] = (int)$actor['company_id'];
  } else {
    $sql .= ' WHERE u.id=?';
    $params[] = (int)$actor['id'];
  }
  $sql .= ' ORDER BY u.full_name ASC';
  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
  ok(['profiles' => array_map(static fn(array $row): array => employeeProfilePayload($row), $stmt->fetchAll())]);
}

function getEmployeeProfile(PDO $pdo, array $in): never {
  $actor = phase3Actor($pdo);
  $targetId = (int)($in['userId'] ?? $actor['id']);
  $target = one($pdo, 'SELECT * FROM users WHERE id=?', [$targetId]);
  if (!$target || !canManageEmployee($actor, $target)) throw new DomainException('Employee profile not found or access denied.');

  $row = one($pdo, employeeProfileQuery() . ' WHERE u.id=?', [$targetId]);
  if (!$row) throw new DomainException('Employee profile not found.');
  $stmt = $pdo->prepare('SELECT id,document_type,file_name,mime_type,file_size,file_data,created_at FROM employee_documents WHERE user_id=? ORDER BY created_at DESC');
  $stmt->execute([$targetId]);
  $documents = array_map(static fn(array $doc): array => [
    'id' => (int)$doc['id'],
    'documentType' => $doc['document_type'],
    'fileName' => $doc['file_name'],
    'mimeType' => $doc['mime_type'],
    'fileSize' => (int)$doc['file_size'],
    'data' => $doc['file_data'],
    'createdAt' => $doc['created_at'],
  ], $stmt->fetchAll());
  $row['document_count'] = count($documents);
  ok(['profile' => employeeProfilePayload($row, $documents)]);
}

function saveEmployeeProfile(PDO $pdo, array $in): never {
  $actor = phase3Actor($pdo);
  $targetId = (int)($in['userId'] ?? $actor['id']);
  $target = one($pdo, 'SELECT * FROM users WHERE id=?', [$targetId]);
  if (!$target || !canManageEmployee($actor, $target)) throw new DomainException('Employee profile not found or access denied.');
  if ($target['company_id'] === null) throw new DomainException('Employee must belong to a company.');

  $employeeName = nullableText($in['employeeName'] ?? $target['full_name'], 150);
  if ($employeeName === null) throw new DomainException('Employee name is required.');
  $emailAddress = email($in['emailAddress'] ?? $target['email']);
  $duplicate = one($pdo, 'SELECT id FROM users WHERE email=? AND id<>?', [$emailAddress, $targetId]);
  if ($duplicate) throw new DomainException('This email address is already used by another account.');

  $gender = nullableText($in['gender'] ?? null, 30);
  if ($gender !== null && !in_array($gender, ['Male','Female','Other','Prefer not to say'], true)) throw new DomainException('Invalid gender option.');
  $marital = nullableText($in['maritalStatus'] ?? null, 30);
  if ($marital !== null && !in_array($marital, ['Single','Married','Divorced','Widowed','Prefer not to say'], true)) throw new DomainException('Invalid marital status option.');

  $values = [
    'employee_name' => $employeeName,
    'employee_code' => nullableText($in['employeeCode'] ?? $target['employee_code'], 80),
    'job_title' => nullableText($in['jobTitle'] ?? $target['designation'], 150),
    'joining_date' => nullableDate($in['joiningDate'] ?? null),
    'department' => nullableText($in['department'] ?? $target['department'], 120),
    'gender' => $gender,
    'marital_status' => $marital,
    'highest_qualification' => nullableText($in['highestQualification'] ?? null, 200),
    'phone_number' => nullableText($in['phoneNumber'] ?? null, 50),
    'email_address' => $emailAddress,
    'permanent_address' => nullableText($in['permanentAddress'] ?? null, 2000),
    'temporary_address' => nullableText($in['temporaryAddress'] ?? null, 2000),
    'father_name' => nullableText($in['fatherName'] ?? null, 180),
    'mother_name' => nullableText($in['motherName'] ?? null, 180),
    'citizenship_number' => nullableText($in['citizenshipNumber'] ?? null, 120),
    'pan_number' => nullableText($in['panNumber'] ?? null, 120),
    'bank_account_number' => nullableText($in['bankAccountNumber'] ?? null, 120),
    'bank_name_branch' => nullableText($in['bankNameBranch'] ?? null, 240),
    'contract_date' => nullableDate($in['contractDate'] ?? null),
    'contract_expire_date' => nullableDate($in['contractExpireDate'] ?? null),
    'emergency_contact_name' => nullableText($in['emergencyContactName'] ?? null, 180),
    'emergency_relationship' => nullableText($in['emergencyRelationship'] ?? null, 100),
    'emergency_phone' => nullableText($in['emergencyPhone'] ?? null, 50),
    'emergency_address' => nullableText($in['emergencyAddress'] ?? null, 2000),
    'date_of_birth' => nullableDate($in['dateOfBirth'] ?? null),
    'nid_number' => trim((string)($in['nidNumber'] ?? '')) ?: null,
    'bank_account_name' => trim((string)($in['bankAccountName'] ?? '')) ?: null,
    'bank_branch' => trim((string)($in['bankBranch'] ?? '')) ?: null,
    'profile_photo' => nullableDataImage($in['profilePhoto'] ?? null, 2 * 1024 * 1024),
  ];
  if ($values['contract_date'] && $values['contract_expire_date'] && $values['contract_expire_date'] < $values['contract_date']) {
    throw new DomainException('Contract expiry date cannot be before the contract date.');
  }
  $completion = profileCompletion($values);

  $pdo->beginTransaction();
  try {
    $pdo->prepare('UPDATE users SET email=?,full_name=?,employee_code=?,designation=?,department=? WHERE id=?')->execute([
      $emailAddress,$employeeName,$values['employee_code'],$values['job_title'],$values['department'],$targetId
    ]);
    $stmt = $pdo->prepare('INSERT INTO employee_profiles(
      company_id,user_id,job_title,joining_date,gender,marital_status,highest_qualification,phone_number,
      permanent_address,temporary_address,father_name,mother_name,citizenship_number,pan_number,
      bank_account_number,bank_name_branch,contract_date,contract_expire_date,emergency_contact_name,
      emergency_relationship,emergency_phone,emergency_address,date_of_birth,nid_number,bank_account_name,bank_branch,profile_photo,profile_completion,updated_by_user_id
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE job_title=VALUES(job_title),joining_date=VALUES(joining_date),gender=VALUES(gender),
      marital_status=VALUES(marital_status),highest_qualification=VALUES(highest_qualification),phone_number=VALUES(phone_number),
      permanent_address=VALUES(permanent_address),temporary_address=VALUES(temporary_address),father_name=VALUES(father_name),
      mother_name=VALUES(mother_name),citizenship_number=VALUES(citizenship_number),pan_number=VALUES(pan_number),
      bank_account_number=VALUES(bank_account_number),bank_name_branch=VALUES(bank_name_branch),contract_date=VALUES(contract_date),
      contract_expire_date=VALUES(contract_expire_date),emergency_contact_name=VALUES(emergency_contact_name),
      emergency_relationship=VALUES(emergency_relationship),emergency_phone=VALUES(emergency_phone),emergency_address=VALUES(emergency_address),
      date_of_birth=VALUES(date_of_birth),nid_number=VALUES(nid_number),bank_account_name=VALUES(bank_account_name),bank_branch=VALUES(bank_branch),profile_photo=VALUES(profile_photo),profile_completion=VALUES(profile_completion),updated_by_user_id=VALUES(updated_by_user_id)');
    $stmt->execute([
      (int)$target['company_id'],$targetId,$values['job_title'],$values['joining_date'],$values['gender'],$values['marital_status'],
      $values['highest_qualification'],$values['phone_number'],$values['permanent_address'],$values['temporary_address'],
      $values['father_name'],$values['mother_name'],$values['citizenship_number'],$values['pan_number'],$values['bank_account_number'],
      $values['bank_name_branch'],$values['contract_date'],$values['contract_expire_date'],$values['emergency_contact_name'],
      $values['emergency_relationship'],$values['emergency_phone'],$values['emergency_address'],$values['date_of_birth'],$values['nid_number'],$values['bank_account_name'],$values['bank_branch'],$values['profile_photo'],$completion,(int)$actor['id']
    ]);

    $documents = $in['documents'] ?? [];
    if (!is_array($documents)) $documents = [];
    if (count($documents) > 8) throw new DomainException('Upload a maximum of 8 documents at a time.');
    $totalDocumentBytes = 0;
    foreach ($documents as $document) {
      if (!is_array($document)) continue;
      $type = (string)($document['documentType'] ?? 'other');
      if (!in_array($type, ['employee_photo','citizenship','pan','qualification','contract','other'], true)) throw new DomainException('Invalid document type.');
      $fileName = nullableText($document['fileName'] ?? '', 255);
      $mimeType = nullableText($document['mimeType'] ?? '', 100);
      $fileSize = (int)($document['fileSize'] ?? 0);
      $data = (string)($document['data'] ?? '');
      if (!$fileName || !$mimeType || $fileSize <= 0 || $data === '') throw new DomainException('Uploaded document information is incomplete.');
      if ($fileSize > 5 * 1024 * 1024) throw new DomainException('Each employee document must be 5 MB or smaller.');
      if (!in_array($mimeType, ['image/jpeg','image/png','image/webp','application/pdf'], true)) throw new DomainException('Only JPG, PNG, WEBP and PDF documents are supported.');
      if (!str_starts_with($data, 'data:' . $mimeType . ';base64,')) throw new DomainException('Uploaded document format is invalid.');
      $base64 = substr($data, strpos($data, ',') + 1);
      $decoded = base64_decode($base64, true);
      if ($decoded === false || strlen($decoded) > 5 * 1024 * 1024) throw new DomainException('Uploaded document data is invalid or too large.');
      $totalDocumentBytes += strlen($decoded);
      if ($totalDocumentBytes > 20 * 1024 * 1024) throw new DomainException('The combined document upload must be 20 MB or smaller.');
      if ($type !== 'other') $pdo->prepare('DELETE FROM employee_documents WHERE user_id=? AND document_type=?')->execute([$targetId,$type]);
      $pdo->prepare('INSERT INTO employee_documents(company_id,user_id,document_type,file_name,mime_type,file_size,file_data,uploaded_by_user_id) VALUES(?,?,?,?,?,?,?,?)')->execute([
        (int)$target['company_id'],$targetId,$type,$fileName,$mimeType,strlen($decoded),$data,(int)$actor['id']
      ]);
    }
    auditEvent($pdo, $actor, 'Employee profile saved', $actor['full_name'] . ' updated the employee profile for ' . $employeeName . '.', 'employee_profile', $targetId);
    $pdo->commit();
  } catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    throw $e;
  }

  $row = one($pdo, employeeProfileQuery() . ' WHERE u.id=?', [$targetId]);
  ok(['message' => 'Employee profile saved successfully.', 'profile' => employeeProfilePayload($row ?: [])]);
}

function deleteEmployeeDocument(PDO $pdo, array $in): never {
  $actor = phase3Actor($pdo);
  $documentId = (int)($in['documentId'] ?? 0);
  $document = one($pdo, 'SELECT d.*,u.full_name,u.company_id AS user_company_id FROM employee_documents d JOIN users u ON u.id=d.user_id WHERE d.id=?', [$documentId]);
  if (!$document) throw new DomainException('Document not found.');
  $target = one($pdo, 'SELECT * FROM users WHERE id=?', [(int)$document['user_id']]);
  if (!$target || !canManageEmployee($actor, $target)) throw new DomainException('You are not allowed to delete this document.');
  $pdo->prepare('DELETE FROM employee_documents WHERE id=?')->execute([$documentId]);
  auditEvent($pdo, $actor, 'Employee document deleted', $actor['full_name'] . ' deleted ' . $document['file_name'] . ' from ' . $document['full_name'] . '.', 'employee_document', $documentId);
  ok(['message' => 'Document deleted.']);
}

function contractCalculatedPayload(array $row): array {
  $today = new DateTime('today');
  $join = $row['office_join_date'] ? new DateTime($row['office_join_date']) : null;
  $start = new DateTime($row['contract_date']);
  $end = new DateTime($row['contract_expire_date']);
  $days = (int)$today->diff($end)->format('%r%a');
  $total = max(1, (int)$start->diff($end)->format('%a'));
  $used = max(0, min($total, (int)$start->diff($today)->format('%r%a')));
  $progress = (int)round(($used / $total) * 100);
  $status = $row['status'];
  if ($status !== 'Terminated') {
    if ($days < 0) $status = 'Expired';
    elseif ($days <= 30) $status = 'Pending Renewal';
    else $status = 'Active';
  }
  $duration = 'Not available';
  if ($join) {
    $diff = $join->diff($today);
    $parts = [];
    if ($diff->y) $parts[] = $diff->y . 'y';
    if ($diff->m) $parts[] = $diff->m . 'm';
    $parts[] = $diff->d . 'd';
    $duration = implode(' ', $parts);
  }
  return [
    'id' => (int)$row['id'],
    'employeeId' => (int)$row['user_id'],
    'employeeName' => $row['employee_name'],
    'employeeCode' => $row['employee_code'] ?? null,
    'designation' => $row['designation'] ?? null,
    'department' => $row['department'] ?? null,
    'officeJoinDate' => $row['office_join_date'] ?? null,
    'contractDate' => $row['contract_date'],
    'contractExpireDate' => $row['contract_expire_date'],
    'contractType' => $row['contract_type'],
    'status' => $status,
    'remark' => $row['remark'] ?? null,
    'createdAt' => $row['created_at'],
    'updatedAt' => $row['updated_at'],
    'daysForNewContract' => $days,
    'workingDuration' => $duration,
    'progressPercent' => $progress,
  ];
}

function listContracts(PDO $pdo): never {
  $actor = phase3Actor($pdo);
  $sql = 'SELECT c.*,u.full_name AS employee_name,u.employee_code,u.designation,u.department FROM employment_contracts c JOIN users u ON u.id=c.user_id';
  $params = [];
  if ($actor['role'] === 'superadmin') {
    $sql .= ' ORDER BY c.contract_expire_date ASC';
  } elseif (in_array($actor['role'], ['admin','hr_manager'], true)) {
    if ($actor['company_id'] === null) throw new DomainException('Company assignment is required.');
    $sql .= ' WHERE c.company_id=? ORDER BY c.contract_expire_date ASC';
    $params[] = (int)$actor['company_id'];
  } else {
    $sql .= ' WHERE c.user_id=? ORDER BY c.contract_expire_date DESC';
    $params[] = (int)$actor['id'];
  }
  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
  ok(['contracts' => array_map(static fn(array $row): array => contractCalculatedPayload($row), $stmt->fetchAll())]);
}

function saveContract(PDO $pdo, array $in): never {
  $actor = phase3Actor($pdo);
  if (!in_array($actor['role'], ['admin','hr_manager'], true)) throw new DomainException('Only Admin or HR can save contracts.');
  if ($actor['company_id'] === null) throw new DomainException('Company assignment is required.');
  $contractId = (int)($in['contractId'] ?? 0);
  $isUpdate = $contractId > 0;
  $userId = (int)($in['userId'] ?? 0);
  $target = one($pdo, 'SELECT * FROM users WHERE id=? AND company_id=? AND role<>"superadmin"', [$userId,(int)$actor['company_id']]);
  if (!$target) throw new DomainException('Selected employee was not found in your company.');
  $officeJoinDate = nullableDate($in['officeJoinDate'] ?? null);
  $contractDate = nullableDate($in['contractDate'] ?? null);
  $contractExpireDate = nullableDate($in['contractExpireDate'] ?? null);
  if (!$contractDate || !$contractExpireDate) throw new DomainException('Contract date and expiry date are required.');
  if ($contractExpireDate < $contractDate) throw new DomainException('Contract expiry date cannot be before the contract date.');
  $contractType = (string)($in['contractType'] ?? 'Full-Time');
  if (!in_array($contractType, ['Full-Time','Part-Time','Probation','Consultant','Fixed-Term','Internship'], true)) throw new DomainException('Invalid contract type.');
  $status = (string)($in['status'] ?? 'Active');
  if (!in_array($status, ['Active','Pending Renewal','Expired','Terminated'], true)) $status = 'Active';
  $remark = nullableText($in['remark'] ?? null, 1000);

  $pdo->beginTransaction();
  try {
    if ($contractId > 0) {
      $existing = one($pdo, 'SELECT id FROM employment_contracts WHERE id=? AND company_id=?', [$contractId,(int)$actor['company_id']]);
      if (!$existing) throw new DomainException('Contract not found.');
      $pdo->prepare('UPDATE employment_contracts SET user_id=?,office_join_date=?,contract_date=?,contract_expire_date=?,contract_type=?,status=?,remark=?,updated_by_user_id=? WHERE id=?')->execute([
        $userId,$officeJoinDate,$contractDate,$contractExpireDate,$contractType,$status,$remark,(int)$actor['id'],$contractId
      ]);
    } else {
      $pdo->prepare('INSERT INTO employment_contracts(company_id,user_id,office_join_date,contract_date,contract_expire_date,contract_type,status,remark,created_by_user_id,updated_by_user_id) VALUES(?,?,?,?,?,?,?,?,?,?)')->execute([
        (int)$actor['company_id'],$userId,$officeJoinDate,$contractDate,$contractExpireDate,$contractType,$status,$remark,(int)$actor['id'],(int)$actor['id']
      ]);
      $contractId = (int)$pdo->lastInsertId();
    }
    $existingProfile = one($pdo, 'SELECT id FROM employee_profiles WHERE user_id=?', [$userId]);
    if ($existingProfile) {
      $pdo->prepare('UPDATE employee_profiles SET joining_date=COALESCE(?,joining_date),contract_date=?,contract_expire_date=?,updated_by_user_id=? WHERE user_id=?')->execute([$officeJoinDate,$contractDate,$contractExpireDate,(int)$actor['id'],$userId]);
    } else {
      $pdo->prepare('INSERT INTO employee_profiles(company_id,user_id,joining_date,contract_date,contract_expire_date,profile_completion,updated_by_user_id) VALUES(?,?,?,?,?,?,?)')->execute([(int)$actor['company_id'],$userId,$officeJoinDate,$contractDate,$contractExpireDate,0,(int)$actor['id']]);
    }
    auditEvent($pdo, $actor, $isUpdate ? 'Employment contract updated' : 'Employment contract created', $actor['full_name'] . ' saved a contract for ' . $target['full_name'] . '.', 'employment_contract', $contractId);
    createNotification($pdo, (int)$actor['company_id'], $userId, 'Contract updated', 'Your employment contract information was updated by ' . $actor['full_name'] . '.', 'system', 'system', $contractId);
    $pdo->commit();
  } catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    throw $e;
  }
  ok(['message' => 'Contract saved successfully.', 'id' => $contractId]);
}

function listAuditLogs(PDO $pdo, array $in): never {
  $actor = phase3Actor($pdo);
  if (!in_array($actor['role'], ['superadmin','admin','hr_manager'], true)) throw new DomainException('You are not allowed to view audit logs.');
  $limit = max(1, min(250, (int)($in['limit'] ?? 100)));
  $sql = 'SELECT a.*,u.full_name AS done_by_name,u.role FROM audit_logs a JOIN users u ON u.id=a.user_id';
  $params = [];
  if ($actor['role'] !== 'superadmin') {
    if ($actor['company_id'] === null) throw new DomainException('Company assignment is required.');
    $sql .= ' WHERE a.company_id=?';
    $params[] = (int)$actor['company_id'];
  }
  $sql .= ' ORDER BY a.created_at DESC LIMIT ' . $limit;
  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
  $logs = array_map(static fn(array $row): array => [
    'id' => (int)$row['id'],
    'action' => $row['action'],
    'doneBy' => (int)$row['user_id'],
    'doneByName' => $row['done_by_name'],
    'role' => $row['role'],
    'entityType' => $row['entity_type'] ?? null,
    'entityId' => $row['entity_id'] !== null ? (int)$row['entity_id'] : null,
    'details' => $row['details'],
    'timestamp' => $row['created_at'],
  ], $stmt->fetchAll());
  ok(['auditLogs' => $logs]);
}

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

function phase5Manager(PDO $pdo): array { return requireCompanyManager($pdo); }
function getCompanyLetterhead(PDO $pdo): never { $u=phase5Manager($pdo); $r=one($pdo,'SELECT l.*, u.full_name uploaded_by_name FROM company_letterheads l LEFT JOIN users u ON u.id=l.uploaded_by WHERE l.company_id=?',[$u['company_id']]); ok(['letterhead'=>$r?['id'=>(int)$r['id'],'fileName'=>$r['file_name'],'mimeType'=>$r['mime_type'],'dataUrl'=>$r['data_url'],'uploadedAt'=>$r['uploaded_at'],'uploadedByName'=>$r['uploaded_by_name']]:null]); }
function saveCompanyLetterhead(PDO $pdo,array $in): never { $u=phase5Manager($pdo); $fn=trim((string)($in['fileName']??''));$mt=(string)($in['mimeType']??'');$du=(string)($in['dataUrl']??''); if($fn===''||!in_array($mt,['image/png','image/jpeg'],true)||!preg_match('#^data:image/(png|jpeg);base64,#',$du)) fail('Valid PNG or JPG letterhead required.'); if(strlen($du)>6000000) fail('Letterhead is too large.'); $sql='INSERT INTO company_letterheads(company_id,file_name,mime_type,data_url,uploaded_by) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE file_name=VALUES(file_name),mime_type=VALUES(mime_type),data_url=VALUES(data_url),uploaded_by=VALUES(uploaded_by),updated_at=NOW()';$pdo->prepare($sql)->execute([$u['company_id'],$fn,$mt,$du,$u['id']]); auditEvent($pdo,$u,'letterhead_updated','Company letterhead uploaded','company_letterhead',(int)$u['company_id']); getCompanyLetterhead($pdo); }
function listGeneratedDocuments(PDO $pdo): never { $u=phase5Manager($pdo); $stmt=$pdo->prepare('SELECT d.*, e.full_name employee_name, g.full_name generated_by_name FROM generated_hr_documents d LEFT JOIN users e ON e.id=d.employee_id LEFT JOIN users g ON g.id=d.generated_by WHERE d.company_id=? ORDER BY d.id DESC LIMIT 200'); $stmt->execute([(int)$u['company_id']]); $rows=$stmt->fetchAll(); $docs=array_map(fn($r)=>['id'=>(int)$r['id'],'employeeId'=>$r['employee_id']!==null?(int)$r['employee_id']:null,'employeeName'=>$r['employee_name'],'templateKey'=>$r['template_key'],'documentName'=>$r['document_name'],'fileName'=>$r['file_name'],'generatedByName'=>$r['generated_by_name'],'generatedAt'=>$r['generated_at']],$rows);ok(['documents'=>$docs]); }
function phase5ReplaceDocx(string $template,array $fields,?array $letterhead): string { if(!class_exists('ZipArchive')) fail('PHP ZipArchive extension is required.',500); $tmp=tempnam(sys_get_temp_dir(),'nxdoc_');copy($template,$tmp);$z=new ZipArchive();if($z->open($tmp)!==true)fail('Unable to open document template.',500);for($i=0;$i<$z->numFiles;$i++){ $name=$z->getNameIndex($i);if(!str_ends_with($name,'.xml'))continue;$xml=$z->getFromIndex($i);foreach($fields as $k=>$v){$xml=str_replace('{{'.$k.'}}',htmlspecialchars((string)$v,ENT_XML1|ENT_QUOTES,'UTF-8'),$xml);} $xml=preg_replace('/<w:highlight w:val="yellow"\/>/','',$xml);$z->addFromString($name,$xml);} if($letterhead){ phase5AddLetterhead($z,$letterhead); }$z->close();return $tmp; }
function phase5AddLetterhead(ZipArchive $z,array $lh): void { $parts=explode(',',(string)$lh['data_url'],2);if(count($parts)!==2)return;$img=base64_decode($parts[1],true);if($img===false)return;$ext=$lh['mime_type']==='image/png'?'png':'jpg';$z->addFromString('word/media/company_letterhead.'.$ext,$img);$header='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="6858000" cy="9700000"/><wp:docPr id="700" name="Company Letterhead"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="letterhead"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="6858000" cy="9700000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p></w:hdr>';$z->addFromString('word/header99.xml',$header);$z->addFromString('word/_rels/header99.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/company_letterhead.'.$ext.'"/></Relationships>');$rels=$z->getFromName('word/_rels/document.xml.rels');$rels=str_replace('</Relationships>','<Relationship Id="rIdLetterhead99" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header99.xml"/></Relationships>',$rels);$z->addFromString('word/_rels/document.xml.rels',$rels);$doc=$z->getFromName('word/document.xml');$doc=preg_replace('/<w:sectPr([^>]*)>/','<w:sectPr$1><w:headerReference w:type="default" r:id="rIdLetterhead99"/>',$doc,1);$z->addFromString('word/document.xml',$doc);$ct=$z->getFromName('[Content_Types].xml');$ct=str_replace('</Types>','<Override PartName="/word/header99.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/></Types>',$ct);$z->addFromString('[Content_Types].xml',$ct); }
function generateHrDocument(PDO $pdo,array $in): never { $u=phase5Manager($pdo);$key=(string)($in['templateKey']??'');$allowed=['employee_contract'=>['Employee Contract',false],'device_home_taking'=>['Device Home-Taking Form',true]];if(!isset($allowed[$key]))fail('Unsupported template.');$fields=is_array($in['fields']??null)?$in['fields']:[];if($key==='employee_contract'){ $fields['salary_amount']=trim((string)($fields['salary_amount']??$fields['total_salary']??'')); $fields['salary_words']=trim((string)($fields['salary_words']??'')); $fields['permanent_address']=trim((string)($fields['permanent_address']??'')); $fields['citizenship_details']=trim((string)($fields['citizenship_details']??'')); }$employeeId=isset($in['employeeId'])?(int)$in['employeeId']:null;if($employeeId){$emp=one($pdo,'SELECT id,full_name FROM users WHERE id=? AND company_id=?',[$employeeId,$u['company_id']]);if(!$emp)fail('Employee not found.');$fields['employee_name']=$fields['employee_name']??$emp['full_name'];}$lh=null;if($allowed[$key][1]){$lh=one($pdo,'SELECT * FROM company_letterheads WHERE company_id=?',[$u['company_id']]);if(!$lh)fail('Upload company letterhead first.');}$template=__DIR__.'/templates/'.$key.'.docx';if(!is_file($template))fail('Template file missing.',500);$tmp=phase5ReplaceDocx($template,$fields,$lh);$safe=preg_replace('/[^A-Za-z0-9_-]+/','_',($fields['employee_name']??'Employee'));$file=$allowed[$key][0].'_'.$safe.'_'.date('Ymd_His').'.docx';$st=$pdo->prepare('INSERT INTO generated_hr_documents(company_id,employee_id,template_key,document_name,file_name,generated_by) VALUES(?,?,?,?,?,?)');$st->execute([$u['company_id'],$employeeId,$key,$allowed[$key][0],$file,$u['id']]);$id=(int)$pdo->lastInsertId();auditEvent($pdo,$u,'document_generated',$allowed[$key][0].' generated','generated_hr_document',$id);$b64=base64_encode(file_get_contents($tmp));@unlink($tmp);ok(['fileName'=>$file,'mimeType'=>'application/vnd.openxmlformats-officedocument.wordprocessingml.document','base64'=>$b64,'documentId'=>$id]); }
function deleteGeneratedDocument(PDO $pdo,array $in): never { $u=phase5Manager($pdo);$id=(int)($in['id']??0);$st=$pdo->prepare('DELETE FROM generated_hr_documents WHERE id=? AND company_id=?');$st->execute([$id,$u['company_id']]);ok(['message'=>'Document record deleted.']); }

function requireSession(PDO $pdo): array { $raw=bearer(); if(!$raw) fail('Authentication required.',401); $s=one($pdo,'SELECT * FROM auth_sessions WHERE token_hash=? AND revoked_at IS NULL AND expires_at>NOW()',[hash('sha256',$raw)]); if(!$s) fail('Session expired.',401); return $s; }
function bearer(): ?string { $h=$_SERVER['HTTP_AUTHORIZATION']??''; return preg_match('/Bearer\s+(\S+)/i',$h,$m)?$m[1]:null; }
function email(mixed $value): string { $v=strtolower(trim((string)$value)); if(!filter_var($v,FILTER_VALIDATE_EMAIL)) throw new DomainException('Enter a valid email address.'); return $v; }
function otp(): string { return str_pad((string)random_int(0,999999),6,'0',STR_PAD_LEFT); }
function one(PDO $pdo,string $sql,array $params=[]): ?array { $s=$pdo->prepare($sql); $s->execute($params); $r=$s->fetch(); return $r?:null; }
function createSession(PDO $pdo, array $config, int $userId): string {
  $raw=bin2hex(random_bytes(32)); $days=(int)$config['security']['session_days'];
  $pdo->prepare('INSERT INTO auth_sessions(user_id,token_hash,expires_at) VALUES(?,?,DATE_ADD(NOW(), INTERVAL ? DAY))')->execute([$userId,hash('sha256',$raw),$days]);
  return $raw;
}
function publicUser(PDO $pdo, array $u): array {
  $companyName = null;
  if ($u['company_id'] !== null) {
    $c = one($pdo, 'SELECT name FROM companies WHERE id=?', [(int)$u['company_id']]);
    $companyName = $c ? $c['name'] : null;
  }
  return [
    'id'=>(int)$u['id'],
    'email'=>$u['email'],
    'fullName'=>$u['full_name'],
    'role'=>$u['role'],
    'employeeCode'=>$u['employee_code'],
    'designation'=>$u['designation'],
    'department'=>$u['department'],
    'companyId'=>$u['company_id'] !== null ? (int)$u['company_id'] : null,
    'companyName'=>$companyName,
    'profileSetupComplete'=>(int)($u['profile_setup_complete'] ?? 1) === 1,
  ];
}
function ok(array $data=[]): never { echo json_encode(['success'=>true]+$data,JSON_UNESCAPED_SLASHES); exit; }
function fail(string $message,int $status=400): never { http_response_code($status); echo json_encode(['success'=>false,'message'=>$message],JSON_UNESCAPED_SLASHES); exit; }

function renderEmailHtml(string $heading, string $bodyHtml): string {
  $logoUrl = 'https://app.nexuxhr.com/nexuxhr-logo.png';
  return '<!DOCTYPE html><html><head><meta charset="utf-8"></head>'
    . '<body style="margin:0;padding:0;background-color:#f8fafc;font-family:Nunito,Arial,sans-serif;">'
    . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:32px 16px;">'
    . '<tr><td align="center">'
    . '<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);max-width:480px;">'
    . '<tr><td style="padding:32px 32px 8px 32px;text-align:center;">'
    . '<img src="' . $logoUrl . '" alt="NexuxHR" width="48" height="48" style="border-radius:12px;" />'
    . '<div style="margin-top:10px;font-size:20px;font-weight:800;color:#0f172a;">Nexux<span style="color:#4f46e5;">HR</span></div>'
    . '</td></tr>'
    . '<tr><td style="padding:8px 32px 24px 32px;">'
    . '<h2 style="font-size:18px;color:#0f172a;margin:16px 0 8px 0;font-weight:800;">' . $heading . '</h2>'
    . $bodyHtml
    . '</td></tr>'
    . '<tr><td style="padding:16px 32px 32px 32px;border-top:1px solid #e2e8f0;text-align:center;">'
    . '<p style="font-size:11px;color:#94a3b8;margin:0;">NexuxHR — Enterprise Workforce Platform</p>'
    . '</td></tr>'
    . '</table></td></tr></table></body></html>';
}

function otpEmailHtml(string $otp, int $minutes, string $intro): string {
  return '<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 4px 0;">' . $intro . '</p>'
    . '<div style="background:#eef2ff;border-radius:12px;padding:18px;text-align:center;margin:18px 0;">'
    . '<span style="font-size:32px;font-weight:800;letter-spacing:10px;color:#4f46e5;">' . $otp . '</span>'
    . '</div>'
    . '<p style="color:#94a3b8;font-size:12px;margin:0;">Expires in ' . $minutes . ' minutes. Do not share this code with anyone.</p>';
}

function linkEmailHtml(string $intro, string $link, string $buttonLabel, string $footNote): string {
  return '<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 16px 0;">' . $intro . '</p>'
    . '<div style="text-align:center;margin:20px 0;">'
    . '<a href="' . $link . '" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#22d3ee);color:#ffffff;text-decoration:none;font-weight:800;font-size:14px;padding:12px 28px;border-radius:10px;">' . $buttonLabel . '</a>'
    . '</div>'
    . '<p style="color:#94a3b8;font-size:12px;margin:0 0 4px 0;">Or copy this link:</p>'
    . '<p style="color:#4f46e5;font-size:12px;word-break:break-all;margin:0 0 16px 0;">' . $link . '</p>'
    . '<p style="color:#94a3b8;font-size:12px;margin:0;">' . $footNote . '</p>';
}

function sendMail(array $config,string $to,string $subject,string $body,bool $isHtml=false): void {
  $s=$config['smtp']; $context=stream_context_create(['ssl'=>['verify_peer'=>false,'verify_peer_name'=>false,'allow_self_signed'=>true]]); $fp=stream_socket_client('ssl://'.$s['host'].':'.$s['port'],$errno,$errstr,20,STREAM_CLIENT_CONNECT,$context);
  if(!$fp) throw new RuntimeException('Could not connect to mail server.');
  stream_set_timeout($fp,20); smtpExpect($fp,[220]); smtpCmd($fp,'EHLO nexuxhr.com',[250]); smtpCmd($fp,'AUTH LOGIN',[334]); smtpCmd($fp,base64_encode($s['username']),[334]); smtpCmd($fp,base64_encode($s['password']),[235]); smtpCmd($fp,'MAIL FROM:<'.$s['from_email'].'>',[250]); smtpCmd($fp,'RCPT TO:<'.$to.'>',[250,251]); smtpCmd($fp,'DATA',[354]);
  $headers=['From: '.$s['from_name'].' <'.$s['from_email'].'>','To: <'.$to.'>','Subject: '.$subject,'MIME-Version: 1.0','Content-Type: '.($isHtml ? 'text/html; charset=UTF-8' : 'text/plain; charset=UTF-8'),'Date: '.date(DATE_RFC2822),'Message-ID: <'.bin2hex(random_bytes(12)).'@nexuxhr.com>'];
  $payload=implode("\r\n",$headers)."\r\n\r\n".str_replace("\n","\r\n",$body); $payload=preg_replace('/^\./m','..',$payload); fwrite($fp,$payload."\r\n.\r\n"); smtpExpect($fp,[250]); smtpCmd($fp,'QUIT',[221]); fclose($fp);
}
function smtpCmd($fp,string $command,array $codes): void { fwrite($fp,$command."\r\n"); smtpExpect($fp,$codes); }
function smtpExpect($fp,array $codes): void { $response=''; do { $line=fgets($fp,515); if($line===false) break; $response.=$line; } while(isset($line[3])&&$line[3]==='-'); $code=(int)substr($response,0,3); if(!in_array($code,$codes,true)) throw new RuntimeException('SMTP error: '.$response); }


/* Phase 6: Attendance Management */
function attendanceOverview(PDO $pdo,array $in): never {
  $actor=requireCompanyUser($pdo); $month=trim((string)($in['month']??date('Y-m')));
  if($actor['role']==='hr_manager' && $month!==date('Y-m')) throw new DomainException('HR can access the current month only.');
  $where='company_id=? AND DATE_FORMAT(attendance_date,"%Y-%m")=?'; $params=[(int)$actor['company_id'],$month];
  if($actor['role']==='team_member'){ $where.=' AND user_id=?'; $params[]=(int)$actor['id']; }
  $st=$pdo->prepare("SELECT status,COUNT(*) total FROM attendance_records WHERE $where GROUP BY status"); $st->execute($params);
  $summary=['present'=>0,'absent'=>0,'late'=>0,'halfDay'=>0,'onLeave'=>0];
  foreach($st->fetchAll() as $r){$k=match($r['status']){'Present'=>'present','Absent'=>'absent','Late'=>'late','Half Day'=>'halfDay','On Leave'=>'onLeave',default=>null};if($k)$summary[$k]=(int)$r['total'];}
  ok(['summary'=>$summary]);
}
function listAttendanceShifts(PDO $pdo): never {$a=requireCompanyUser($pdo);$s=$pdo->prepare('SELECT id,name,start_time,end_time,is_active FROM attendance_shifts WHERE company_id=? ORDER BY start_time');$s->execute([(int)$a['company_id']]);ok(['shifts'=>array_map(fn($r)=>['id'=>(int)$r['id'],'name'=>$r['name'],'startTime'=>$r['start_time'],'endTime'=>$r['end_time'],'isActive'=>(bool)$r['is_active']],$s->fetchAll())]);}
function saveAttendanceShift(PDO $pdo,array $in): never {$a=requireCompanyManager($pdo);$n=trim((string)($in['name']??''));$s=trim((string)($in['startTime']??''));$e=trim((string)($in['endTime']??''));if(!$n||!preg_match('/^\d{2}:\d{2}$/',$s)||!preg_match('/^\d{2}:\d{2}$/',$e))throw new DomainException('Shift name and valid time are required.');$pdo->prepare('INSERT INTO attendance_shifts(company_id,name,start_time,end_time,is_active) VALUES(?,?,?,?,1)')->execute([(int)$a['company_id'],$n,$s,$e]);ok(['message'=>'Shift saved.']);}
function saveAttendancePolicy(PDO $pdo,array $in): never {$a=requireCompanyManager($pdo);$rh=(float)($in['requiredHours']??8);$hh=(float)($in['halfDayHours']??4);$sw=!empty($in['sandwichLeave'])?1:0;$pdo->prepare('INSERT INTO attendance_policies(company_id,required_hours,half_day_hours,sandwich_leave,calendar_type) VALUES(?,?,?,?,"BS") ON DUPLICATE KEY UPDATE required_hours=VALUES(required_hours),half_day_hours=VALUES(half_day_hours),sandwich_leave=VALUES(sandwich_leave),calendar_type="BS"')->execute([(int)$a['company_id'],$rh,$hh,$sw]);ok(['message'=>'Attendance rules saved.']);}
function listAttendanceCorrections(PDO $pdo,array $in): never {$a=requireCompanyUser($pdo);$m=trim((string)($in['month']??date('Y-m')));if($a['role']==='hr_manager'&&$m!==date('Y-m'))throw new DomainException('HR can access the current month only.');$sql='SELECT c.*,u.full_name employee_name FROM attendance_corrections c JOIN users u ON u.id=c.user_id WHERE c.company_id=? AND DATE_FORMAT(c.attendance_date,"%Y-%m")=?';$pa=[(int)$a['company_id'],$m];if($a['role']==='team_member'){$sql.=' AND c.user_id=?';$pa[]=(int)$a['id'];}$sql.=' ORDER BY c.created_at DESC';$st=$pdo->prepare($sql);$st->execute($pa);ok(['corrections'=>array_map(fn($r)=>['id'=>(int)$r['id'],'employeeId'=>(int)$r['user_id'],'employeeName'=>$r['employee_name'],'attendanceDate'=>$r['attendance_date'],'reason'=>$r['reason'],'status'=>$r['status'],'reviewNote'=>$r['review_note']],$st->fetchAll())]);}
function submitAttendanceCorrection(PDO $pdo,array $in): never {$a=requireCompanyUser($pdo);$d=trim((string)($in['date']??''));$r=trim((string)($in['reason']??''));if(!$d||!$r)throw new DomainException('Date and reason are required.');$pdo->prepare('INSERT INTO attendance_corrections(company_id,user_id,attendance_date,reason,status) VALUES(?,?,?,? ,"Pending")')->execute([(int)$a['company_id'],(int)$a['id'],$d,$r]);ok(['message'=>'Correction request submitted.']);}
function reviewAttendanceCorrection(PDO $pdo,array $in): never {$a=requireCompanyManager($pdo);$id=(int)($in['id']??0);$status=(string)($in['status']??'');if(!in_array($status,['Approved','Rejected'],true))throw new DomainException('Invalid review status.');$pdo->prepare('UPDATE attendance_corrections SET status=?,review_note=?,reviewed_by=?,reviewed_at=NOW() WHERE id=? AND company_id=? AND status="Pending"')->execute([$status,trim((string)($in['reviewNote']??''))?:null,(int)$a['id'],$id,(int)$a['company_id']]);ok(['message'=>'Correction reviewed.']);}
function lockAttendanceMonth(PDO $pdo,array $in): never {$a=requireCompanyUser($pdo);if($a['role']!=='admin')throw new DomainException('Only admin can lock attendance.');$m=trim((string)($in['month']??''));if(!preg_match('/^\d{4}-\d{2}$/',$m))throw new DomainException('Invalid month.');$pdo->prepare('INSERT INTO attendance_month_locks(company_id,month_key,locked_by,locked_at) VALUES(?,?,?,NOW()) ON DUPLICATE KEY UPDATE locked_by=VALUES(locked_by),locked_at=NOW()')->execute([(int)$a['company_id'],$m,(int)$a['id']]);ok(['message'=>'Attendance month locked.']);}


/* ===========================================================================
 * Phase 7 — Bikram Sambat ranges, biometric import, HR leave record sheet
 * ===========================================================================
 * A BS month straddles two AD months (Shrawan 2083 = 2026-07-17 .. 2026-08-16),
 * so the BS grid asks for an explicit date range instead of a 'YYYY-MM' key.
 */

function assertIsoDate(string $value, string $label): string {
  if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) throw new DomainException($label.' must be a valid date.');
  return $value;
}

/** HR keeps its existing "recent data only" limit: the range must touch this month. */
function guardRangeForRole(array $actor, string $start, string $end): void {
  if ($actor['role'] !== 'hr_manager') return;
  $monthStart = date('Y-m-01');
  $monthEnd   = date('Y-m-t');
  if ($end < $monthStart || $start > $monthEnd) throw new DomainException('HR can access the current month only.');
}

function listAttendanceRange(PDO $pdo, array $in): never {
  $actor = requireCompanyUser($pdo);
  $start = assertIsoDate(trim((string)($in['startDate'] ?? '')), 'Start date');
  $end   = assertIsoDate(trim((string)($in['endDate'] ?? '')), 'End date');
  if ($start > $end) throw new DomainException('Start date must not be after the end date.');
  guardRangeForRole($actor, $start, $end);

  $sql = 'SELECT ar.*,u.full_name AS employee_name FROM attendance_records ar
          JOIN users u ON u.id=ar.user_id
          WHERE ar.company_id=? AND ar.attendance_date BETWEEN ? AND ?';
  $params = [(int)$actor['company_id'], $start, $end];
  if ($actor['role'] === 'team_member') { $sql .= ' AND ar.user_id=?'; $params[] = (int)$actor['id']; }
  $sql .= ' ORDER BY ar.attendance_date ASC, u.full_name ASC';

  $stmt = $pdo->prepare($sql); $stmt->execute($params);
  ok(['attendance' => array_map('attendancePayload', $stmt->fetchAll())]);
}

function attendanceOverviewRange(PDO $pdo, array $in): never {
  $actor = requireCompanyUser($pdo);
  $start = assertIsoDate(trim((string)($in['startDate'] ?? '')), 'Start date');
  $end   = assertIsoDate(trim((string)($in['endDate'] ?? '')), 'End date');
  if ($start > $end) throw new DomainException('Start date must not be after the end date.');
  guardRangeForRole($actor, $start, $end);

  $where = 'company_id=? AND attendance_date BETWEEN ? AND ?';
  $params = [(int)$actor['company_id'], $start, $end];
  if ($actor['role'] === 'team_member') { $where .= ' AND user_id=?'; $params[] = (int)$actor['id']; }

  $stmt = $pdo->prepare("SELECT status,COUNT(*) total FROM attendance_records WHERE $where GROUP BY status");
  $stmt->execute($params);
  $summary = ['present'=>0,'absent'=>0,'late'=>0,'halfDay'=>0,'onLeave'=>0];
  foreach ($stmt->fetchAll() as $row) {
    $key = match($row['status']) {
      'Present'=>'present','Absent'=>'absent','Late'=>'late','Half Day'=>'halfDay','On Leave'=>'onLeave',default=>null
    };
    if ($key) $summary[$key] = (int)$row['total'];
  }
  ok(['summary' => $summary]);
}

/**
 * Bulk-write rows parsed from a biometric device export.
 * One transaction, so a partial failure never leaves half a month imported.
 */
function importBiometricAttendance(PDO $pdo, array $in): never {
  $actor = requireCompanyManager($pdo);
  $rows = $in['rows'] ?? null;
  if (!is_array($rows) || !count($rows)) throw new DomainException('No attendance rows were supplied.');
  if (count($rows) > 5000) throw new DomainException('Import is limited to 5000 rows at a time.');

  $companyId = (int)$actor['company_id'];

  // Only users of this company may be written to.
  $stmt = $pdo->prepare('SELECT id FROM users WHERE company_id=?');
  $stmt->execute([$companyId]);
  $allowed = array_flip(array_map('intval', array_column($stmt->fetchAll(), 'id')));

  $insert = $pdo->prepare(
    'INSERT INTO attendance_records(company_id,user_id,attendance_date,check_in,check_out,status,work_hours,notes,created_by_user_id,source)
     VALUES(?,?,?,?,?,?,?,?,?,\'biometric\')
     ON DUPLICATE KEY UPDATE check_in=VALUES(check_in),check_out=VALUES(check_out),status=VALUES(status),
       work_hours=VALUES(work_hours),notes=VALUES(notes),created_by_user_id=VALUES(created_by_user_id),source=VALUES(source)'
  );

  $imported = 0; $skipped = 0; $errors = [];
  $pdo->beginTransaction();
  try {
    foreach ($rows as $index => $row) {
      $userId = (int)($row['userId'] ?? 0);
      $date   = trim((string)($row['date'] ?? ''));
      $status = (string)($row['status'] ?? 'Present');

      if ($userId <= 0 || !isset($allowed[$userId])) { $skipped++; continue; }
      if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) { $skipped++; continue; }
      if (!in_array($status, ['Present','Absent','Late','Half Day','On Leave'], true)) { $skipped++; continue; }

      $checkIn  = trim((string)($row['checkIn'] ?? ''))  ?: null;
      $checkOut = trim((string)($row['checkOut'] ?? '')) ?: null;
      $notes    = trim((string)($row['notes'] ?? ''))    ?: null;

      $workHours = null;
      if ($checkIn && $checkOut) {
        $from = strtotime($date.' '.$checkIn);
        $to   = strtotime($date.' '.$checkOut);
        if ($to < $from) $to += 86400;          // punch-out crossed midnight
        if ($to > $from) $workHours = round(($to - $from) / 3600, 2);
      }

      try {
        $insert->execute([$companyId,$userId,$date,$checkIn,$checkOut,$status,$workHours,$notes,(int)$actor['id']]);
        $imported++;
      } catch (Throwable $e) {
        $skipped++;
        if (count($errors) < 10) $errors[] = 'Row '.((int)$index + 1).': '.$e->getMessage();
      }
    }
    $pdo->commit();
  } catch (Throwable $e) {
    $pdo->rollBack();
    throw $e;
  }

  ok([
    'message'  => $imported.' attendance row(s) imported from the biometric device.',
    'imported' => $imported,
    'skipped'  => $skipped,
    'errors'   => $errors,
  ]);
}

/* ------------------------------------------------------------------ */
/* HR leave record sheet                                              */
/* ------------------------------------------------------------------ */

/**
 * Days counted against the employee for one leave entry.
 *
 * NOTE: the correction document lists "full day = 0". That is read as a typo —
 * a full-day leave counting as zero would make the "No of Leave Taken" column
 * always read 0. Change the 'Full Day' weight below if 0 was intended.
 */
function leaveDayWeight(string $type): float {
  return match ($type) {
    'Full Day' => 1.0,
    'Half Day' => 0.5,
    'Hourly'   => 0.25,
    default    => 0.0,
  };
}

/** Full Day spans multiply by the number of calendar days; part-days are single entries. */
function calcLeaveDays(string $type, string $start, string $end): float {
  $weight = leaveDayWeight($type);
  if ($type !== 'Full Day') return $weight;
  $from = new DateTimeImmutable($start);
  $to   = new DateTimeImmutable($end);
  if ($to < $from) return $weight;
  $span = (int)$from->diff($to)->days + 1;
  return round($weight * $span, 2);
}

function leaveRecordPayload(array $r): array {
  return [
    'id'             => (int)$r['id'],
    'employeeId'     => (int)$r['user_id'],
    'employeeName'   => $r['employee_name'] ?? '',
    'employeeCode'   => $r['employee_code'] ?? null,
    'recordDate'     => $r['record_date'],
    'leaveType'      => $r['leave_type'],
    'leaveStart'     => $r['leave_start'],
    'leaveEnd'       => $r['leave_end'],
    'reason'         => $r['reason'],
    'letterReceived' => $r['letter_received'],
    'leaveDays'      => (float)$r['leave_days'],
    'createdAt'      => $r['created_at'],
  ];
}

function listLeaveRecords(PDO $pdo, array $in): never {
  $actor = requireCompanyUser($pdo);
  $start = trim((string)($in['startDate'] ?? ''));
  $end   = trim((string)($in['endDate'] ?? ''));

  $sql = 'SELECT lr.*, u.full_name AS employee_name, u.employee_code
          FROM leave_records lr JOIN users u ON u.id=lr.user_id
          WHERE lr.company_id=?';
  $params = [(int)$actor['company_id']];

  if ($start !== '' && $end !== '') {
    assertIsoDate($start, 'Start date'); assertIsoDate($end, 'End date');
    // Any leave overlapping the window, not just those recorded inside it.
    $sql .= ' AND lr.leave_start <= ? AND lr.leave_end >= ?';
    $params[] = $end; $params[] = $start;
  }

  // Employees only ever see their own leave.
  if ($actor['role'] === 'team_member') { $sql .= ' AND lr.user_id=?'; $params[] = (int)$actor['id']; }

  $sql .= ' ORDER BY lr.leave_start DESC, lr.id DESC';
  $stmt = $pdo->prepare($sql); $stmt->execute($params);
  ok(['records' => array_map('leaveRecordPayload', $stmt->fetchAll())]);
}

function saveLeaveRecord(PDO $pdo, array $in): never {
  $actor = requireCompanyManager($pdo);
  $companyId = (int)$actor['company_id'];

  $id       = (int)($in['id'] ?? 0);
  $userId   = (int)($in['employeeId'] ?? 0);
  $recorded = assertIsoDate(trim((string)($in['recordDate'] ?? '')), 'Date');
  $start    = assertIsoDate(trim((string)($in['leaveStart'] ?? '')), 'Leave start');
  $end      = assertIsoDate(trim((string)($in['leaveEnd'] ?? '')), 'Leave end');
  $type     = (string)($in['leaveType'] ?? 'Full Day');
  $letter   = (string)($in['letterReceived'] ?? 'No');
  $reason   = trim((string)($in['reason'] ?? '')) ?: null;

  if (!in_array($type, ['Full Day','Half Day','Hourly'], true)) throw new DomainException('Invalid leave type.');
  if (!in_array($letter, ['Yes','No'], true)) throw new DomainException('Letter received must be Yes or No.');
  if ($end < $start) throw new DomainException('Leave end cannot be before leave start.');

  $employee = one($pdo, 'SELECT id,full_name FROM users WHERE id=? AND company_id=?', [$userId, $companyId]);
  if (!$employee) throw new DomainException('Employee not found in your company.');

  $days = calcLeaveDays($type, $start, $end);

  if ($id > 0) {
    $pdo->prepare('UPDATE leave_records SET user_id=?,record_date=?,leave_type=?,leave_start=?,leave_end=?,reason=?,letter_received=?,leave_days=?
                   WHERE id=? AND company_id=?')
        ->execute([$userId,$recorded,$type,$start,$end,$reason,$letter,$days,$id,$companyId]);
    ok(['message' => 'Leave record updated.', 'id' => $id, 'leaveDays' => $days]);
  }

  $pdo->prepare('INSERT INTO leave_records(company_id,user_id,record_date,leave_type,leave_start,leave_end,reason,letter_received,leave_days,created_by)
                 VALUES(?,?,?,?,?,?,?,?,?,?)')
      ->execute([$companyId,$userId,$recorded,$type,$start,$end,$reason,$letter,$days,(int)$actor['id']]);
  $newId = (int)$pdo->lastInsertId();

  createNotification($pdo, $companyId, $userId, 'Leave recorded',
    $actor['full_name'].' recorded '.$days.' day(s) of leave for you from '.$start.'.', 'notice', 'notice', null);

  ok(['message' => 'Leave record saved.', 'id' => $newId, 'leaveDays' => $days]);
}

function deleteLeaveRecord(PDO $pdo, array $in): never {
  $actor = requireCompanyManager($pdo);
  $id = (int)($in['id'] ?? 0);
  if ($id <= 0) throw new DomainException('Leave record id is required.');
  $pdo->prepare('DELETE FROM leave_records WHERE id=? AND company_id=?')
      ->execute([$id, (int)$actor['company_id']]);
  ok(['message' => 'Leave record deleted.']);
}


/* ===========================================================================
 * Phase 8 — upcoming birthdays and urgent notice acknowledgement
 * =========================================================================== */

/**
 * Upcoming birthdays for the caller's company.
 *
 * Callable by every role, including team_member, so the payload is deliberately
 * minimal: no birth year, no age, no email, no phone. Only enough to render a
 * "whose birthday is next" card.
 *
 * 29 February resolves to 28 February in non-leap years.
 */
function listUpcomingBirthdays(PDO $pdo, array $in): never {
  $actor = requireCompanyUser($pdo);
  $withinDays = (int)($in['withinDays'] ?? 60);
  if ($withinDays < 1) $withinDays = 60;
  if ($withinDays > 366) $withinDays = 366;

  $stmt = $pdo->prepare(
    'SELECT u.id, u.full_name, u.employee_code, p.date_of_birth, p.profile_photo
     FROM users u JOIN employee_profiles p ON p.user_id = u.id
     WHERE u.company_id = ? AND u.status = "active" AND u.role <> "superadmin"
       AND p.date_of_birth IS NOT NULL'
  );
  $stmt->execute([(int)$actor['company_id']]);

  $today = new DateTimeImmutable('today');
  $birthdays = [];

  foreach ($stmt->fetchAll() as $row) {
    $dob = DateTimeImmutable::createFromFormat('Y-m-d', (string)$row['date_of_birth']);
    if (!$dob) continue;

    $month = (int)$dob->format('n');
    $day   = (int)$dob->format('j');

    // Next occurrence: this year, or next year if it has already passed.
    $next = null;
    for ($yearOffset = 0; $yearOffset <= 1; $yearOffset++) {
      $year = (int)$today->format('Y') + $yearOffset;
      $safeDay = $day;
      // 29 Feb in a non-leap year falls back to 28 Feb.
      if ($month === 2 && $day === 29 && !checkdate(2, 29, $year)) $safeDay = 28;
      $candidate = DateTimeImmutable::createFromFormat('Y-n-j', "$year-$month-$safeDay");
      if (!$candidate) continue;
      $candidate = $candidate->setTime(0, 0, 0);
      if ($candidate >= $today) { $next = $candidate; break; }
    }
    if (!$next) continue;

    $daysUntil = (int)$today->diff($next)->days;
    if ($daysUntil > $withinDays) continue;

    $birthdays[] = [
      'userId'       => (int)$row['id'],
      'name'         => $row['full_name'],
      'employeeCode' => $row['employee_code'],
      'profilePhoto' => $row['profile_photo'],
      'birthMonth'   => $month,
      'birthDay'     => $day,
      'nextDateIso'  => $next->format('Y-m-d'),
      'daysUntil'    => $daysUntil,
    ];
  }

  usort($birthdays, static fn($a, $b) =>
    $a['daysUntil'] <=> $b['daysUntil'] ?: strcmp($a['name'], $b['name']));

  ok(['birthdays' => $birthdays]);
}

/**
 * Urgent notices the caller has not yet acknowledged.
 * The publisher is excluded — they just wrote it, so popping it back at them is noise.
 */
function listPendingUrgentNotices(PDO $pdo): never {
  $actor = requireCompanyUser($pdo);

  $stmt = $pdo->prepare(
    'SELECT n.id, n.title, n.content, n.created_at, u.full_name AS posted_by_name
     FROM notices n
     JOIN users u ON u.id = n.posted_by_user_id
     LEFT JOIN notice_acknowledgements a ON a.notice_id = n.id AND a.user_id = ?
     WHERE n.company_id = ?
       AND n.priority = "Urgent"
       AND n.posted_by_user_id <> ?
       AND a.id IS NULL
       AND n.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
     ORDER BY n.created_at ASC'
  );
  $stmt->execute([(int)$actor['id'], (int)$actor['company_id'], (int)$actor['id']]);

  ok(['notices' => array_map(static fn(array $n): array => [
    'id'           => (int)$n['id'],
    'title'        => $n['title'],
    'content'      => $n['content'],
    'postedByName' => $n['posted_by_name'],
    'createdAt'    => $n['created_at'],
  ], $stmt->fetchAll())]);
}

function acknowledgeNotice(PDO $pdo, array $in): never {
  $actor = requireCompanyUser($pdo);
  $noticeId = (int)($in['noticeId'] ?? 0);
  if ($noticeId <= 0) throw new DomainException('Notice id is required.');

  $notice = one($pdo, 'SELECT id FROM notices WHERE id=? AND company_id=?',
    [$noticeId, (int)$actor['company_id']]);
  if (!$notice) throw new DomainException('Notice not found.');

  // INSERT IGNORE keeps a double-click from erroring on the unique key.
  $pdo->prepare('INSERT IGNORE INTO notice_acknowledgements(notice_id,user_id,acknowledged_at) VALUES(?,?,NOW())')
      ->execute([$noticeId, (int)$actor['id']]);

  ok(['message' => 'Notice acknowledged.']);
}


/* ===========================================================================
 * Phase 9 — Office Expenses
 * ===========================================================================
 * Entered by the operation manager. Admin can also enter and review.
 * The accountant is read-only until that role's scope is confirmed.
 */

const EXPENSE_BILL_TYPES = ['PAN bill','VAT bill','Local bill','No bill cash credit'];
const EXPENSE_PAYMENT_METHODS = ['Fonepay','ConnectIPS','Cash'];
const EXPENSE_PURCHASE_GROUPS = ['Kitchen','Entertainment','Stationaries','Electronic','Operation','Other'];

/** Roles allowed to see expenses at all. */
function requireExpenseReader(PDO $pdo): array {
  $actor = requireCompanyUser($pdo);
  if (!in_array($actor['role'], ['admin','operation_manager','accountant'], true)) {
    throw new DomainException('You are not allowed to view office expenses.');
  }
  return $actor;
}

/** Roles allowed to add, edit or delete. Accountant is deliberately excluded. */
function requireExpenseWriter(PDO $pdo): array {
  $actor = requireCompanyUser($pdo);
  if (!in_array($actor['role'], ['admin','operation_manager'], true)) {
    throw new DomainException('Only the admin or operation manager can record expenses.');
  }
  return $actor;
}

function officeExpensePayload(array $r): array {
  return [
    'id'                 => (int)$r['id'],
    'expenseDate'        => $r['expense_date'],
    'storeName'          => $r['store_name'],
    'billType'           => $r['bill_type'],
    'items'              => $r['items'],
    'amount'             => (float)$r['amount'],
    'qty'                => (float)$r['qty'],
    'netAmount'          => (float)$r['net_amount'],
    'paymentMethod'      => $r['payment_method'],
    'billReceived'       => $r['bill_received'],
    'purchaseGroup'      => $r['purchase_group'],
    'purchaseGroupOther' => $r['purchase_group_other'],
    'photoCount'         => (int)($r['photo_count'] ?? 0),
    'createdByName'      => $r['created_by_name'] ?? null,
    'createdAt'          => $r['created_at'] ?? null,
  ];
}

/**
 * Expenses in an ISO date range. The frontend passes the AD range covering a
 * Bikram Sambat month, so BS grouping needs no server-side calendar logic.
 * Photo blobs are never returned here — only a count.
 */
function listOfficeExpenses(PDO $pdo, array $in): never {
  $actor = requireExpenseReader($pdo);
  $start = trim((string)($in['startDate'] ?? ''));
  $end   = trim((string)($in['endDate'] ?? ''));

  $sql = 'SELECT e.*, u.full_name AS created_by_name,
            (SELECT COUNT(*) FROM office_expense_photos p WHERE p.expense_id = e.id) AS photo_count
          FROM office_expenses e
          LEFT JOIN users u ON u.id = e.created_by
          WHERE e.company_id = ?';
  $params = [(int)$actor['company_id']];

  if ($start !== '' && $end !== '') {
    assertIsoDate($start, 'Start date');
    assertIsoDate($end, 'End date');
    $sql .= ' AND e.expense_date BETWEEN ? AND ?';
    $params[] = $start; $params[] = $end;
  }

  $sql .= ' ORDER BY e.expense_date DESC, e.id DESC';
  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);

  ok(['expenses' => array_map('officeExpensePayload', $stmt->fetchAll())]);
}

/** Distinct past store names, for the autosuggest on the entry form. */
function officeExpenseStores(PDO $pdo): never {
  $actor = requireExpenseReader($pdo);
  $stmt = $pdo->prepare(
    'SELECT store_name, COUNT(*) AS uses FROM office_expenses
     WHERE company_id = ? AND store_name <> ""
     GROUP BY store_name ORDER BY uses DESC, store_name ASC LIMIT 200'
  );
  $stmt->execute([(int)$actor['company_id']]);
  ok(['stores' => array_map(static fn(array $r): string => $r['store_name'], $stmt->fetchAll())]);
}

function saveOfficeExpense(PDO $pdo, array $in): never {
  $actor = requireExpenseWriter($pdo);
  $companyId = (int)$actor['company_id'];

  $id        = (int)($in['id'] ?? 0);
  $date      = assertIsoDate(trim((string)($in['expenseDate'] ?? '')), 'Expense date');
  $store     = trim((string)($in['storeName'] ?? ''));
  $billType  = (string)($in['billType'] ?? 'Local bill');
  $items     = trim((string)($in['items'] ?? '')) ?: null;
  $amount    = (float)($in['amount'] ?? 0);
  $qty       = (float)($in['qty'] ?? 1);
  $payment   = (string)($in['paymentMethod'] ?? 'Cash');
  $received  = (string)($in['billReceived'] ?? 'No');
  $group     = (string)($in['purchaseGroup'] ?? 'Other');
  $groupOther = trim((string)($in['purchaseGroupOther'] ?? '')) ?: null;

  if ($store === '') throw new DomainException('Store name is required.');
  if (!in_array($billType, EXPENSE_BILL_TYPES, true)) throw new DomainException('Invalid bill type.');
  if (!in_array($payment, EXPENSE_PAYMENT_METHODS, true)) throw new DomainException('Invalid payment method.');
  if (!in_array($received, ['Yes','No'], true)) throw new DomainException('Bill received must be Yes or No.');
  if (!in_array($group, EXPENSE_PURCHASE_GROUPS, true)) throw new DomainException('Invalid purchase group.');
  if ($amount < 0 || $qty < 0) throw new DomainException('Amount and quantity cannot be negative.');
  if ($group === 'Other' && $groupOther === null) throw new DomainException('Please describe the "Other" purchase group.');
  if ($group !== 'Other') $groupOther = null;

  // Net amount is computed, never trusted from the client.
  $netAmount = round($amount * $qty, 2);

  if ($id > 0) {
    $existing = one($pdo, 'SELECT id FROM office_expenses WHERE id=? AND company_id=?', [$id, $companyId]);
    if (!$existing) throw new DomainException('Expense not found.');
    $pdo->prepare(
      'UPDATE office_expenses SET expense_date=?,store_name=?,bill_type=?,items=?,amount=?,qty=?,net_amount=?,
         payment_method=?,bill_received=?,purchase_group=?,purchase_group_other=?
       WHERE id=? AND company_id=?'
    )->execute([$date,$store,$billType,$items,$amount,$qty,$netAmount,$payment,$received,$group,$groupOther,$id,$companyId]);
    $expenseId = $id;
  } else {
    $pdo->prepare(
      'INSERT INTO office_expenses(company_id,expense_date,store_name,bill_type,items,amount,qty,net_amount,
         payment_method,bill_received,purchase_group,purchase_group_other,created_by)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)'
    )->execute([$companyId,$date,$store,$billType,$items,$amount,$qty,$netAmount,$payment,$received,$group,$groupOther,(int)$actor['id']]);
    $expenseId = (int)$pdo->lastInsertId();
  }

  // Optional bill photo, base64 data URL. Replaces any previous photo.
  $photo = $in['billPhoto'] ?? null;
  if (is_array($photo) && !empty($photo['data'])) {
    $pdo->prepare('DELETE FROM office_expense_photos WHERE expense_id=?')->execute([$expenseId]);
    $pdo->prepare('INSERT INTO office_expense_photos(expense_id,file_name,mime_type,photo_data) VALUES(?,?,?,?)')
        ->execute([
          $expenseId,
          substr((string)($photo['fileName'] ?? 'bill'), 0, 255),
          substr((string)($photo['mimeType'] ?? ''), 0, 100),
          (string)$photo['data'],
        ]);
  }

  ok(['message' => 'Expense saved.', 'id' => $expenseId, 'netAmount' => $netAmount]);
}

function getOfficeExpensePhotos(PDO $pdo, array $in): never {
  $actor = requireExpenseReader($pdo);
  $expenseId = (int)($in['expenseId'] ?? 0);
  if ($expenseId <= 0) throw new DomainException('Expense id is required.');

  $owned = one($pdo, 'SELECT id FROM office_expenses WHERE id=? AND company_id=?',
    [$expenseId, (int)$actor['company_id']]);
  if (!$owned) throw new DomainException('Expense not found.');

  $stmt = $pdo->prepare('SELECT id,file_name,mime_type,photo_data FROM office_expense_photos WHERE expense_id=?');
  $stmt->execute([$expenseId]);

  ok(['photos' => array_map(static fn(array $r): array => [
    'id'       => (int)$r['id'],
    'fileName' => $r['file_name'],
    'mimeType' => $r['mime_type'],
    'data'     => $r['photo_data'],
  ], $stmt->fetchAll())]);
}

function deleteOfficeExpense(PDO $pdo, array $in): never {
  $actor = requireExpenseWriter($pdo);
  $id = (int)($in['id'] ?? 0);
  if ($id <= 0) throw new DomainException('Expense id is required.');
  $pdo->prepare('DELETE FROM office_expenses WHERE id=? AND company_id=?')
      ->execute([$id, (int)$actor['company_id']]);
  ok(['message' => 'Expense deleted.']);
}


/* ===========================================================================
 * Phase 9 — Onboarding profile setup
 * =========================================================================== */

/**
 * Marks the caller's onboarding as finished.
 *
 * The mandatory fields are re-checked here rather than trusting the wizard,
 * so the flag can never be set by a client that skipped a step.
 */
function completeProfileSetup(PDO $pdo): never {
  $session = requireSession($pdo);
  $userId = (int)$session['user_id'];

  $profile = one($pdo,
    'SELECT employee_name, phone_number, permanent_address, father_name, mother_name,
            emergency_contact_name, emergency_phone, citizenship_number,
            contract_date, contract_expire_date
     FROM employee_profiles WHERE user_id=?', [$userId]);

  if (!$profile) throw new DomainException('Please fill in your profile before finishing setup.');

  $required = [
    'employee_name'          => 'Employee name',
    'phone_number'           => 'Phone number',
    'permanent_address'      => 'Permanent address',
    'father_name'            => "Father's name",
    'mother_name'            => "Mother's name",
    'emergency_contact_name' => 'Emergency contact name',
    'emergency_phone'        => 'Emergency phone',
    'citizenship_number'     => 'Citizenship number',
    'contract_date'          => 'Contract date',
    'contract_expire_date'   => 'Contract expiry date',
  ];

  $missing = [];
  foreach ($required as $column => $label) {
    if (trim((string)($profile[$column] ?? '')) === '') $missing[] = $label;
  }

  $documents = one($pdo,
    'SELECT COUNT(*) AS total FROM employee_documents
     WHERE user_id=? AND document_type IN ("citizenship","qualification")', [$userId]);
  if ((int)($documents['total'] ?? 0) < 2) {
    $missing[] = 'Citizenship and academic qualification documents';
  }

  if ($missing) {
    throw new DomainException('Still required: ' . implode(', ', $missing) . '.');
  }

  $pdo->prepare('UPDATE users SET profile_setup_complete=1 WHERE id=?')->execute([$userId]);
  ok(['message' => 'Profile setup complete.']);
}
