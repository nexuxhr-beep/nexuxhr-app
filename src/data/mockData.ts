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
    answer: 'Open “Request & FAQ”, choose “Salary Slip”, enter the required month in the subject or description, and submit it. Admin or HR can review the request and update its status for you.',
    category: 'Payroll & Salary'
  },
  {
    id: 'faq-2',
    question: 'What is the policy for carry-over annual leaves?',
    answer: 'Leave carry-over depends on your company policy. Submit a leave-related request or contact Admin/HR for the rule configured for your organisation.',
    category: 'Leaves & Absence'
  },
  {
    id: 'faq-3',
    question: 'How do I report a hardware or asset malfunction?',
    answer: 'Open “Request & FAQ”, select “Asset Issue / Repair”, describe the device and issue, then submit it. Admin and HR will receive the request in the same management queue.',
    category: 'Assets & IT'
  },
  {
    id: 'faq-4',
    question: 'What should I do if my Check-in time was recorded incorrectly?',
    answer: 'Open “Request & FAQ”, select “Attendance Correction”, include the date and correct time, then submit it. Admin and HR can review and update the attendance record.',
    category: 'Attendance'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [];
