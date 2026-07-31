const API_BASE_URL = (
  import.meta.env.VITE_AUTH_API_URL || "https://api.nexuxhr.com"
).replace(/\/+$/, "");

export type UserStatus = "active" | "inactive";

export type AuthUser = {
  id: number;
  email: string;
  fullName: string;
  role: string;
  employeeCode?: string;
  designation?: string;
  department?: string;
  companyId?: number | null;
  companyName?: string | null;
  photoUrl?: string | null;
  /** False until the new joiner finishes the post-OTP profile setup wizard. */
  profileSetupComplete?: boolean;
};

export type ServerUser = AuthUser & {
  status: UserStatus;
  createdAt?: string;
};

export type Company = {
  id: number;
  name: string;
  code: string;
  status: "active" | "suspended";
  createdAt: string;
  adminName?: string | null;
  adminEmail?: string | null;
  employeeCount: number;
};

export type LeaveRequestRecord = {
  id: number;
  employeeId: number;
  employeeName: string;
  designation?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  status: "Pending" | "Approved" | "Rejected";
  appliedOn: string;
  reviewedBy?: string | null;
  reviewComment?: string | null;
};

export type NoticeRecord = {
  id: number;
  title: string;
  content: string;
  postedBy: number;
  postedByName: string;
  date: string;
  priority: "Normal" | "Important" | "Urgent";
};

type BaseResponse = {
  success: boolean;
  message?: string;
};

async function callAuthApi<T extends object>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T & BaseResponse> {
  const response = await fetch(
    `${API_BASE_URL}/index.php?action=${encodeURIComponent(action)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    },
  );

  const responseText = await response.text();
  let result: (T & BaseResponse) | null = null;

  try {
    result = JSON.parse(responseText) as T & BaseResponse;
  } catch {
    throw new Error(
      `API returned invalid JSON (${response.status}): ${responseText.slice(0, 200)}`,
    );
  }

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message || `API request failed with status ${response.status}`,
    );
  }

  return result;
}

function getStoredToken(): string | null {
  return localStorage.getItem("nexuxhr_auth_token") || sessionStorage.getItem("nexuxhr_auth_token");
}
function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
function saveToken(token?: string, remember = false): void {
  localStorage.removeItem("nexuxhr_auth_token");
  sessionStorage.removeItem("nexuxhr_auth_token");
  if (!token) return;
  (remember ? localStorage : sessionStorage).setItem("nexuxhr_auth_token", token);
}

export async function sendSignupOtp(
  email: string,
  invitationCode?: string,
  name?: string,
): Promise<{ success: boolean; message: string }> {
  return callAuthApi("send_signup_otp", {
    email,
    invitationCode,
    name,
  });
}

export async function completeSignup(payload: {
  email: string;
  password: string;
  otp: string;
  invitationCode?: string;
  profile: {
    name: string;
    employeeCode: string;
    designation?: string;
    department?: string;
  };
}): Promise<{ success: boolean; token: string; user: AuthUser }> {
  const result = await callAuthApi<{ token: string; user: AuthUser }>(
    "complete_signup",
    payload,
  );
  saveToken(result.token);
  return result;
}

export async function loginWithPassword(
  email: string,
  password: string,
  remember = false,
): Promise<{ success: boolean; token: string; user: AuthUser }> {
  const result = await callAuthApi<{ token: string; user: AuthUser }>("login", { email, password });
  saveToken(result.token, remember);
  return result;
}

export async function requestPasswordReset(
  email: string,
): Promise<{ success: boolean; message: string }> {
  return callAuthApi("request_password_reset", { email });
}

export async function resetPassword(
  email: string,
  resetToken: string,
  newPassword: string,
): Promise<{ success: boolean; message: string }> {
  return callAuthApi("reset_password", {
    email,
    resetToken,
    newPassword,
  });
}

export async function createInvitation(
  email: string,
  role: string,
): Promise<{ success: boolean; message: string; code: string }>;
export async function createInvitation(data: {
  email: string;
  role?: string;
}): Promise<{ success: boolean; message: string; code: string }>;
export async function createInvitation(
  emailOrData: string | { email: string; role?: string },
  role?: string,
): Promise<{ success: boolean; message: string; code: string }> {
  const payload =
    typeof emailOrData === "string"
      ? { email: emailOrData, role: role || "team_member" }
      : { email: emailOrData.email, role: emailOrData.role || "team_member" };
  return callAuthApi("create_invitation", payload);
}

export async function listUsers(): Promise<{
  success: boolean;
  users: ServerUser[];
}> {
  return callAuthApi("list_users");
}

export async function setUserStatus(
  userId: number,
  status: UserStatus,
): Promise<{ success: boolean; message: string }> {
  return callAuthApi("set_user_status", { userId, status });
}

export async function getCurrentUser(): Promise<{
  success: boolean;
  user: AuthUser;
}> {
  return callAuthApi("me");
}

export async function logout(): Promise<{ success: boolean; message: string }> {
  try {
    return await callAuthApi("logout");
  } finally {
    localStorage.removeItem("nexuxhr_auth_token");
    sessionStorage.removeItem("nexuxhr_auth_token");
  }
}

// Compatibility aliases used by App.tsx
export function hasSession(): boolean {
  return !!getStoredToken();
}

export async function logoutUser(): Promise<{ success: boolean; message: string }> {
  return logout();
}

// ---------------------------------------------------------------------------
// Companies (superadmin only)
// ---------------------------------------------------------------------------

export type AssetPhoto = { id: number; type: "imei" | "device"; data: string };

export type AssetListItem = {
  id: number;
  assetType: "mobile" | "laptop" | "pc";
  modelName?: string | null;
  imei1?: string | null;
  imei2?: string | null;
  deviceType?: string | null;
  brandModel?: string | null;
  processor?: string | null;
  deviceId?: string | null;
  operatingSystem?: string | null;
  issuedDate: string;
  returnDate?: string | null;
  renewalIntervalDays?: number | null;
  purpose?: string | null;
  accessories?: string | null;
  acknowledged: boolean;
  status: "active" | "returned" | "lost" | "damaged";
  createdAt: string;
  assignedToUserId: number;
  assignedToName: string;
  assignedToDesignation?: string | null;
};

export type AssetDetail = AssetListItem & {
  signatureData?: string | null;
  assignedToEmail?: string;
  photos: AssetPhoto[];
};

export type NewAssetInput = {
  assignedToUserId: number;
  assetType: "mobile" | "laptop" | "pc";
  modelName?: string;
  imei1?: string;
  imei2?: string;
  deviceType?: string;
  brandModel?: string;
  processor?: string;
  deviceId?: string;
  operatingSystem?: string;
  issuedDate: string;
  returnDate?: string;
  renewalIntervalDays?: number;
  purpose?: string;
  accessories?: string;
  acknowledged: boolean;
  signatureData?: string;
  photos: { type: "imei" | "device"; data: string }[];
};

export async function createAsset(
  data: NewAssetInput,
): Promise<{ success: boolean; message: string; id: number }> {
  return callAuthApi("create_asset", data);
}

export async function listAssets(): Promise<{
  success: boolean;
  assets: AssetListItem[];
}> {
  return callAuthApi("list_assets");
}

export async function getAssetDetail(
  assetId: number,
): Promise<{ success: boolean; asset: AssetDetail }> {
  return callAuthApi("get_asset_detail", { assetId });
}

export type UpdateAssetInput = {
  assetId: number;
  modelName?: string;
  imei1?: string;
  imei2?: string;
  deviceType?: string;
  brandModel?: string;
  processor?: string;
  deviceId?: string;
  operatingSystem?: string;
  issuedDate: string;
  returnDate?: string;
  renewalIntervalDays?: number;
  purpose?: string;
  accessories?: string;
  status: "active" | "returned" | "lost" | "damaged";
};

export async function updateAsset(
  data: UpdateAssetInput,
): Promise<{ success: boolean; message: string }> {
  return callAuthApi("update_asset", data);
}

export async function updateAssetStatusApi(
  assetId: number,
  status: "active" | "returned" | "lost" | "damaged",
): Promise<{ success: boolean; message: string }> {
  return callAuthApi("update_asset_status", { assetId, status });
}
export type InvitationRecord = {
  id: number;
  email: string;
  role: string;
  code: string;
  status: "Pending" | "Accepted" | "Expired";
  createdAt: string;
  expiresAt: string;
};

export async function listInvitations(): Promise<{
  success: boolean;
  invitations: InvitationRecord[];
}> {
  return callAuthApi("list_invitations");
}

export async function deleteInvitation(
  invitationId: number,
): Promise<{ success: boolean; message: string }> {
  return callAuthApi("delete_invitation", { invitationId });
}

export async function createCompanyInvite(
  companyName: string,
  adminEmail: string,
): Promise<{ success: boolean; message: string; code: string; companyId: number }> {
  return callAuthApi("create_company_invite", { companyName, adminEmail });
}

export async function listCompanies(): Promise<{
  success: boolean;
  companies: Company[];
}> {
  return callAuthApi("list_companies");
}

export async function updateCompanyStatus(
  companyId: number,
  status: "active" | "suspended",
): Promise<{ success: boolean; message: string }> {
  return callAuthApi("update_company_status", { companyId, status });
}

// ---------------------------------------------------------------------------
// Leave requests
// ---------------------------------------------------------------------------

export async function submitLeaveRequestApi(data: {
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
}): Promise<{ success: boolean; message: string; id: number }> {
  return callAuthApi("submit_leave_request", data);
}

export async function listLeaveRequestsApi(): Promise<{
  success: boolean;
  leaveRequests: LeaveRequestRecord[];
}> {
  return callAuthApi("list_leave_requests");
}

export async function reviewLeaveRequestApi(
  leaveId: number,
  status: "Approved" | "Rejected",
  comment?: string,
): Promise<{ success: boolean; message: string }> {
  return callAuthApi("review_leave_request", { leaveId, status, comment });
}

// ---------------------------------------------------------------------------
// Notices
// ---------------------------------------------------------------------------

export async function createNoticeApi(data: {
  title: string;
  content: string;
  priority?: "Normal" | "Important" | "Urgent";
}): Promise<{ success: boolean; message: string; id: number }> {
  return callAuthApi("create_notice", data);
}

export async function listNoticesApi(): Promise<{
  success: boolean;
  notices: NoticeRecord[];
}> {
  return callAuthApi("list_notices");
}

export async function deleteNoticeApi(
  noticeId: number,
): Promise<{ success: boolean; message: string }> {
  return callAuthApi("delete_notice", { noticeId });
}

// ---------------------------------------------------------------------------
// Phase 2: Tasks
// ---------------------------------------------------------------------------

export type TaskRecord = {
  id: number;
  title: string;
  notes?: string | null;
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  dueDate: string;
  assignedTo: number;
  assignedToName: string;
  assignedBy: number;
  assignedByName: string;
  createdAt: string;
  updatedAt?: string;
};

export async function createTaskApi(data: {
  title: string;
  notes?: string;
  status?: TaskRecord['status'];
  priority: TaskRecord['priority'];
  dueDate: string;
  assignedToUserId: number;
}): Promise<{ success: boolean; message: string; id: number }> {
  return callAuthApi('create_task', data);
}

export async function listTasksApi(): Promise<{
  success: boolean;
  tasks: TaskRecord[];
}> {
  return callAuthApi('list_tasks');
}

export async function updateTaskStatusApi(
  taskId: number,
  status: TaskRecord['status'],
): Promise<{ success: boolean; message: string }> {
  return callAuthApi('update_task_status', { taskId, status });
}

export async function deleteTaskApi(
  taskId: number,
): Promise<{ success: boolean; message: string }> {
  return callAuthApi('delete_task', { taskId });
}

// ---------------------------------------------------------------------------
// Phase 2: Employee requests
// ---------------------------------------------------------------------------

export type EmployeeRequestRecord = {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode?: string | null;
  designation?: string | null;
  requestType:
    | 'Leave'
    | 'Salary Slip'
    | 'Appointment'
    | 'Attendance Correction'
    | 'Asset Issue / Repair'
    | 'Employment Letter'
    | 'Document Request'
    | 'Work From Home'
    | 'Reimbursement'
    | 'Other';
  subject: string;
  description: string;
  startDate?: string | null;
  endDate?: string | null;
  amount?: number | null;
  status: 'Pending' | 'Accepted' | 'Rejected';
  submittedAt: string;
  updatedAt?: string;
  reviewedBy?: number | null;
  reviewedByName?: string | null;
  reviewComment?: string | null;
};

export async function submitEmployeeRequestApi(data: {
  requestType: EmployeeRequestRecord['requestType'];
  subject: string;
  description: string;
  startDate?: string;
  endDate?: string;
  amount?: number;
}): Promise<{ success: boolean; message: string; id: number }> {
  return callAuthApi('submit_employee_request', data);
}

export async function listEmployeeRequestsApi(): Promise<{
  success: boolean;
  requests: EmployeeRequestRecord[];
}> {
  return callAuthApi('list_employee_requests');
}

export async function reviewEmployeeRequestApi(data: {
  requestId: number;
  status: EmployeeRequestRecord['status'];
  comment?: string;
}): Promise<{ success: boolean; message: string }> {
  return callAuthApi('review_employee_request', data);
}

// ---------------------------------------------------------------------------
// Phase 2: Notifications
// ---------------------------------------------------------------------------

export type NotificationRecord = {
  id: number;
  title: string;
  message: string;
  type: 'task' | 'request' | 'attendance' | 'notice' | 'system';
  entityType?: 'task' | 'request' | 'attendance' | 'notice' | 'system' | null;
  entityId?: number | null;
  isRead: boolean;
  createdAt: string;
  readAt?: string | null;
};

export async function listNotificationsApi(): Promise<{
  success: boolean;
  notifications: NotificationRecord[];
  unreadCount: number;
}> {
  return callAuthApi('list_notifications');
}

export async function setNotificationReadApi(
  notificationId: number,
  isRead: boolean,
): Promise<{ success: boolean; message: string }> {
  return callAuthApi('set_notification_read', { notificationId, isRead });
}

export async function markAllNotificationsReadApi(): Promise<{
  success: boolean;
  message: string;
}> {
  return callAuthApi('mark_all_notifications_read');
}

// ---------------------------------------------------------------------------
// Phase 2: Attendance
// ---------------------------------------------------------------------------

export type AttendanceRecordApi = {
  id: number;
  employeeId: number;
  employeeName: string;
  date: string;
  month: string;
  checkIn?: string | null;
  checkOut?: string | null;
  status: 'Present' | 'Absent' | 'Late' | 'Half Day' | 'On Leave';
  workHours?: number | null;
  notes?: string | null;
};

export async function listAttendanceApi(month?: string): Promise<{
  success: boolean;
  attendance: AttendanceRecordApi[];
}> {
  return callAuthApi('list_attendance', month ? { month } : {});
}

export async function checkInApi(notes?: string): Promise<{
  success: boolean;
  message: string;
  attendance: AttendanceRecordApi;
}> {
  return callAuthApi('check_in', { notes });
}

export async function checkOutApi(): Promise<{
  success: boolean;
  message: string;
  attendance: AttendanceRecordApi;
}> {
  return callAuthApi('check_out');
}

export async function upsertAttendanceApi(data: {
  userId: number;
  date: string;
  status: AttendanceRecordApi['status'];
  checkIn?: string;
  checkOut?: string;
  notes?: string;
}): Promise<{ success: boolean; message: string }> {
  return callAuthApi('upsert_attendance', data);
}

// ---------------------------------------------------------------------------
// Phase 3: Employee profiles, documents, contracts and audit logs
// ---------------------------------------------------------------------------

export type EmployeeDocumentRecord = {
  id: number;
  documentType: 'employee_photo' | 'citizenship' | 'pan' | 'qualification' | 'contract' | 'other';
  fileName: string;
  mimeType: string;
  fileSize: number;
  data?: string;
  createdAt: string;
};

export type EmployeeProfileRecord = {
  userId: number;
  employeeCode?: string | null;
  employeeName: string;
  emailAddress: string;
  role: 'superadmin' | 'admin' | 'hr_manager' | 'team_member';
  department?: string | null;
  jobTitle?: string | null;
  joiningDate?: string | null;
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say' | null;
  maritalStatus?: 'Single' | 'Married' | 'Divorced' | 'Widowed' | 'Prefer not to say' | null;
  highestQualification?: string | null;
  phoneNumber?: string | null;
  permanentAddress?: string | null;
  temporaryAddress?: string | null;
  fatherName?: string | null;
  motherName?: string | null;
  citizenshipNumber?: string | null;
  panNumber?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
  bankBranch?: string | null;
  nidNumber?: string | null;
  bankNameBranch?: string | null;
  contractDate?: string | null;
  contractExpireDate?: string | null;
  emergencyContactName?: string | null;
  emergencyRelationship?: string | null;
  emergencyPhone?: string | null;
  emergencyAddress?: string | null;
  dateOfBirth?: string | null;
  profileCompletion: number;
  documentCount: number;
  documents?: EmployeeDocumentRecord[];
  updatedAt?: string | null;
  profilePhoto?: string | null;
};

export type SaveEmployeeProfileInput = {
  userId?: number;
  employeeCode?: string;
  employeeName: string;
  emailAddress: string;
  department?: string;
  jobTitle?: string;
  joiningDate?: string;
  gender?: EmployeeProfileRecord['gender'];
  maritalStatus?: EmployeeProfileRecord['maritalStatus'];
  highestQualification?: string;
  phoneNumber?: string;
  permanentAddress?: string;
  temporaryAddress?: string;
  fatherName?: string;
  motherName?: string;
  citizenshipNumber?: string;
  panNumber?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  bankBranch?: string;
  nidNumber?: string;
  bankNameBranch?: string;
  contractDate?: string;
  contractExpireDate?: string;
  emergencyContactName?: string;
  emergencyRelationship?: string;
  emergencyPhone?: string;
  emergencyAddress?: string;
  dateOfBirth?: string;
  profilePhoto?: string;
  documents?: Array<{
    documentType: EmployeeDocumentRecord['documentType'];
    fileName: string;
    mimeType: string;
    fileSize: number;
    data: string;
  }>;
};

export async function listEmployeeProfilesApi(): Promise<{
  success: boolean;
  profiles: EmployeeProfileRecord[];
}> {
  return callAuthApi('list_employee_profiles');
}

export async function getEmployeeProfileApi(userId?: number): Promise<{
  success: boolean;
  profile: EmployeeProfileRecord;
}> {
  return callAuthApi('get_employee_profile', userId ? { userId } : {});
}

export async function saveEmployeeProfileApi(
  data: SaveEmployeeProfileInput,
): Promise<{ success: boolean; message: string; profile: EmployeeProfileRecord }> {
  return callAuthApi('save_employee_profile', data as unknown as Record<string, unknown>);
}

export async function deleteEmployeeDocumentApi(
  documentId: number,
): Promise<{ success: boolean; message: string }> {
  return callAuthApi('delete_employee_document', { documentId });
}

export type EmploymentContractRecord = {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode?: string | null;
  designation?: string | null;
  department?: string | null;
  officeJoinDate?: string | null;
  contractDate: string;
  contractExpireDate: string;
  contractType: 'Full-Time' | 'Part-Time' | 'Probation' | 'Consultant' | 'Fixed-Term' | 'Internship';
  status: 'Active' | 'Pending Renewal' | 'Expired' | 'Terminated';
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
  daysForNewContract: number;
  workingDuration: string;
  progressPercent: number;
};

export async function listContractsApi(): Promise<{
  success: boolean;
  contracts: EmploymentContractRecord[];
}> {
  return callAuthApi('list_contracts');
}

export async function saveContractApi(data: {
  contractId?: number;
  userId: number;
  officeJoinDate?: string;
  contractDate: string;
  contractExpireDate: string;
  contractType: EmploymentContractRecord['contractType'];
  status: EmploymentContractRecord['status'];
  remark?: string;
}): Promise<{ success: boolean; message: string; id: number }> {
  return callAuthApi('save_contract', data);
}

export type AuditLogRecord = {
  id: number;
  action: string;
  doneBy: number;
  doneByName: string;
  role: 'superadmin' | 'admin' | 'hr_manager' | 'team_member';
  entityType?: string | null;
  entityId?: number | null;
  details: string;
  timestamp: string;
};

export async function listAuditLogsApi(limit = 100): Promise<{
  success: boolean;
  auditLogs: AuditLogRecord[];
}> {
  return callAuthApi('list_audit_logs', { limit });
}


export type Phase5Letterhead = { id:number; fileName:string; mimeType:string; dataUrl:string; uploadedAt:string; uploadedByName?:string };
export type Phase5GeneratedDocument = { id:number; employeeId?:number|null; employeeName?:string|null; templateKey:string; documentName:string; fileName:string; generatedByName:string; generatedAt:string };

export async function getCompanyLetterheadApi(): Promise<{letterhead: Phase5Letterhead | null}> {
  return callAuthApi('get_company_letterhead');
}
export async function saveCompanyLetterheadApi(data:{fileName:string; mimeType:string; dataUrl:string}): Promise<{letterhead: Phase5Letterhead}> {
  return callAuthApi('save_company_letterhead', data);
}
export async function listGeneratedDocumentsApi(): Promise<{documents: Phase5GeneratedDocument[]}> {
  return callAuthApi('list_generated_documents');
}
export async function generateHrDocumentApi(data:{templateKey:string; employeeId?:number; fields:Record<string,string>}): Promise<{fileName:string; mimeType:string; base64:string; documentId:number}> {
  return callAuthApi('generate_hr_document', data);
}
export async function deleteGeneratedDocumentApi(id:number): Promise<{message:string}> {
  return callAuthApi('delete_generated_document', {id});
}


// Phase 6: Nepal-focused attendance management
export type AttendanceShiftApi={id:number;name:string;startTime:string;endTime:string;isActive:boolean};
export type AttendanceCorrectionApi={id:number;employeeId:number;employeeName:string;attendanceDate:string;reason:string;status:'Pending'|'Approved'|'Rejected';reviewNote?:string|null};
export async function attendanceOverviewApi(month:string):Promise<{summary:any}>{return callAuthApi('attendance_overview',{month});}
export async function listAttendanceShiftsApi():Promise<{shifts:AttendanceShiftApi[]}>{return callAuthApi('list_attendance_shifts',{});}
export async function saveAttendanceShiftApi(data:{name:string;startTime:string;endTime:string}):Promise<{message:string}>{return callAuthApi('save_attendance_shift',data);}
export async function saveAttendancePolicyApi(data:{requiredHours:number;halfDayHours:number;sandwichLeave:boolean}):Promise<{message:string}>{return callAuthApi('save_attendance_policy',data);}
export async function listAttendanceCorrectionsApi(month:string):Promise<{corrections:AttendanceCorrectionApi[]}>{return callAuthApi('list_attendance_corrections',{month});}
export async function submitAttendanceCorrectionApi(data:{date:string;reason:string}):Promise<{message:string}>{return callAuthApi('submit_attendance_correction',data);}
export async function reviewAttendanceCorrectionApi(id:number,status:'Approved'|'Rejected',reviewNote=''):Promise<{message:string}>{return callAuthApi('review_attendance_correction',{id,status,reviewNote});}
export async function lockAttendanceMonthApi(month:string):Promise<{message:string}>{return callAuthApi('lock_attendance_month',{month});}


// ---------------------------------------------------------------------------
// Phase 7: Bikram Sambat ranges, biometric import, HR leave record sheet
// ---------------------------------------------------------------------------

/**
 * A BS month spans two AD months, so the BS attendance grid fetches an explicit
 * ISO range instead of a 'YYYY-MM' key.
 */
export async function listAttendanceRangeApi(startDate: string, endDate: string): Promise<{
  attendance: AttendanceRecordApi[];
}> {
  return callAuthApi('list_attendance_range', { startDate, endDate });
}

export async function attendanceOverviewRangeApi(startDate: string, endDate: string): Promise<{
  summary: { present: number; absent: number; late: number; halfDay: number; onLeave: number };
}> {
  return callAuthApi('attendance_overview_range', { startDate, endDate });
}

export type BiometricImportRow = {
  userId: number;
  date: string;
  status: AttendanceRecordApi['status'];
  checkIn?: string;
  checkOut?: string;
  notes?: string;
};

/** Bulk write of parsed device rows. The server runs them in one transaction. */
export async function importBiometricAttendanceApi(rows: BiometricImportRow[]): Promise<{
  message: string; imported: number; skipped: number; errors: string[];
}> {
  return callAuthApi('import_biometric_attendance', { rows });
}

export type LeaveRecordApi = {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode?: string | null;
  recordDate: string;
  leaveType: 'Full Day' | 'Half Day' | 'Hourly';
  leaveStart: string;
  leaveEnd: string;
  reason?: string | null;
  letterReceived: 'Yes' | 'No';
  leaveDays: number;
  createdAt?: string;
};

export async function listLeaveRecordsApi(startDate?: string, endDate?: string): Promise<{
  records: LeaveRecordApi[];
}> {
  return callAuthApi('list_leave_records', startDate && endDate ? { startDate, endDate } : {});
}

export async function saveLeaveRecordApi(data: {
  id?: number;
  employeeId: number;
  recordDate: string;
  leaveType: LeaveRecordApi['leaveType'];
  leaveStart: string;
  leaveEnd: string;
  reason?: string;
  letterReceived: 'Yes' | 'No';
}): Promise<{ message: string; id: number; leaveDays: number }> {
  return callAuthApi('save_leave_record', data);
}

export async function deleteLeaveRecordApi(id: number): Promise<{ message: string }> {
  return callAuthApi('delete_leave_record', { id });
}


// ---------------------------------------------------------------------------
// Phase 8: upcoming birthdays, urgent notice acknowledgement
// ---------------------------------------------------------------------------

export type UpcomingBirthday = {
  userId: number;
  name: string;
  employeeCode?: string | null;
  profilePhoto?: string | null;
  birthMonth: number;
  birthDay: number;
  nextDateIso: string;
  daysUntil: number;
};

/**
 * Callable by every role. Deliberately returns no birth year and no age —
 * only what a "whose birthday is next" card needs.
 */
export async function listUpcomingBirthdaysApi(withinDays = 60): Promise<{
  birthdays: UpcomingBirthday[];
}> {
  return callAuthApi('list_upcoming_birthdays', { withinDays });
}

export type PendingUrgentNotice = {
  id: number;
  title: string;
  content: string;
  postedByName: string;
  createdAt: string;
};

export async function listPendingUrgentNoticesApi(): Promise<{
  notices: PendingUrgentNotice[];
}> {
  return callAuthApi('list_pending_urgent_notices', {});
}

export async function acknowledgeNoticeApi(noticeId: number): Promise<{ message: string }> {
  return callAuthApi('acknowledge_notice', { noticeId });
}


// ---------------------------------------------------------------------------
// Phase 9: Office Expenses + onboarding profile setup
// ---------------------------------------------------------------------------

export const EXPENSE_BILL_TYPES = ['PAN bill', 'VAT bill', 'Local bill', 'No bill cash credit'] as const;
export const EXPENSE_PAYMENT_METHODS = ['Fonepay', 'ConnectIPS', 'Cash'] as const;
export const EXPENSE_PURCHASE_GROUPS = ['Kitchen', 'Entertainment', 'Stationaries', 'Electronic', 'Operation', 'Other'] as const;

export type ExpenseBillType = typeof EXPENSE_BILL_TYPES[number];
export type ExpensePaymentMethod = typeof EXPENSE_PAYMENT_METHODS[number];
export type ExpensePurchaseGroup = typeof EXPENSE_PURCHASE_GROUPS[number];

export type OfficeExpense = {
  id: number;
  expenseDate: string;
  storeName: string;
  billType: ExpenseBillType;
  items?: string | null;
  amount: number;
  qty: number;
  netAmount: number;
  paymentMethod: ExpensePaymentMethod;
  billReceived: 'Yes' | 'No';
  purchaseGroup: ExpensePurchaseGroup;
  purchaseGroupOther?: string | null;
  photoCount: number;
  createdByName?: string | null;
  createdAt?: string | null;
};

/** Expenses in an ISO range — the frontend passes the AD span of a BS month. */
export async function listOfficeExpensesApi(startDate?: string, endDate?: string): Promise<{
  expenses: OfficeExpense[];
}> {
  return callAuthApi('list_office_expenses', startDate && endDate ? { startDate, endDate } : {});
}

export async function officeExpenseStoresApi(): Promise<{ stores: string[] }> {
  return callAuthApi('office_expense_stores', {});
}

export async function saveOfficeExpenseApi(data: {
  id?: number;
  expenseDate: string;
  storeName: string;
  billType: ExpenseBillType;
  items?: string;
  amount: number;
  qty: number;
  paymentMethod: ExpensePaymentMethod;
  billReceived: 'Yes' | 'No';
  purchaseGroup: ExpensePurchaseGroup;
  purchaseGroupOther?: string;
  billPhoto?: { fileName: string; mimeType: string; data: string } | null;
}): Promise<{ message: string; id: number; netAmount: number }> {
  return callAuthApi('save_office_expense', data);
}

export async function deleteOfficeExpenseApi(id: number): Promise<{ message: string }> {
  return callAuthApi('delete_office_expense', { id });
}

export async function getOfficeExpensePhotosApi(expenseId: number): Promise<{
  photos: { id: number; fileName?: string | null; mimeType?: string | null; data: string }[];
}> {
  return callAuthApi('get_office_expense_photos', { expenseId });
}

/**
 * Marks onboarding finished. The server re-validates every mandatory field, so
 * a client that skipped a step gets a message listing what is still missing.
 */
export async function completeProfileSetupApi(): Promise<{ message: string }> {
  return callAuthApi('complete_profile_setup', {});
}
