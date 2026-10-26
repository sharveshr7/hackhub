import { db, auth } from '../lib/firebase';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { Registration, Student, Admin, RegistrationStatus, AuditLog } from '../types';
import { analyticsService } from './analyticsService';
import { useAppStore } from '../lib/store';
import { isPlatformAdministrator } from '../utils/access';
import {
  isSupportedDepartment,
  isValidSpecialization,
  sanitizeCustomSpecialization,
  SUPPORTED_ACADEMIC_YEARS,
  normalizeAcademicYear
} from '../constants/departments';

export const adminService = {
  getAdminOverviewStats: analyticsService.getAdminOverviewStats.bind(analyticsService),
  getAnalyticsData: analyticsService.getAnalyticsData.bind(analyticsService),

  async getAllRegistrations(): Promise<Registration[]> {
    const currentUser = useAppStore.getState().currentUser;
    if (!currentUser || !['ADMIN', 'FACULTY'].includes(currentUser.role)) throw new Error('Authorized staff access is required.');
    const authorizedYears = (currentUser.adminData?.authorizedYears || []).map(normalizeAcademicYear).filter(Boolean) as string[];
    const q = isPlatformAdministrator(currentUser)
      ? collection(db, 'registrations')
      : query(
          collection(db, 'registrations'),
          where('department', '==', currentUser.adminData?.department || ''),
          ...(authorizedYears.length ? [where('academicYear', 'in', authorizedYears.slice(0, 10))] : [])
        );
    const snap = await getDocs(q);
    const registrations = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Registration));
    useAppStore.setState({ registrations });
    return registrations;
  },

  async updateRegistrationStatus(id: string, status: RegistrationStatus): Promise<void> {
    await updateDoc(doc(db, 'registrations', id), {
      status,
      updatedAt: serverTimestamp()
    });
    useAppStore.getState().updateRegistrationStatus(id, status);
  },

  async getAllStudents(): Promise<Student[]> {
    const currentUser = useAppStore.getState().currentUser;
    if (!currentUser || !['ADMIN', 'FACULTY'].includes(currentUser.role)) throw new Error('Authorized staff access is required.');
    const authorizedYears = (currentUser.adminData?.authorizedYears || []).map(normalizeAcademicYear).filter(Boolean) as string[];
    const q = isPlatformAdministrator(currentUser)
      ? collection(db, 'students')
      : query(
          collection(db, 'students'),
          where('department', '==', currentUser.adminData?.department || ''),
          ...(authorizedYears.length ? [where('year', 'in', authorizedYears.slice(0, 10))] : [])
        );
    const snap = await getDocs(q);
    const students = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as Student));
    useAppStore.setState({ students });
    return students;
  },

  async toggleStudentAccountStatus(studentId: string, status: 'active' | 'disabled'): Promise<void> {
    const currentUser = useAppStore.getState().currentUser;
    const student = useAppStore.getState().students.find((entry) => entry.uid === studentId);
    if (!currentUser || !['ADMIN', 'FACULTY'].includes(currentUser.role) || !student) {
      throw new Error('Authorized access to this student record is required.');
    }
    if (!isPlatformAdministrator(currentUser) && student.department !== currentUser.adminData?.department) {
      throw new Error('You can manage accounts only in your authorized department.');
    }
    await updateDoc(doc(db, 'students', studentId), {
      accountStatus: status,
      isActive: status === 'active',
      updatedAt: serverTimestamp()
    });
    useAppStore.getState().updateStudent(studentId, {
      accountStatus: status,
      isActive: status === 'active'
    } as any);
  },

  async getAllAdmins(): Promise<Admin[]> {
    const currentUser = useAppStore.getState().currentUser;
    if (!currentUser || !['ADMIN', 'FACULTY'].includes(currentUser.role)) throw new Error('Authorized staff access is required.');
    const q = isPlatformAdministrator(currentUser)
      ? collection(db, 'admins')
      : query(collection(db, 'admins'), where('department', '==', currentUser.adminData?.department || ''));
    const snap = await getDocs(q);
    const admins = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as Admin));
    useAppStore.setState({ admins });
    return admins;
  },

  /**
   * Provision a verified student account (Authorized Department Administrator only)
   * Creates Firebase Auth user, Firestore profile in students/{uid}, reg_lookups/{regNo},
   * dispatches password reset setup email, and writes to audit_logs.
   */
  async provisionStudent(studentInfo: {
    name: string;
    registerNumber: string;
    email: string;
    department: string;
    year: string;
    phone?: string;
  }): Promise<{ uid: string; email: string; registerNumber: string }> {
    const currentUser = useAppStore.getState().currentUser;
    if (!currentUser || !['ADMIN', 'FACULTY'].includes(currentUser.role)) {
      throw new Error('Unauthorized: Only authorized administrators can provision student accounts.');
    }

    if (!auth.currentUser || auth.currentUser.uid !== currentUser.uid) {
      throw new Error('Your authenticated staff session could not be verified. Sign in again and retry.');
    }
    if (!studentInfo.department || !studentInfo.year) {
      throw new Error('Select both a department and academic year.');
    }
    if (!isSupportedDepartment(studentInfo.department) || !SUPPORTED_ACADEMIC_YEARS.includes(normalizeAcademicYear(studentInfo.year) as any)) {
      throw new Error('Select a supported department and academic year.');
    }

    const idToken = await auth.currentUser.getIdToken();
    const response = await fetch('/api/student-auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({
        action: 'provision-student',
        name: studentInfo.name,
        registerNumber: studentInfo.registerNumber,
        email: studentInfo.email,
        department: studentInfo.department,
        year: normalizeAcademicYear(studentInfo.year),
        phone: studentInfo.phone || ''
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result?.success) {
      throw new Error(result?.error || 'Student provisioning failed. No account was reported as created.');
    }
    return { uid: result.uid, email: result.email, registerNumber: result.registerNumber };
  },

  /**
   * Bulk import students from spreadsheet/CSV records
   */
  async bulkImportStudents(students: Array<{
    name: string;
    registerNumber: string;
    email: string;
    department: string;
    year: string;
    phone?: string;
  }>): Promise<{
    success: boolean;
    summary: { total: number; succeeded: number; failed: number; duplicates: number };
    results: Array<{
      row: number;
      name: string;
      email: string;
      registerNumber: string;
      status: 'success' | 'failed' | 'duplicate';
      reason?: string;
    }>;
  }> {
    const currentUser = useAppStore.getState().currentUser;
    if (!currentUser || !['ADMIN', 'FACULTY'].includes(currentUser.role)) {
      throw new Error('Unauthorized: Only authorized administrators can import student accounts.');
    }

    if (!auth.currentUser || auth.currentUser.uid !== currentUser.uid) {
      throw new Error('Your authenticated staff session could not be verified. Sign in again and retry.');
    }

    const idToken = await auth.currentUser.getIdToken();
    const response = await fetch('/api/student-auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({
        action: 'bulk-import-students',
        students
      })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result?.success) {
      throw new Error(result?.error || 'Bulk student import failed.');
    }
    return result;
  },

  /**
   * Approve a pending faculty coordinator application (Designated Department Approver only)
   */
  async approveFacultyAdmin(
    adminId: string,
    approverName: string,
    initialPermissions?: { authorizedYears?: string[]; authorizedClasses?: string[] }
  ): Promise<void> {
    const currentUser = useAppStore.getState().currentUser;
    const isDeptApprover = currentUser?.adminData?.isDepartmentApprover === true;
    const approverDept = currentUser?.adminData?.department;

    if (!currentUser || !isDeptApprover || !approverDept) {
      throw new Error('Unauthorized: Only an authorized Department Approver can approve faculty applications for their department.');
    }

    if (currentUser.uid === adminId) {
      throw new Error('Self-approval violation: Administrators cannot approve their own application.');
    }

    const adminDocRef = doc(db, 'admins', adminId);
    const adminSnap = await getDoc(adminDocRef);
    if (!adminSnap.exists()) {
      throw new Error('Administrator record not found.');
    }

    const targetAdminData = adminSnap.data() as Admin;
    if (targetAdminData.approvalStatus === 'APPROVED') {
      throw new Error('This administrator is already approved.');
    }

    if (targetAdminData.department !== approverDept) {
      throw new Error(
        `Department boundary error: As the ${approverDept} approver, you cannot approve applicants from ${targetAdminData.department || 'other departments'}.`
      );
    }

    const cleanYears = initialPermissions?.authorizedYears
      ? (initialPermissions.authorizedYears.map(normalizeAcademicYear).filter(Boolean) as string[])
      : (targetAdminData.authorizedYears || []);

    const updatePayload: any = {
      approvalStatus: 'APPROVED',
      approvedAt: serverTimestamp(),
      approvedBy: approverName,
      approvedByUid: currentUser.uid,
      isActive: true,
      updatedAt: serverTimestamp()
    };

    if (cleanYears.length > 0) {
      updatePayload.authorizedYears = cleanYears;
    }
    if (initialPermissions?.authorizedClasses) {
      updatePayload.authorizedClasses = initialPermissions.authorizedClasses;
    }

    await updateDoc(adminDocRef, updatePayload);

    // Write immutable audit log
    const auditLogRef = doc(collection(db, 'audit_logs'));
    const auditLogData: AuditLog = {
      id: auditLogRef.id,
      actorUid: currentUser.uid,
      actorEmail: currentUser.email,
      actorName: approverName,
      actorRole: 'DEPT_APPROVER',
      targetUid: adminId,
      targetEmail: targetAdminData.email,
      targetName: targetAdminData.name,
      action: 'ADMIN_APPROVED',
      previousStatus: targetAdminData.approvalStatus || 'PENDING',
      newStatus: 'APPROVED',
      timestamp: serverTimestamp(),
      details: {
        department: targetAdminData.department,
        designation: targetAdminData.designation,
        facultyId: targetAdminData.facultyId,
        authorizedYears: cleanYears
      }
    };
    await setDoc(auditLogRef, auditLogData);
    useAppStore.getState().addAuditLog(auditLogData);

    // Update in-memory store
    const currentAdmins = useAppStore.getState().admins;
    useAppStore.setState({
      admins: currentAdmins.map((a) =>
        a.uid === adminId
          ? {
              ...a,
              approvalStatus: 'APPROVED',
              approvedBy: approverName,
              approvedAt: new Date().toISOString(),
              role: 'FACULTY',
              isActive: true,
              authorizedYears: cleanYears.length > 0 ? cleanYears : a.authorizedYears,
              authorizedClasses: initialPermissions?.authorizedClasses || a.authorizedClasses
            }
          : a
      )
    });
  },

  /**
   * Reject a pending faculty coordinator application (Department Approver only)
   */
  async rejectFacultyAdmin(adminId: string, reason?: string): Promise<void> {
    const currentUser = useAppStore.getState().currentUser;
    const isDeptApprover = currentUser?.adminData?.isDepartmentApprover === true;
    const approverDept = currentUser?.adminData?.department;

    if (!currentUser || !isDeptApprover || !approverDept) {
      throw new Error('Unauthorized: Only an authorized Department Approver can decline faculty applications for their department.');
    }

    if (currentUser.uid === adminId) {
      throw new Error('Invalid operation: Users cannot decline their own account.');
    }

    const adminDocRef = doc(db, 'admins', adminId);
    const adminSnap = await getDoc(adminDocRef);
    if (!adminSnap.exists()) {
      throw new Error('Administrator record not found.');
    }

    const targetAdminData = adminSnap.data() as Admin;

    if (targetAdminData.department !== approverDept) {
      throw new Error(
        `Department boundary error: As the ${approverDept} approver, you cannot decline applicants from ${targetAdminData.department || 'other departments'}.`
      );
    }

    await updateDoc(adminDocRef, {
      approvalStatus: 'REJECTED',
      reviewedByUid: currentUser.uid,
      rejectionReason: reason || 'Not approved by department administration.',
      rejectedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Write immutable audit log
    const auditLogRef = doc(collection(db, 'audit_logs'));
    const auditLogData: AuditLog = {
      id: auditLogRef.id,
      actorUid: currentUser.uid,
      actorEmail: currentUser.email,
      actorName: currentUser.adminData?.name || 'Department Administrator',
      actorRole: 'DEPT_APPROVER',
      targetUid: adminId,
      targetEmail: targetAdminData.email,
      targetName: targetAdminData.name,
      action: 'ADMIN_REJECTED',
      previousStatus: targetAdminData.approvalStatus || 'PENDING',
      newStatus: 'REJECTED',
      timestamp: serverTimestamp(),
      details: {
        reason: reason || 'Application rejected by Department Approver',
        department: targetAdminData.department
      }
    };
    await setDoc(auditLogRef, auditLogData);
    useAppStore.getState().addAuditLog(auditLogData);

    // Update in-memory store
    const currentAdmins = useAppStore.getState().admins;
    useAppStore.setState({
      admins: currentAdmins.map((a) =>
        a.uid === adminId
          ? { ...a, approvalStatus: 'REJECTED' }
          : a
      )
    });
  },

  /**
   * Deactivate an administrator's access (Department Administrator only)
   */
  async deactivateAdmin(adminId: string): Promise<void> {
    const currentUser = useAppStore.getState().currentUser;
    if (!currentUser || !isPlatformAdministrator(currentUser)) {
      throw new Error('Unauthorized: Only a platform administrator can manage staff account access.');
    }

    if (currentUser.uid === adminId) {
      throw new Error('Invalid operation: Administrators cannot deactivate their own account.');
    }

    const adminDocRef = doc(db, 'admins', adminId);
    const currentAdmins = useAppStore.getState().admins;
    let target = currentAdmins.find((a) => a.uid === adminId);
    if (!target) {
      const snap = await getDoc(adminDocRef);
      if (snap.exists()) {
        target = snap.data() as Admin;
      }
    }

    if (!target) {
      throw new Error('Administrator record not found.');
    }

    await updateDoc(adminDocRef, {
      isActive: false,
      accountStatus: 'deactivated',
      deactivatedAt: serverTimestamp(),
      deactivatedByUid: currentUser.uid,
      updatedAt: serverTimestamp()
    });

    // Write audit log
    const auditLogRef = doc(collection(db, 'audit_logs'));
    const auditLogData: AuditLog = {
      id: auditLogRef.id,
      actorUid: currentUser.uid,
      actorEmail: currentUser.email,
      actorName: currentUser.adminData?.name || 'Department Administrator',
      actorRole: 'ADMIN',
      targetUid: adminId,
      targetEmail: target?.email,
      targetName: target?.name,
      action: 'ADMIN_DEACTIVATED',
      timestamp: serverTimestamp()
    };
    await setDoc(auditLogRef, auditLogData);
    useAppStore.getState().addAuditLog(auditLogData);

    useAppStore.setState({
      admins: currentAdmins.map((a) =>
        a.uid === adminId ? { ...a, isActive: false, accountStatus: 'deactivated' as any } : a
      )
    });
  },

  /**
   * Reactivate a deactivated administrator's access (Department Administrator only)
   */
  async reactivateAdmin(adminId: string): Promise<void> {
    const currentUser = useAppStore.getState().currentUser;
    if (!currentUser || !isPlatformAdministrator(currentUser)) {
      throw new Error('Unauthorized: Only a platform administrator can manage staff account access.');
    }

    const currentAdmins = useAppStore.getState().admins;
    const target = currentAdmins.find((a) => a.uid === adminId);
    if (!target) {
      throw new Error('Administrator record not found.');
    }

    const adminDocRef = doc(db, 'admins', adminId);
    await updateDoc(adminDocRef, {
      isActive: true,
      accountStatus: 'active',
      reactivatedAt: serverTimestamp(),
      reactivatedByUid: currentUser.uid,
      updatedAt: serverTimestamp()
    });

    // Write audit log
    const auditLogRef = doc(collection(db, 'audit_logs'));
    const auditLogData: AuditLog = {
      id: auditLogRef.id,
      actorUid: currentUser.uid,
      actorEmail: currentUser.email,
      actorName: currentUser.adminData?.name || 'Department Administrator',
      actorRole: 'ADMIN',
      targetUid: adminId,
      targetEmail: target?.email,
      targetName: target?.name,
      action: 'ADMIN_REACTIVATED',
      timestamp: serverTimestamp()
    };
    await setDoc(auditLogRef, auditLogData);
    useAppStore.getState().addAuditLog(auditLogData);

    useAppStore.setState({
      admins: currentAdmins.map((a) =>
        a.uid === adminId ? { ...a, isActive: true, accountStatus: 'active' as any } : a
      )
    });
  },

  /**
   * Designate or revoke Department Approver status for an approved faculty member (Department Administrator only)
   */
  async toggleDepartmentApprover(adminId: string, isApprover: boolean): Promise<void> {
    const currentUser = useAppStore.getState().currentUser;
    if (!currentUser || !isPlatformAdministrator(currentUser)) {
      throw new Error('Unauthorized: Only a platform administrator can designate department approvers.');
    }

    if (currentUser.uid === adminId) {
      throw new Error('Self-assignment violation: Administrators cannot alter their own approver status.');
    }

    const currentAdmins = useAppStore.getState().admins;
    const target = currentAdmins.find((a) => a.uid === adminId);
    if (!target) {
      throw new Error('Administrator record not found.');
    }

    if (target.approvalStatus !== 'APPROVED') {
      throw new Error('Only approved faculty members can be designated as Department Approvers.');
    }

    const adminDocRef = doc(db, 'admins', adminId);
    // Write audit log
    const auditLogRef = doc(collection(db, 'audit_logs'));
    const auditLogData: AuditLog = {
      id: auditLogRef.id,
      actorUid: currentUser.uid,
      actorEmail: currentUser.email,
      actorName: currentUser.adminData?.name || 'Department Administrator',
      actorRole: 'ADMIN',
      targetUid: adminId,
      targetEmail: target.email,
      targetName: target.name,
      action: isApprover ? 'DEPT_APPROVER_DESIGNATED' : 'DEPT_APPROVER_REVOKED',
      timestamp: serverTimestamp(),
      details: {
        department: target.department,
        isDepartmentApprover: isApprover
      }
    };
    const batch = writeBatch(db);
    batch.update(adminDocRef, {
      isDepartmentApprover: isApprover,
      departmentApproverScope: isApprover ? target.department : null,
      updatedAt: serverTimestamp()
    });
    batch.set(auditLogRef, auditLogData);
    await batch.commit();
    useAppStore.getState().addAuditLog(auditLogData);

    useAppStore.setState({
      admins: currentAdmins.map((a) =>
        a.uid === adminId
          ? {
              ...a,
              isDepartmentApprover: isApprover,
              departmentApproverScope: isApprover ? target.department : undefined
            }
          : a
      )
    });
  },

  /**
   * Update Faculty/Admin profile details (self-service for faculty or administrative edit by department administrator)
   * Enforces that users cannot modify their own department, role, approvalStatus, or authorized academic scope.
   */
  async updateAdminProfile(
    adminId: string,
    updates: {
      name: string;
      designation?: string;
      phone?: string;
      researchSpecialization?: string;
      customSpecialization?: string;
      researchInterests?: string[];
    }
  ): Promise<void> {
    const currentUser = useAppStore.getState().currentUser;
    if (!currentUser) {
      throw new Error('Authentication required.');
    }

    const isSelf = currentUser.uid === adminId;

    const adminDocRef = doc(db, 'admins', adminId);
    const adminSnap = await getDoc(adminDocRef);
    if (!adminSnap.exists()) {
      throw new Error('Administrator record not found.');
    }
    const currentData = adminSnap.data() as Admin;

    if (!isSelf) {
      if (!isPlatformAdministrator(currentUser)) {
        throw new Error('Unauthorized: Only a platform administrator can edit another staff profile.');
      }
    }

    const cleanName = updates.name.trim();
    if (!cleanName) {
      throw new Error('Administrator name cannot be empty.');
    }

    const docUpdates: any = {
      name: cleanName,
      updatedAt: serverTimestamp()
    };

    if (updates.designation !== undefined) {
      docUpdates.designation = updates.designation.trim();
    }
    if (updates.phone !== undefined) {
      docUpdates.phone = updates.phone.trim();
    }

    // Dynamic Research Specialization Validation
    if (updates.researchSpecialization !== undefined) {
      const cleanSpec = updates.researchSpecialization.trim();
      if (cleanSpec) {
        if (!isValidSpecialization(currentData.department, cleanSpec)) {
          throw new Error(`Specialization "${cleanSpec}" is not valid for department "${currentData.department}".`);
        }
        docUpdates.researchSpecialization = cleanSpec;

        if (cleanSpec === 'Other') {
          const sanitizedCustom = sanitizeCustomSpecialization(updates.customSpecialization || '');
          if (!sanitizedCustom || sanitizedCustom.length < 3) {
            throw new Error('Please provide a specific custom research specialization (at least 3 characters).');
          }
          docUpdates.customSpecialization = sanitizedCustom;
        } else {
          docUpdates.customSpecialization = null;
        }
      } else {
        docUpdates.researchSpecialization = null;
        docUpdates.customSpecialization = null;
      }
    }

    if (updates.researchInterests !== undefined) {
      docUpdates.researchInterests = updates.researchInterests;
    }

    await updateDoc(adminDocRef, docUpdates);

    // Update in-memory store
    const currentAdmins = useAppStore.getState().admins;
    useAppStore.setState({
      admins: currentAdmins.map((a) =>
        a.uid === adminId
          ? {
              ...a,
              name: cleanName,
              designation: docUpdates.designation !== undefined ? docUpdates.designation : a.designation,
              phone: docUpdates.phone !== undefined ? docUpdates.phone : a.phone,
              researchSpecialization: docUpdates.researchSpecialization !== undefined ? docUpdates.researchSpecialization : a.researchSpecialization,
              customSpecialization: docUpdates.customSpecialization !== undefined ? docUpdates.customSpecialization : a.customSpecialization,
              researchInterests: docUpdates.researchInterests !== undefined ? docUpdates.researchInterests : a.researchInterests
            }
          : a
      )
    });

    if (isSelf && currentUser.adminData) {
      useAppStore.setState({
        currentUser: {
          ...currentUser,
          adminData: {
            ...currentUser.adminData,
            name: cleanName,
            designation: docUpdates.designation !== undefined ? docUpdates.designation : currentUser.adminData.designation,
            phone: docUpdates.phone !== undefined ? docUpdates.phone : currentUser.adminData.phone,
            researchSpecialization: docUpdates.researchSpecialization !== undefined ? docUpdates.researchSpecialization : currentUser.adminData.researchSpecialization,
            customSpecialization: docUpdates.customSpecialization !== undefined ? docUpdates.customSpecialization : currentUser.adminData.customSpecialization,
            researchInterests: docUpdates.researchInterests !== undefined ? docUpdates.researchInterests : currentUser.adminData.researchInterests
          }
        }
      });
    }
  },

  /**
   * Assign or update faculty authorized academic years and classes (Department Administrator only)
   */
  async updateFacultyPermissions(
    adminId: string,
    permissions: {
      authorizedYears?: string[];
      authorizedClasses?: string[];
      department?: string;
    }
  ): Promise<void> {
    const currentUser = useAppStore.getState().currentUser;
    if (!currentUser || !isPlatformAdministrator(currentUser)) {
      throw new Error('Unauthorized: Only a platform administrator can assign faculty academic scope.');
    }

    if (currentUser.uid === adminId) {
      throw new Error('Self-assignment violation: Administrators cannot assign their own academic scope.');
    }

    const adminDocRef = doc(db, 'admins', adminId);
    const adminSnap = await getDoc(adminDocRef);
    if (!adminSnap.exists()) {
      throw new Error('Administrator record not found.');
    }
    const targetData = adminSnap.data() as Admin;

    const docUpdates: any = {
      updatedAt: serverTimestamp()
    };

    if (permissions.department !== undefined) {
      if (!isSupportedDepartment(permissions.department)) {
        throw new Error(`Invalid department "${permissions.department}".`);
      }
      docUpdates.department = permissions.department;
      // If department changed, clear incompatible specialization
      if (targetData.researchSpecialization && !isValidSpecialization(permissions.department, targetData.researchSpecialization)) {
        docUpdates.researchSpecialization = null;
        docUpdates.customSpecialization = null;
      }
    }

    if (permissions.authorizedYears !== undefined) {
      const cleanYears = permissions.authorizedYears
        .map(normalizeAcademicYear)
        .filter(Boolean) as string[];
      docUpdates.authorizedYears = cleanYears;
    }

    if (permissions.authorizedClasses !== undefined) {
      docUpdates.authorizedClasses = permissions.authorizedClasses;
    }

    await updateDoc(adminDocRef, docUpdates);

    // Write audit log
    const auditLogRef = doc(collection(db, 'audit_logs'));
    const auditLogData: AuditLog = {
      id: auditLogRef.id,
      actorUid: currentUser.uid,
      actorEmail: currentUser.email,
      actorName: currentUser.adminData?.name || 'Department Administrator',
      actorRole: 'ADMIN',
      targetUid: adminId,
      targetEmail: targetData.email,
      targetName: targetData.name,
      action: 'FACULTY_PERMISSIONS_UPDATED',
      timestamp: serverTimestamp(),
      details: {
        department: docUpdates.department || targetData.department,
        authorizedYears: docUpdates.authorizedYears,
        authorizedClasses: docUpdates.authorizedClasses
      }
    };
    await setDoc(auditLogRef, auditLogData);
    useAppStore.getState().addAuditLog(auditLogData);

    // Update in-memory store
    const currentAdmins = useAppStore.getState().admins;
    useAppStore.setState({
      admins: currentAdmins.map((a) =>
        a.uid === adminId
          ? {
              ...a,
              ...docUpdates
            }
          : a
      )
    });
  },

  /**
   * Fetch complete immutable audit trail (Authorized Administrator only)
   */
  async getAllAuditLogs(): Promise<AuditLog[]> {
    try {
      const auditQuery = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(auditQuery);
      const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLog));
      useAppStore.getState().setAuditLogs(logs);
      return logs;
    } catch (err: any) {
      console.warn('[AdminService] Fallback audit log fetch:', err.message);
      const snap = await getDocs(collection(db, 'audit_logs'));
      const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLog));
      useAppStore.getState().setAuditLogs(logs);
      return logs;
    }
  },

};
