export type UserRole =
  | 'superadmin'
  | 'admin'
  | 'hr_manager'
  | 'operation_manager'
  | 'accountant'
  | 'team_member';

export interface EmployeeDocument {
  id?: string;
  documentType: 'employee_photo' | 'citizenship' | 'pan' | 'qualification' | 'contract' | 'other';
  fileName: string;
  mimeType: string;
  fileSize: number;
  data?: string;
  createdAt?: string;
}

export interface EmployeeProfileDetails {
  userId: string;
  employeeCode?: string;
  employeeName: string;
  emailAddress: string;
  role: UserRole;
  department?: string;
  jobTitle?: string;
  joiningDate?: string;
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  maritalStatus?: 'Single' | 'Married' | 'Divorced' | 'Widowed' | 'Prefer not to say';
  highestQualification?: string;
  phoneNumber?: string;
  permanentAddress?: string;
  temporaryAddress?: string;
  fatherName?: string;
  motherName?: string;
  citizenshipNumber?: string;
  panNumber?: string;
  nidNumber?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  bankNameBranch?: string;
  bankBranch?: string;
  contractDate?: string;
  contractExpireDate?: string;
  emergencyContactName?: string;
  emergencyRelationship?: string;
  emergencyPhone?: string;
  emergencyAddress?: string;
  dateOfBirth?: string;
  profileCompletion: number;
  documentCount?: number;
  documents?: EmployeeDocument[];
  updatedAt?: string;
  profilePhoto?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  employeeId?: string;
  employeeCode?: string;
  designation?: string;
  department?: string;
  companyId?: string;
  companyName?: string;
  dob?: string;
  citizenshipPan?: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    ifscCode?: string;
  };
  emergencyPhone?: string;
  guardianPhone?: string;
  photoUrl?: string;
  isActive: boolean;
  /** False until the new joiner finishes the post-OTP profile setup wizard. */
  profileSetupComplete?: boolean;
  createdAt: string;
  documents?: {
    photo?: string;
    academicPhoto?: string;
    citizenshipPhoto?: string;
    panNidPhoto?: string;
    others?: string[];
  };
  employeeProfile?: EmployeeProfileDetails;
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  plan: 'Starter' | 'Growth' | 'Enterprise';
  billingCycle: 'Monthly' | 'Annual';
  activeEmployeesCount: number;
  maxEmployees: number;
  status: 'Active' | 'Suspended' | 'Trial';
  renewalDate: string;
  contactEmail: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  month: string;
  checkIn?: string;
  checkOut?: string;
  status: 'Present' | 'Absent' | 'Late' | 'Half Day' | 'On Leave';
  workHours?: number;
  notes?: string;
}

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';
export type LeaveType = 'Casual Leave' | 'Sick Leave' | 'Annual Leave' | 'Maternity/Paternity' | 'Unpaid Leave';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  appliedOn: string;
  reviewedBy?: string;
  reviewComment?: string;
}

export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'overdue';

export interface TaskItem {
  id: string;
  title: string;
  notes: string;
  status: TaskStatus;
  assignedTo: string;
  assignedToName: string;
  assignedBy: string;
  assignedByName: string;
  dueDate: string;
  createdAt: string;
  updatedAt?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
}

export type EmployeeRequestType =
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

export type EmployeeRequestStatus = 'Pending' | 'Accepted' | 'Rejected';

export interface EmployeeRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode?: string;
  designation?: string;
  requestType: EmployeeRequestType;
  subject: string;
  description: string;
  startDate?: string;
  endDate?: string;
  amount?: number;
  status: EmployeeRequestStatus;
  submittedAt: string;
  updatedAt?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewComment?: string;
}

export type NotificationType = 'task' | 'request' | 'attendance' | 'notice' | 'system';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  entityType?: 'task' | 'request' | 'attendance' | 'notice' | 'system';
  entityId?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  postedBy: string;
  postedByName: string;
  date: string;
  /** 'Important' is retained for legacy rows; the UI now publishes Normal or Urgent. */
  priority: 'Normal' | 'Important' | 'Urgent';
  targetRole?: UserRole | 'All';
}

export interface Asset {
  id: string;
  assetCode: string;
  name: string;
  category: 'Laptop' | 'Mobile' | 'Monitor' | 'Access Card' | 'Furniture' | 'Peripherals';
  assignedTo?: string;
  assignedToName?: string;
  status: 'In Use' | 'Available' | 'Under Maintenance' | 'Decommissioned';
  purchaseDate: string;
  serialNumber?: string;
}

export interface Contract {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode?: string;
  designation?: string;
  department?: string;
  officeJoinDate?: string;
  contractDate: string;
  contractExpireDate: string;
  contractType: 'Full-Time' | 'Part-Time' | 'Probation' | 'Consultant' | 'Fixed-Term' | 'Internship';
  status: 'Active' | 'Pending Renewal' | 'Expired' | 'Terminated';
  remark?: string;
  createdAt: string;
  updatedAt: string;
  daysForNewContract: number;
  workingDuration: string;
  progressPercent: number;
  // Legacy fields retained so older report/UI code does not break.
  contractCode?: string;
  type?: 'Full-Time' | 'Part-Time' | 'Probation' | 'Consultant';
  salaryMonthly?: number;
  startDate?: string;
  endDate?: string;
  documentUrl?: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  employeeId: string;
  companyId: string;
  invitedBy: string;
  invitedByName: string;
  status: 'Pending' | 'Accepted' | 'Expired';
  createdAt: string;
  code: string;
}

export interface SalarySlip {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netPay: number;
  issuedDate: string;
  status: 'Paid' | 'Processing';
}

export interface AuditLog {
  id: string;
  action: string;
  doneBy: string;
  doneByName: string;
  role: UserRole;
  timestamp: string;
  details: string;
  entityType?: string;
  entityId?: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}


export type DocumentTemplateKey = 'employee_contract' | 'device_home_taking';

export interface CompanyLetterhead {
  id: number; companyId: number; fileName: string; mimeType: string; dataUrl: string; uploadedAt: string; uploadedByName?: string;
}

export interface GeneratedDocumentRecord {
  id: number; companyId: number; employeeId?: number | null; employeeName?: string | null; templateKey: DocumentTemplateKey; documentName: string; fileName: string; generatedBy: number; generatedByName: string; generatedAt: string;
}
