import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  AppNotification,
  AttendanceRecord,
  AuditLog,
  Contract,
  EmployeeRequest,
  EmployeeRequestStatus,
  EmployeeRequestType,
  EmployeeProfileDetails,
  EmployeeDocument,
  Invitation,
  LeaveRequest,
  Notice,
  Organization,
  SalarySlip,
  TaskItem,
  TaskStatus,
  UserProfile,
  UserRole,
} from '../types';
import {
  INITIAL_ATTENDANCE,
  INITIAL_AUDIT_LOGS,
  INITIAL_CONTRACTS,
  INITIAL_INVITATIONS,
  INITIAL_LEAVES,
  INITIAL_NOTICES,
  INITIAL_ORGANIZATIONS,
  INITIAL_SALARY_SLIPS,
  INITIAL_USERS,
} from '../data/mockData';
import { getStoredData, saveStoredData } from '../lib/storage';
import {
  AssetDetail,
  AssetListItem,
  Company,
  NewAssetInput,
  UpdateAssetInput,
  checkInApi,
  checkOutApi,
  createAsset as createAssetRequest,
  createCompanyInvite as createCompanyInviteRequest,
  createInvitation as createInvitationRequest,
  createNoticeApi,
  createTaskApi,
  deleteInvitation as deleteInvitationRequest,
  deleteCompany as deleteCompanyRequest,
  deleteNoticeApi,
  deleteTaskApi,
  getAssetDetail as getAssetDetailRequest,
  listAssets as listAssetsRequest,
  listAttendanceApi,
  listCompanies as listCompaniesRequest,
  listEmployeeRequestsApi,
  listEmployeeProfilesApi,
  getEmployeeProfileApi,
  saveEmployeeProfileApi,
  deleteEmployeeDocumentApi,
  listContractsApi,
  saveContractApi,
  listAuditLogsApi,
  SaveEmployeeProfileInput,
  listInvitations as listInvitationsRequest,
  listLeaveRequestsApi,
  listNoticesApi,
  listNotificationsApi,
  listTasksApi,
  listUsers as listUsersRequest,
  markAllNotificationsReadApi,
  reviewEmployeeRequestApi,
  reviewLeaveRequestApi,
  setNotificationReadApi,
  setUserStatus as setUserStatusRequest,
  submitEmployeeRequestApi,
  submitLeaveRequestApi,
  updateAsset as updateAssetRequest,
  updateAssetStatusApi,
  updateCompanyStatus as updateCompanyStatusRequest,
  updateTaskStatusApi,
  upsertAttendanceApi,
} from '../lib/authApi';

// Kept for compatibility with the original project. Real production accounts
// are now hydrated from the cPanel/MySQL API after authentication.
export const ADMIN_EMAIL = 'teampujan@gmail.com';

type ServerAuthUser = {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  employeeCode?: string;
  designation?: string;
  department?: string;
  companyId?: number | null;
  companyName?: string | null;
};

interface HRContextType {
  currentUser: UserProfile;
  activeRole: UserRole;
  loginWithEmail: (email: string, displayNameHint?: string) => UserProfile;
  hydrateSessionFromServer: (authUser: ServerAuthUser) => UserProfile;
  clearSession: () => void;
  updateCurrentUserProfile: (updated: Partial<UserProfile>) => void;

  users: UserProfile[];
  organizations: Organization[];
  attendanceRecords: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  tasks: TaskItem[];
  employeeRequests: EmployeeRequest[];
  notifications: AppNotification[];
  unreadNotificationCount: number;
  notices: Notice[];
  assets: AssetListItem[];
  employeeProfiles: EmployeeProfileDetails[];
  contracts: Contract[];
  invitations: Invitation[];
  salarySlips: SalarySlip[];
  auditLogs: AuditLog[];
  companies: Company[];

  toggleUserActiveStatus: (userId: string) => Promise<void>;
  addOrUpdateEmployee: (emp: UserProfile) => void;

  checkInCurrentEmployee: (notes?: string) => Promise<void>;
  checkOutCurrentEmployee: () => Promise<void>;
  addAttendanceRecord: (record: Omit<AttendanceRecord, 'id'>) => Promise<void>;

  submitLeaveRequest: (req: { leaveType: string; startDate: string; endDate: string; days: number; reason?: string }) => Promise<void>;
  reviewLeaveRequest: (leaveId: string, status: 'Approved' | 'Rejected', comment?: string) => Promise<void>;

  addTask: (task: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTaskStatus: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;

  submitEmployeeRequest: (request: {
    requestType: EmployeeRequestType;
    subject: string;
    description: string;
    startDate?: string;
    endDate?: string;
    amount?: number;
  }) => Promise<void>;
  reviewEmployeeRequest: (requestId: string, status: EmployeeRequestStatus, comment?: string) => Promise<void>;

  setNotificationRead: (notificationId: string, isRead: boolean) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  addNotice: (notice: { title: string; content: string; priority?: 'Normal' | 'Important' | 'Urgent' }) => Promise<void>;
  deleteNotice: (noticeId: string) => Promise<void>;

  addAsset: (asset: NewAssetInput) => Promise<void>;
  updateAsset: (asset: UpdateAssetInput) => Promise<void>;
  updateAssetStatus: (assetId: string, status: 'active' | 'returned' | 'lost' | 'damaged') => Promise<void>;
  getAssetDetailAction: (assetId: string) => Promise<AssetDetail>;

  getEmployeeProfileAction: (userId?: string) => Promise<EmployeeProfileDetails>;
  saveEmployeeProfileAction: (profile: EmployeeProfileDetails, newDocuments?: EmployeeDocument[]) => Promise<void>;
  deleteEmployeeDocumentAction: (documentId: string, userId?: string) => Promise<void>;
  saveContractAction: (contract: { id?: string; employeeId: string; officeJoinDate?: string; contractDate: string; contractExpireDate: string; contractType: Contract['contractType']; status: Contract['status']; remark?: string }) => Promise<void>;

  createInvitation: (email: string, role: UserRole) => Promise<Invitation>;
  deleteInvitationAction: (invitationId: string | number) => Promise<void>;
  verifyOtpAndCompleteSignup: (
    invitationCodeOrEmail: string,
    otpCode: string,
    password: string,
    details: Partial<UserProfile>,
  ) => boolean;

  addOrganization: (org: Omit<Organization, 'id'>) => void;
  updateOrganizationStatus: (orgId: string, status: Organization['status']) => void;
  updateOrganizationPlan: (orgId: string, plan: Organization['plan']) => void;

  createCompanyAndInviteAdmin: (companyName: string, adminEmail: string) => Promise<{ code: string; companyId: number }>;
  setCompanyStatus: (companyId: number, status: 'active' | 'suspended') => Promise<void>;
  deleteCompany: (companyId: number, confirmationName: string) => Promise<void>;

  logAuditAction: (action: string, details: string) => void;
  refreshPhase2Data: () => Promise<void>;
}

const HRContext = createContext<HRContextType | undefined>(undefined);

const today = () => new Date().toISOString().split('T')[0];

export const HRProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserProfile[]>(() => getStoredData('users', INITIAL_USERS));
  const [organizations, setOrganizations] = useState<Organization[]>(() => getStoredData('orgs', INITIAL_ORGANIZATIONS));
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [employeeRequests, setEmployeeRequests] = useState<EmployeeRequest[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [assets, setAssets] = useState<AssetListItem[]>([]);
  const [employeeProfiles, setEmployeeProfiles] = useState<EmployeeProfileDetails[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>(() => getStoredData('invitations', INITIAL_INVITATIONS));
  const [salarySlips] = useState<SalarySlip[]>(INITIAL_SALARY_SLIPS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeRole, setActiveRole] = useState<UserRole>('team_member');
  const [currentUser, setCurrentUser] = useState<UserProfile>({
    id: 'unauthenticated',
    email: '',
    name: '',
    role: 'team_member',
    isActive: true,
    createdAt: '',
  });

  useEffect(() => { saveStoredData('users', users); }, [users]);
  useEffect(() => { saveStoredData('orgs', organizations); }, [organizations]);
  useEffect(() => { saveStoredData('invitations', invitations); }, [invitations]);

  const logAuditAction = useCallback((action: string, details: string) => {
    setAuditLogs(prev => [{
      id: `log-${Date.now()}`,
      action,
      doneBy: currentUser.id,
      doneByName: currentUser.name,
      role: currentUser.role,
      timestamp: new Date().toLocaleString(),
      details,
    }, ...prev.slice(0, 49)]);
  }, [currentUser.id, currentUser.name, currentUser.role]);

  const loginWithEmail = (email: string, displayNameHint?: string): UserProfile => {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      setCurrentUser(existing);
      setActiveRole(existing.role);
      return existing;
    }
    if (normalizedEmail === ADMIN_EMAIL) {
      const adminProfile: UserProfile = {
        id: 'usr-admin-owner',
        email: ADMIN_EMAIL,
        name: displayNameHint || 'Admin',
        role: 'admin',
        isActive: true,
        createdAt: today(),
      };
      setUsers(prev => [adminProfile, ...prev]);
      setCurrentUser(adminProfile);
      setActiveRole('admin');
      return adminProfile;
    }
    throw new Error('NO_ACCOUNT');
  };

  const hydrateSessionFromServer = (authUser: ServerAuthUser): UserProfile => {
    const realId = String(authUser.id);
    const existing = users.find(u => u.id === realId || u.email.toLowerCase() === authUser.email.toLowerCase());
    const profile: UserProfile = {
      ...(existing || {}),
      id: realId,
      email: authUser.email,
      name: authUser.fullName,
      role: authUser.role,
      employeeId: realId,
      employeeCode: authUser.employeeCode || existing?.employeeCode,
      designation: authUser.designation || existing?.designation,
      department: authUser.department || existing?.department,
      companyId: authUser.companyId == null ? undefined : String(authUser.companyId),
      companyName: authUser.companyName || existing?.companyName,
      isActive: true,
      createdAt: existing?.createdAt || today(),
    };
    setUsers(prev => [profile, ...prev.filter(u => u.id !== realId && u.email.toLowerCase() !== authUser.email.toLowerCase())]);
    setCurrentUser(profile);
    setActiveRole(profile.role);
    return profile;
  };

  const clearSession = () => {
    setCurrentUser({ id: 'unauthenticated', email: '', name: '', role: 'team_member', isActive: true, createdAt: '' });
    setActiveRole('team_member');
    setTasks([]);
    setEmployeeRequests([]);
    setNotifications([]);
    setAttendanceRecords([]);
  };

  const updateCurrentUserProfile = (updated: Partial<UserProfile>) => {
    setCurrentUser(prev => ({ ...prev, ...updated }));
    setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, ...updated } : u));
    logAuditAction('Profile Update', `Updated profile information for ${currentUser.name}`);
  };

  const mapAttendance = (r: Awaited<ReturnType<typeof listAttendanceApi>>['attendance'][number]): AttendanceRecord => ({
    id: String(r.id),
    employeeId: String(r.employeeId),
    employeeName: r.employeeName,
    date: r.date,
    month: r.month,
    checkIn: r.checkIn || undefined,
    checkOut: r.checkOut || undefined,
    status: r.status,
    workHours: r.workHours == null ? undefined : Number(r.workHours),
    notes: r.notes || undefined,
  });

  const mapRequest = (r: Awaited<ReturnType<typeof listEmployeeRequestsApi>>['requests'][number]): EmployeeRequest => ({
    id: String(r.id),
    employeeId: String(r.employeeId),
    employeeName: r.employeeName,
    employeeCode: r.employeeCode || undefined,
    designation: r.designation || undefined,
    requestType: r.requestType,
    subject: r.subject,
    description: r.description,
    startDate: r.startDate || undefined,
    endDate: r.endDate || undefined,
    amount: r.amount == null ? undefined : Number(r.amount),
    status: r.status,
    submittedAt: r.submittedAt,
    updatedAt: r.updatedAt,
    reviewedBy: r.reviewedBy == null ? undefined : String(r.reviewedBy),
    reviewedByName: r.reviewedByName || undefined,
    reviewComment: r.reviewComment || undefined,
  });

  const mapEmployeeProfile = (p: Awaited<ReturnType<typeof listEmployeeProfilesApi>>['profiles'][number]): EmployeeProfileDetails => ({
    userId: String(p.userId),
    employeeCode: p.employeeCode || undefined,
    employeeName: p.employeeName,
    emailAddress: p.emailAddress,
    role: p.role,
    department: p.department || undefined,
    jobTitle: p.jobTitle || undefined,
    joiningDate: p.joiningDate || undefined,
    gender: p.gender || undefined,
    maritalStatus: p.maritalStatus || undefined,
    highestQualification: p.highestQualification || undefined,
    phoneNumber: p.phoneNumber || undefined,
    permanentAddress: p.permanentAddress || undefined,
    temporaryAddress: p.temporaryAddress || undefined,
    fatherName: p.fatherName || undefined,
    motherName: p.motherName || undefined,
    citizenshipNumber: p.citizenshipNumber || undefined,
    panNumber: p.panNumber || undefined,
    bankAccountNumber: p.bankAccountNumber || undefined,
    bankNameBranch: p.bankNameBranch || undefined,
    contractDate: p.contractDate || undefined,
    contractExpireDate: p.contractExpireDate || undefined,
    emergencyContactName: p.emergencyContactName || undefined,
    emergencyRelationship: p.emergencyRelationship || undefined,
    emergencyPhone: p.emergencyPhone || undefined,
    emergencyAddress: p.emergencyAddress || undefined,
    dateOfBirth: p.dateOfBirth || undefined,
    profileCompletion: Number(p.profileCompletion || 0),
    documentCount: Number(p.documentCount || 0),
    documents: p.documents?.map(d => ({
      id: String(d.id),
      documentType: d.documentType,
      fileName: d.fileName,
      mimeType: d.mimeType,
      fileSize: Number(d.fileSize),
      data: d.data,
      createdAt: d.createdAt,
    })),
    updatedAt: p.updatedAt || undefined,
    profilePhoto: p.profilePhoto || undefined,
  });

  const mapContract = (c: Awaited<ReturnType<typeof listContractsApi>>['contracts'][number]): Contract => ({
    id: String(c.id),
    employeeId: String(c.employeeId),
    employeeName: c.employeeName,
    employeeCode: c.employeeCode || undefined,
    designation: c.designation || undefined,
    department: c.department || undefined,
    officeJoinDate: c.officeJoinDate || undefined,
    contractDate: c.contractDate,
    contractExpireDate: c.contractExpireDate,
    contractType: c.contractType,
    status: c.status,
    remark: c.remark || undefined,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    daysForNewContract: Number(c.daysForNewContract),
    workingDuration: c.workingDuration,
    progressPercent: Number(c.progressPercent),
  });

  const refreshUsers = useCallback(async () => {
    const { users: serverUsers } = await listUsersRequest();
    setUsers(prev => serverUsers.map(su => {
      const old = prev.find(p => p.id === String(su.id));
      return {
        ...(old || {}),
        id: String(su.id),
        employeeId: String(su.id),
        email: su.email,
        name: su.fullName,
        role: su.role as UserRole,
        employeeCode: su.employeeCode || old?.employeeCode,
        designation: su.designation || old?.designation,
        department: su.department || old?.department,
        companyId: su.companyId == null ? undefined : String(su.companyId),
        companyName: su.companyName || old?.companyName,
        isActive: su.status === 'active',
        createdAt: su.createdAt?.substring(0, 10) || old?.createdAt || today(),
      } as UserProfile;
    }));
  }, []);

  const refreshTasks = useCallback(async () => {
    const { tasks: rows } = await listTasksApi();
    setTasks(rows.map(t => ({
      id: String(t.id),
      title: t.title,
      notes: t.notes || '',
      status: t.status,
      assignedTo: String(t.assignedTo),
      assignedToName: t.assignedToName,
      assignedBy: String(t.assignedBy),
      assignedByName: t.assignedByName,
      dueDate: t.dueDate,
      priority: t.priority,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })));
  }, []);

  const refreshRequests = useCallback(async () => {
    const { requests } = await listEmployeeRequestsApi();
    setEmployeeRequests(requests.map(mapRequest));
  }, []);

  const refreshNotifications = useCallback(async () => {
    const { notifications: rows } = await listNotificationsApi();
    setNotifications(rows.map(n => ({
      id: String(n.id),
      title: n.title,
      message: n.message,
      type: n.type,
      entityType: n.entityType || undefined,
      entityId: n.entityId == null ? undefined : String(n.entityId),
      isRead: n.isRead,
      createdAt: n.createdAt,
      readAt: n.readAt || undefined,
    })));
  }, []);

  const refreshAttendance = useCallback(async () => {
    const { attendance } = await listAttendanceApi();
    setAttendanceRecords(attendance.map(mapAttendance));
  }, []);

  const refreshAssets = useCallback(async () => {
    const { assets: serverAssets } = await listAssetsRequest();
    setAssets(serverAssets);
  }, []);

  const refreshEmployeeProfiles = useCallback(async () => {
    const { profiles } = await listEmployeeProfilesApi();
    const mapped = profiles.map(mapEmployeeProfile);
    setEmployeeProfiles(mapped);
    setUsers(prev => prev.map(user => {
      const profile = mapped.find(item => item.userId === user.id);
      return profile ? {
        ...user,
        name: profile.employeeName,
        email: profile.emailAddress,
        employeeCode: profile.employeeCode || user.employeeCode,
        designation: profile.jobTitle || user.designation,
        department: profile.department || user.department,
        photoUrl: profile.profilePhoto || user.photoUrl,
        employeeProfile: profile,
      } : user;
    }));
  }, []);

  const refreshContracts = useCallback(async () => {
    const { contracts: rows } = await listContractsApi();
    setContracts(rows.map(mapContract));
  }, []);

  const refreshAuditLogs = useCallback(async () => {
    if (!['superadmin', 'admin', 'hr_manager'].includes(currentUser.role)) return;
    const { auditLogs: rows } = await listAuditLogsApi(100);
    setAuditLogs(rows.map(row => ({
      id: String(row.id),
      action: row.action,
      doneBy: String(row.doneBy),
      doneByName: row.doneByName,
      role: row.role,
      timestamp: row.timestamp,
      details: row.details,
      entityType: row.entityType || undefined,
      entityId: row.entityId == null ? undefined : String(row.entityId),
    })));
  }, [currentUser.role]);

  const refreshLeaveRequests = useCallback(async () => {
    const { leaveRequests: rows } = await listLeaveRequestsApi();
    setLeaveRequests(rows.map(leave => ({
      id: String(leave.id),
      employeeId: String(leave.employeeId),
      employeeName: leave.employeeName,
      designation: leave.designation || '',
      leaveType: leave.leaveType as LeaveRequest['leaveType'],
      startDate: leave.startDate,
      endDate: leave.endDate,
      days: leave.days,
      reason: leave.reason || '',
      status: leave.status,
      appliedOn: leave.appliedOn,
      reviewedBy: leave.reviewedBy || undefined,
      reviewComment: leave.reviewComment || undefined,
    })));
  }, []);

  const refreshNotices = useCallback(async () => {
    const { notices: rows } = await listNoticesApi();
    setNotices(rows.map(notice => ({
      id: String(notice.id),
      title: notice.title,
      content: notice.content,
      postedBy: String(notice.postedBy),
      postedByName: notice.postedByName,
      date: notice.date,
      priority: notice.priority,
    })));
  }, []);

  const refreshPhase2Data = useCallback(async () => {
    if (currentUser.id === 'unauthenticated') return;
    await Promise.allSettled([
      refreshUsers(),
      refreshTasks(),
      refreshRequests(),
      refreshNotifications(),
      refreshAttendance(),
      refreshAssets(),
      refreshEmployeeProfiles(),
      refreshContracts(),
      refreshAuditLogs(),
      refreshLeaveRequests(),
      refreshNotices(),
    ]);
  }, [currentUser.id, refreshAssets, refreshAttendance, refreshAuditLogs, refreshContracts, refreshEmployeeProfiles, refreshLeaveRequests, refreshNotices, refreshNotifications, refreshRequests, refreshTasks, refreshUsers]);

  useEffect(() => {
    if (currentUser.id === 'unauthenticated') return;
    refreshPhase2Data();
    const timer = window.setInterval(refreshPhase2Data, 12000);
    return () => window.clearInterval(timer);
  }, [currentUser.id, refreshPhase2Data]);


  useEffect(() => {
    if (!['admin', 'hr_manager'].includes(currentUser.role)) return;
    (async () => {
      try {
        const { invitations: rows } = await listInvitationsRequest();
        setInvitations(rows.map(inv => ({
          id: String(inv.id), email: inv.email, role: inv.role as UserRole,
          employeeId: '', companyId: currentUser.companyId || '', invitedBy: currentUser.id,
          invitedByName: currentUser.name, status: inv.status,
          createdAt: inv.createdAt?.substring(0, 10) || today(), code: inv.code,
        })));
      } catch { /* ignore */ }
    })();
  }, [currentUser.companyId, currentUser.id, currentUser.name, currentUser.role]);

  useEffect(() => {
    if (currentUser.role !== 'superadmin') return;
    (async () => {
      try { setCompanies((await listCompaniesRequest()).companies); } catch { /* ignore */ }
    })();
  }, [currentUser.id, currentUser.role]);

  const toggleUserActiveStatus = async (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;
    const nextActive = !target.isActive;
    await setUserStatusRequest(Number(userId), nextActive ? 'active' : 'inactive');
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: nextActive } : u));
    logAuditAction('User Status Toggle', `${target.name} changed to ${nextActive ? 'active' : 'inactive'}`);
  };

  const addOrUpdateEmployee = (emp: UserProfile) => {
    setUsers(prev => [emp, ...prev.filter(u => u.id !== emp.id && u.employeeId !== emp.employeeId)]);
    logAuditAction('Employee Saved', `Added or updated ${emp.name}`);
  };

  const checkInCurrentEmployee = async (notes?: string) => {
    await checkInApi(notes);
    await refreshAttendance();
    logAuditAction('Attendance Check In', `${currentUser.name} checked in`);
  };

  const checkOutCurrentEmployee = async () => {
    await checkOutApi();
    await refreshAttendance();
    logAuditAction('Attendance Check Out', `${currentUser.name} checked out`);
  };

  const addAttendanceRecord = async (record: Omit<AttendanceRecord, 'id'>) => {
    await upsertAttendanceApi({
      userId: Number(record.employeeId),
      date: record.date,
      status: record.status,
      checkIn: record.checkIn,
      checkOut: record.checkOut,
      notes: record.notes,
    });
    await refreshAttendance();
    logAuditAction('Manual Attendance', `Saved attendance for ${record.employeeName} on ${record.date}`);
  };

  const submitLeaveRequest = async (req: { leaveType: string; startDate: string; endDate: string; days: number; reason?: string }) => {
    await submitLeaveRequestApi(req);
    await Promise.all([refreshLeaveRequests(), refreshNotifications()]);
  };

  const reviewLeaveRequest = async (leaveId: string, status: 'Approved' | 'Rejected', comment?: string) => {
    await reviewLeaveRequestApi(Number(leaveId), status, comment);
    await Promise.all([refreshLeaveRequests(), refreshNotifications()]);
  };

  const addTask = async (task: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!['admin', 'hr_manager'].includes(currentUser.role)) throw new Error('Only Admin or HR can create tasks.');
    await createTaskApi({
      title: task.title,
      notes: task.notes,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      assignedToUserId: Number(task.assignedTo),
    });
    await Promise.all([refreshTasks(), refreshNotifications()]);
    logAuditAction('Task Created', `${task.title} assigned to ${task.assignedToName}`);
  };

  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    await updateTaskStatusApi(Number(taskId), newStatus);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t));
    await refreshNotifications();
  };

  const deleteTask = async (taskId: string) => {
    if (!['admin', 'hr_manager'].includes(currentUser.role)) throw new Error('Only Admin or HR can delete tasks.');
    await deleteTaskApi(Number(taskId));
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const submitEmployeeRequest = async (request: {
    requestType: EmployeeRequestType;
    subject: string;
    description: string;
    startDate?: string;
    endDate?: string;
    amount?: number;
  }) => {
    await submitEmployeeRequestApi(request);
    await Promise.all([refreshRequests(), refreshNotifications()]);
  };

  const reviewEmployeeRequest = async (requestId: string, status: EmployeeRequestStatus, comment?: string) => {
    await reviewEmployeeRequestApi({ requestId: Number(requestId), status, comment });
    await Promise.all([refreshRequests(), refreshNotifications()]);
  };

  const setNotificationRead = async (notificationId: string, isRead: boolean) => {
    await setNotificationReadApi(Number(notificationId), isRead);
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead, readAt: isRead ? new Date().toISOString() : undefined } : n));
  };

  const markAllNotificationsRead = async () => {
    if (!notifications.some(n => !n.isRead)) return;
    await markAllNotificationsReadApi();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true, readAt: n.readAt || new Date().toISOString() })));
  };

  const addNotice = async (notice: { title: string; content: string; priority?: 'Normal' | 'Important' | 'Urgent' }) => {
    await createNoticeApi(notice);
    await Promise.all([refreshNotices(), refreshNotifications()]);
  };

  const deleteNotice = async (noticeId: string) => {
    await deleteNoticeApi(Number(noticeId));
    setNotices(prev => prev.filter(n => n.id !== noticeId));
  };

  const addAsset = async (asset: NewAssetInput) => { await createAssetRequest(asset); await refreshAssets(); };
  const updateAsset = async (asset: UpdateAssetInput) => { await updateAssetRequest(asset); await refreshAssets(); };
  const updateAssetStatus = async (assetId: string, status: 'active' | 'returned' | 'lost' | 'damaged') => {
    await updateAssetStatusApi(Number(assetId), status);
    setAssets(prev => prev.map(a => a.id === Number(assetId) ? { ...a, status } : a));
  };
  const getAssetDetailAction = async (assetId: string) => (await getAssetDetailRequest(Number(assetId))).asset;

  const getEmployeeProfileAction = async (userId?: string): Promise<EmployeeProfileDetails> => {
    const { profile } = await getEmployeeProfileApi(userId ? Number(userId) : undefined);
    return mapEmployeeProfile(profile);
  };

  const saveEmployeeProfileAction = async (profile: EmployeeProfileDetails, newDocuments: EmployeeDocument[] = []) => {
    const payload: SaveEmployeeProfileInput = {
      userId: Number(profile.userId),
      employeeCode: profile.employeeCode,
      employeeName: profile.employeeName,
      emailAddress: profile.emailAddress,
      department: profile.department,
      jobTitle: profile.jobTitle,
      joiningDate: profile.joiningDate,
      gender: profile.gender,
      maritalStatus: profile.maritalStatus,
      highestQualification: profile.highestQualification,
      phoneNumber: profile.phoneNumber,
      permanentAddress: profile.permanentAddress,
      temporaryAddress: profile.temporaryAddress,
      fatherName: profile.fatherName,
      motherName: profile.motherName,
      citizenshipNumber: profile.citizenshipNumber,
      panNumber: profile.panNumber,
      bankAccountNumber: profile.bankAccountNumber,
      bankNameBranch: profile.bankNameBranch,
      contractDate: profile.contractDate,
      contractExpireDate: profile.contractExpireDate,
      emergencyContactName: profile.emergencyContactName,
      emergencyRelationship: profile.emergencyRelationship,
      emergencyPhone: profile.emergencyPhone,
      emergencyAddress: profile.emergencyAddress,
      dateOfBirth: profile.dateOfBirth,
      profilePhoto: profile.profilePhoto,
      documents: newDocuments.filter(doc => !!doc.data).map(doc => ({
        documentType: doc.documentType,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        data: doc.data as string,
      })),
    };
    const { profile: saved } = await saveEmployeeProfileApi(payload);
    const mapped = mapEmployeeProfile(saved);
    await Promise.allSettled([refreshUsers(), refreshEmployeeProfiles(), refreshContracts(), refreshAuditLogs()]);
    if (mapped.userId === currentUser.id) {
      setCurrentUser(prev => ({
        ...prev,
        name: mapped.employeeName,
        email: mapped.emailAddress,
        employeeCode: mapped.employeeCode || prev.employeeCode,
        designation: mapped.jobTitle || prev.designation,
        department: mapped.department || prev.department,
        photoUrl: mapped.profilePhoto || prev.photoUrl,
        employeeProfile: mapped,
      }));
    }
  };

  const deleteEmployeeDocumentAction = async (documentId: string, userId?: string) => {
    await deleteEmployeeDocumentApi(Number(documentId));
    await Promise.allSettled([refreshEmployeeProfiles(), refreshAuditLogs()]);
    if (userId && userId === currentUser.id) {
      const refreshed = await getEmployeeProfileAction(userId);
      setCurrentUser(prev => ({ ...prev, employeeProfile: refreshed }));
    }
  };

  const saveContractAction = async (contract: { id?: string; employeeId: string; officeJoinDate?: string; contractDate: string; contractExpireDate: string; contractType: Contract['contractType']; status: Contract['status']; remark?: string }) => {
    await saveContractApi({
      contractId: contract.id ? Number(contract.id) : undefined,
      userId: Number(contract.employeeId),
      officeJoinDate: contract.officeJoinDate,
      contractDate: contract.contractDate,
      contractExpireDate: contract.contractExpireDate,
      contractType: contract.contractType,
      status: contract.status,
      remark: contract.remark,
    });
    await Promise.allSettled([refreshContracts(), refreshEmployeeProfiles(), refreshNotifications(), refreshAuditLogs()]);
  };

  const createInvitation = async (email: string, role: UserRole): Promise<Invitation> => {
    const result = await createInvitationRequest(email, role);
    const invitation: Invitation = {
      id: `inv-${Date.now()}`, email, role, employeeId: '', companyId: currentUser.companyId || '',
      invitedBy: currentUser.id, invitedByName: currentUser.name, status: 'Pending', createdAt: today(), code: result.code,
    };
    setInvitations(prev => [invitation, ...prev]);
    return invitation;
  };

  const deleteInvitationAction = async (invitationId: string | number) => {
    const numericId = Number(invitationId);
    if (!Number.isFinite(numericId) || numericId <= 0) throw new Error('Invalid invitation ID.');
    await deleteInvitationRequest(numericId);
    setInvitations(prev => prev.filter(i => Number(i.id) !== numericId));
  };

  const verifyOtpAndCompleteSignup = (
    invitationCodeOrEmail: string,
    otpCode: string,
    _password: string,
    details: Partial<UserProfile>,
  ): boolean => {
    if (!otpCode || otpCode.length < 4) return false;
    const matched = invitations.find(i => i.code.toLowerCase() === invitationCodeOrEmail.toLowerCase() || i.email.toLowerCase() === invitationCodeOrEmail.toLowerCase());
    if (!matched) return false;
    const profile: UserProfile = {
      id: `usr-${Date.now()}`, email: details.email || matched.email, name: details.name || 'Employee',
      role: matched.role, employeeId: details.employeeId || '', employeeCode: details.employeeCode,
      designation: details.designation, department: details.department, companyId: matched.companyId,
      isActive: true, createdAt: today(),
    };
    setUsers(prev => [profile, ...prev]);
    setInvitations(prev => prev.map(i => i.id === matched.id ? { ...i, status: 'Accepted' } : i));
    setCurrentUser(profile);
    setActiveRole(profile.role);
    return true;
  };

  const addOrganization = (org: Omit<Organization, 'id'>) => setOrganizations(prev => [{ ...org, id: `org-${Date.now()}` }, ...prev]);
  const updateOrganizationStatus = (orgId: string, status: Organization['status']) => setOrganizations(prev => prev.map(o => o.id === orgId ? { ...o, status } : o));
  const updateOrganizationPlan = (orgId: string, plan: Organization['plan']) => setOrganizations(prev => prev.map(o => o.id === orgId ? { ...o, plan } : o));

  const createCompanyAndInviteAdmin = async (companyName: string, adminEmail: string) => {
    const result = await createCompanyInviteRequest(companyName, adminEmail);
    try { setCompanies((await listCompaniesRequest()).companies); } catch { /* ignore */ }
    return { code: result.code, companyId: result.companyId };
  };

  const setCompanyStatus = async (companyId: number, status: 'active' | 'suspended') => {
    await updateCompanyStatusRequest(companyId, status);
    setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, status } : c));
  };


  const deleteCompany = async (companyId: number, confirmationName: string) => {
    await deleteCompanyRequest(companyId, confirmationName);
    setCompanies(prev => prev.filter(c => c.id !== companyId));
  };

  const unreadNotificationCount = notifications.filter(n => !n.isRead).length;

  return (
    <HRContext.Provider value={{
      currentUser, activeRole, loginWithEmail, hydrateSessionFromServer, clearSession, updateCurrentUserProfile,
      users, organizations, attendanceRecords, leaveRequests, tasks, employeeRequests, notifications,
      unreadNotificationCount, notices, assets, employeeProfiles, contracts, invitations, salarySlips, auditLogs,
      companies,
      toggleUserActiveStatus, addOrUpdateEmployee,
      checkInCurrentEmployee, checkOutCurrentEmployee, addAttendanceRecord,
      submitLeaveRequest, reviewLeaveRequest,
      addTask, updateTaskStatus, deleteTask,
      submitEmployeeRequest, reviewEmployeeRequest,
      setNotificationRead, markAllNotificationsRead,
      addNotice, deleteNotice,
      addAsset, updateAsset, updateAssetStatus, getAssetDetailAction,
      getEmployeeProfileAction, saveEmployeeProfileAction, deleteEmployeeDocumentAction, saveContractAction,
      createInvitation, deleteInvitationAction, verifyOtpAndCompleteSignup,
      addOrganization, updateOrganizationStatus, updateOrganizationPlan,
      createCompanyAndInviteAdmin, setCompanyStatus, deleteCompany,
      logAuditAction, refreshPhase2Data,
    }}>
      {children}
    </HRContext.Provider>
  );
};

export const useHR = () => {
  const context = useContext(HRContext);
  if (!context) throw new Error('useHR must be used within an HRProvider');
  return context;
};
