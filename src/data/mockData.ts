import {
  UserProfile,
  Organization,
  AttendanceRecord,
  LeaveRequest,
  TaskItem,
  Notice,
  Asset,
  Contract,
  Invitation,
  SalarySlip,
  AuditLog,
  FAQItem
} from '../types';

// This is a real, production app — it starts with no sample data.
// The only account that exists on first run is the designated Admin
// (see ADMIN_EMAIL in HRContext.tsx). Everyone else joins through a
// real invitation code generated inside the app.

export const INITIAL_ORGANIZATIONS: Organization[] = [];

export const INITIAL_USERS: UserProfile[] = [];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [];

export const INITIAL_LEAVES: LeaveRequest[] = [];

export const INITIAL_TASKS: TaskItem[] = [];

export const INITIAL_NOTICES: Notice[] = [];

export const INITIAL_ASSETS: Asset[] = [];

export const INITIAL_CONTRACTS: Contract[] = [];

export const INITIAL_INVITATIONS: Invitation[] = [];

export const INITIAL_SALARY_SLIPS: SalarySlip[] = [];

// Generic help-center content — not sample/fake records, just static FAQ copy.
export const INITIAL_FAQS: FAQItem[] = [
  {
    id: 'faq-1',
    question: 'How do I request an official Salary Slip / Payslip?',
    answer: 'Navigate to "Request" in your Team Member dashboard and click "Request Salary Slip". Select the month needed and instantly view or download your official PDF payslip.',
    category: 'Payroll & Salary'
  },
  {
    id: 'faq-2',
    question: 'What is the policy for carry-over annual leaves?',
    answer: 'Employees are permitted to carry forward up to 5 unused annual leaves into the next calendar year. Any additional balance expires on December 31st.',
    category: 'Leaves & Absence'
  },
  {
    id: 'faq-3',
    question: 'How do I report a hardware or asset malfunction?',
    answer: 'In your Assets Register section, click on the specific assigned asset and click "Report Issue". The IT Admin will review and issue a repair or replacement.',
    category: 'Assets & IT'
  },
  {
    id: 'faq-4',
    question: 'What should I do if my Check-in time was recorded incorrectly?',
    answer: 'You can submit an Attendance Correction request under "My Attendance" or notify your HR Manager to adjust the month-wise attendance record.',
    category: 'Attendance'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [];
