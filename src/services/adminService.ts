import { db, firebaseConfig } from '../lib/firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
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
  serverTimestamp
} from 'firebase/firestore';
import { Registration, Student, Admin, RegistrationStatus, AuditLog } from '../types';
import { analyticsService } from './analyticsService';
import { useAppStore } from '../lib/store';
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
    const snap = await getDocs(collection(db, 'registrations'));
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
    const snap = await getDocs(collection(db, 'students'));
    const students = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as Student));
    useAppStore.setState({ students });
    return students;
  },

  async toggleStudentAccountStatus(studentId: string, status: 'active' | 'disabled'): Promise<void> {
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
    const snap = await getDocs(collection(db, 'admins'));
    const admins = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as Admin));
    useAppStore.setState({ admins });
    return admins;
  },

  /**
   * Provision a verified student account (Authorized Admin or HOD only)
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
    if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'HOD')) {
      throw new Error('Unauthorized: Only authorized administrators or HOD can provision student accounts.');
    }

    const cleanName = studentInfo.name.trim();
    const cleanRegNo = studentInfo.registerNumber.trim().toUpperCase().replace(/\s+/g, '');
    const cleanEmail = studentInfo.email.trim().toLowerCase();
    const cleanDept = studentInfo.department.trim();
    const cleanYear = studentInfo.year.trim() || '1st Year';
    const cleanPhone = (studentInfo.phone || '').trim();

    if (!cleanName) throw new Error('Student full name is required.');
    if (!cleanRegNo) throw new Error('Registration number is required.');
    if (!cleanDept) throw new Error('Academic department is required.');

    if (!isSupportedDepartment(cleanDept)) {
      throw new Error(`Invalid department "${cleanDept}". HackHub strictly supports only Biotechnology and Biomedical Engineering.`);
    }

    const isHod = currentUser.role === 'HOD' || currentUser.adminData?.isHod === true;
    const adminDept = currentUser.adminData?.department;
    if (!isHod && cleanDept !== adminDept) {
      throw new Error(`Department authorization error: As a faculty member of ${adminDept}, you are only permitted to provision students for your own department.`);
    }

    // 1. Check uniqueness of registration number in reg_lookups
    const lookupRef = doc(db, 'reg_lookups', cleanRegNo);
    const lookupSnap = await getDoc(lookupRef);
    if (lookupSnap.exists()) {
      throw new Error(`Registration number "${cleanRegNo}" is already assigned to a student.`);
    }

    // 2. Check duplicate registration number in students collection
    const regQuery = query(collection(db, 'students'), where('registerNumber', '==', cleanRegNo));
    const regCheckSnap = await getDocs(regQuery);
    if (!regCheckSnap.empty) {
      throw new Error(`Registration number "${cleanRegNo}" is already assigned to an existing student profile.`);
    }

    // 3. Check duplicate email in students collection
    const emailQuery = query(collection(db, 'students'), where('email', '==', cleanEmail));
    const emailCheckSnap = await getDocs(emailQuery);
    if (!emailCheckSnap.empty) {
      throw new Error(`Email address "${cleanEmail}" is already registered to a student.`);
    }

    // 4. Create Firebase Authentication account in an isolated secondary app instance
    // (This guarantees the current admin's active session is never overwritten in the browser)
    const tempAppName = `Provision_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);
    const initialTempPassword = 'KIT#' + Math.random().toString(36).slice(2, 10) + '2026!';

    let newUid: string;
    try {
      const userCred = await createUserWithEmailAndPassword(tempAuth, cleanEmail, initialTempPassword);
      newUid = userCred.user.uid;

      // Dispatch password setup / reset email directly to the student
      try {
        await sendPasswordResetEmail(tempAuth, cleanEmail);
      } catch (resetErr: any) {
        console.warn('[AdminService] Note on password setup email:', resetErr.message);
      }
    } catch (authErr: any) {
      if (authErr.code === 'auth/email-already-in-use') {
        throw new Error(`An account with email "${cleanEmail}" already exists in Firebase Authentication.`);
      }
      throw new Error(authErr.message || 'Failed to create student authentication account.');
    } finally {
      try {
        await deleteApp(tempApp);
      } catch (delAppErr) {
        // ignore cleanup error
      }
    }

    // 5. Create Firestore student profile at students/{newUid}
    const studentRecord: Student = {
      uid: newUid,
      name: cleanName,
      registerNumber: cleanRegNo,
      registrationNumberNormalized: cleanRegNo,
      email: cleanEmail,
      phone: cleanPhone,
      department: cleanDept,
      year: cleanYear,
      role: 'STUDENT',
      accountStatus: 'active',
      bio: 'Engineering student at KalaignarKarunanidhi Institute Of Technology.',
      skills: [],
      provisionedBy: currentUser.uid,
      provisionedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, 'students', newUid), {
        ...studentRecord,
        isActive: true,
        role: 'STUDENT'
      });

      // 6. Create registration lookup document for O(1) login resolution (sanitized: no name or uid stored)
      await setDoc(lookupRef, {
        email: cleanEmail,
        createdAt: serverTimestamp()
      });
    } catch (firestoreErr: any) {
      console.error('[AdminService] Student profile creation failed:', firestoreErr);
      throw new Error('Failed to create student profile in database: ' + (firestoreErr.message || 'Permission denied'));
    }

    // 7. Write immutable audit log
    const auditLogRef = doc(collection(db, 'audit_logs'));
    const auditLogData: AuditLog = {
      id: auditLogRef.id,
      actorUid: currentUser.uid,
      actorEmail: currentUser.email,
      actorName: currentUser.adminData?.name || 'Administrator',
      actorRole: currentUser.role,
      targetUid: newUid,
      targetEmail: cleanEmail,
      targetName: cleanName,
      action: 'STUDENT_PROVISIONED',
      timestamp: serverTimestamp(),
      details: {
        registerNumber: cleanRegNo,
        department: cleanDept,
        year: cleanYear
      }
    };
    await setDoc(auditLogRef, auditLogData);
    useAppStore.getState().addAuditLog(auditLogData);

    // 8. Update in-memory store
    const existingStudents = useAppStore.getState().students;
    useAppStore.getState().setStudents([studentRecord, ...existingStudents]);

    return { uid: newUid, email: cleanEmail, registerNumber: cleanRegNo };
  },

  /**
   * Approve a pending faculty coordinator application (HOD or designated Department Approver)
   */
  async approveFacultyAdmin(
    adminId: string,
    approverName: string,
    initialPermissions?: { authorizedYears?: string[]; authorizedClasses?: string[] }
  ): Promise<void> {
    const currentUser = useAppStore.getState().currentUser;
    const isHod = currentUser?.role === 'HOD' || currentUser?.adminData?.isHod === true;
    const isDeptApprover = currentUser?.adminData?.isDepartmentApprover === true;
    const approverDept = currentUser?.adminData?.department;

    if (!currentUser || (!isHod && !isDeptApprover)) {
      throw new Error('Unauthorized: Only the Head of Department (HOD) or an authorized Department Approver can approve faculty applications.');
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

    if (!isHod && targetAdminData.department !== approverDept) {
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
      role: 'ADMIN',
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
      actorRole: isHod ? 'HOD' : 'DEPT_APPROVER',
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
              role: 'ADMIN',
              isActive: true,
              authorizedYears: cleanYears.length > 0 ? cleanYears : a.authorizedYears,
              authorizedClasses: initialPermissions?.authorizedClasses || a.authorizedClasses
            }
          : a
      )
    });
  },

  /**
   * Reject a pending faculty coordinator application (HOD or designated Department Approver)
   */
  async rejectFacultyAdmin(adminId: string, reason?: string): Promise<void> {
    const currentUser = useAppStore.getState().currentUser;
    const isHod = currentUser?.role === 'HOD' || currentUser?.adminData?.isHod === true;
    const isDeptApprover = currentUser?.adminData?.isDepartmentApprover === true;
    const approverDept = currentUser?.adminData?.department;

    if (!currentUser || (!isHod && !isDeptApprover)) {
      throw new Error('Unauthorized: Only the Head of Department (HOD) or an authorized Department Approver can decline faculty applications.');
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

    if (!isHod && targetAdminData.department !== approverDept) {
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
      actorName: currentUser.adminData?.name || 'Head of Department',
      actorRole: 'HOD',
      targetUid: adminId,
      targetEmail: targetAdminData.email,
      targetName: targetAdminData.name,
      action: 'ADMIN_REJECTED',
      previousStatus: targetAdminData.approvalStatus || 'PENDING',
      newStatus: 'REJECTED',
      timestamp: serverTimestamp(),
      details: {
        reason: reason || 'Application rejected by HOD',
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
   * Deactivate an administrator's access (HOD only)
   * Guardrail: Prevents removing the last active HOD account
   */
  async deactivateAdmin(adminId: string): Promise<void> {
    const currentUser = useAppStore.getState().currentUser;
    if (!currentUser || currentUser.role !== 'HOD') {
      throw new Error('Unauthorized: Only the Head of Department (HOD) can manage administrator access.');
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

    // Guardrail: Do not allow deactivating the last active HOD
    if (target?.isHod || target?.role === 'HOD') {
      let activeHodsCount = currentAdmins.filter(
        (a) => (a.isHod || a.role === 'HOD') && a.approvalStatus === 'APPROVED' && (a as any).isActive !== false
      ).length;

      // Always verify directly against Firestore to ensure source of truth
      try {
        const allAdminsSnap = await getDocs(collection(db, 'admins'));
        activeHodsCount = allAdminsSnap.docs.filter((d) => {
          const data = d.data();
          return (
            (data.isHod === true || data.role === 'HOD') &&
            data.approvalStatus === 'APPROVED' &&
            data.isActive !== false &&
            data.accountStatus !== 'deactivated'
          );
        }).length;
      } catch (fsErr) {
        // use fallback count if offline
      }

      if (activeHodsCount <= 1) {
        throw new Error(
          'Safety Guardrail Triggered: Cannot deactivate the only active Head of Department account without establishing a successor.'
        );
      }
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
      actorName: currentUser.adminData?.name || 'Head of Department',
      actorRole: 'HOD',
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
   * Reactivate a deactivated administrator's access (HOD only)
   */
  async reactivateAdmin(adminId: string): Promise<void> {
    const currentUser = useAppStore.getState().currentUser;
    if (!currentUser || currentUser.role !== 'HOD') {
      throw new Error('Unauthorized: Only the Head of Department (HOD) can manage administrator access.');
    }

    const currentAdmins = useAppStore.getState().admins;
    const target = currentAdmins.find((a) => a.uid === adminId);

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
      actorName: currentUser.adminData?.name || 'Head of Department',
      actorRole: 'HOD',
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
   * Designate or revoke Department Approver status for an approved faculty member (HOD only)
   */
  async toggleDepartmentApprover(adminId: string, isApprover: boolean): Promise<void> {
    const currentUser = useAppStore.getState().currentUser;
    if (!currentUser || currentUser.role !== 'HOD') {
      throw new Error('Unauthorized: Only the Head of Department (HOD) can designate department approvers.');
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
    await updateDoc(adminDocRef, {
      isDepartmentApprover: isApprover,
      departmentApproverScope: isApprover ? target.department : null,
      updatedAt: serverTimestamp()
    });

    // Write audit log
    const auditLogRef = doc(collection(db, 'audit_logs'));
    const auditLogData: AuditLog = {
      id: auditLogRef.id,
      actorUid: currentUser.uid,
      actorEmail: currentUser.email,
      actorName: currentUser.adminData?.name || 'Head of Department',
      actorRole: 'HOD',
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
    await setDoc(auditLogRef, auditLogData);
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
   * Update Faculty/Admin profile details (self-service for faculty or administrative edit by HOD)
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
    const isHod = currentUser.role === 'HOD' || currentUser.adminData?.isHod === true;

    if (!isSelf && !isHod) {
      throw new Error('Unauthorized: You can only edit your own profile or manage profiles as HOD.');
    }

    const adminDocRef = doc(db, 'admins', adminId);
    const adminSnap = await getDoc(adminDocRef);
    if (!adminSnap.exists()) {
      throw new Error('Administrator record not found.');
    }
    const currentData = adminSnap.data() as Admin;

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
   * Assign or update faculty authorized academic years and classes (HOD only)
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
    const isHod = currentUser?.role === 'HOD' || currentUser?.adminData?.isHod === true;
    if (!currentUser || !isHod) {
      throw new Error('Unauthorized: Only the Head of Department (HOD) can assign faculty academic years and permissions.');
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
      actorName: currentUser.adminData?.name || 'Head of Department',
      actorRole: 'HOD',
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
   * Fetch complete immutable audit trail (HOD only)
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

  generateRegistrationsCsv(): string {
    const store = useAppStore.getState();
    const headers = [
      'Registration ID',
      'Student ID',
      'Hackathon ID',
      'Team ID',
      'Status',
      'Attendance',
      'Submission',
      'Registered At'
    ];
    const rows = store.registrations.map((r) =>
      [
        r.registrationNumber || r.id,
        r.studentId,
        r.hackathonId,
        r.teamId || 'No Team',
        r.status,
        r.attendanceStatus || 'PENDING',
        r.submissionStatus || 'NOT_SUBMITTED',
        new Date(r.registeredAt).toLocaleDateString()
      ].join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }
};
