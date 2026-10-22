import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppStore } from '../../lib/store';
import { isPlatformAdministrator } from '../../utils/access';
import { userManagementService, CreateUserPayload, UpdateUserPayload } from '../../services/userManagementService';
import { ManagedUser, UserManagementStats, UserManagementPagination } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useToast } from '../../components/common/Toast';
import {
  Users,
  UserCheck,
  UserX,
  GraduationCap,
  Shield,
  Search,
  RefreshCw,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Power,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Clock,
  Briefcase
} from 'lucide-react';
import {
  BIOTECHNOLOGY_SPECIALIZATIONS,
  BIOMEDICAL_SPECIALIZATIONS
} from '../../constants/departments';

export const AdminUsersPage: React.FC = () => {
  const currentUser = useAppStore((state) => state.currentUser);
  const { showToast } = useToast();

  const isPlatformAdmin = isPlatformAdministrator(currentUser);
  const callerDept = currentUser?.adminData?.department || '';

  // Data & Pagination State
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [stats, setStats] = useState<UserManagementStats>({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    studentCount: 0,
    facultyCount: 0
  });
  const [pagination, setPagination] = useState<UserManagementPagination>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedDept, setSelectedDept] = useState(isPlatformAdmin ? 'ALL' : callerDept);
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal States
  const [viewingUser, setViewingUser] = useState<ManagedUser | null>(null);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [statusTargetUser, setStatusTargetUser] = useState<ManagedUser | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Create User Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createRole, setCreateRole] = useState<'STUDENT' | 'FACULTY' | 'ADMIN'>('STUDENT');
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createDept, setCreateDept] = useState(isPlatformAdmin ? 'Biotechnology' : callerDept);
  const [createRegNumber, setCreateRegNumber] = useState('');
  const [createYear, setCreateYear] = useState('First Year');
  const [createDesignation, setCreateDesignation] = useState('');
  const [createFacultyId, setCreateFacultyId] = useState('');
  const [createSpec, setCreateSpec] = useState('');
  const [createCustomSpec, setCreateCustomSpec] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Edit User Form State
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editRegNumber, setEditRegNumber] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editFacultyId, setEditFacultyId] = useState('');
  const [editSpec, setEditSpec] = useState('');
  const [editCustomSpec, setEditCustomSpec] = useState('');
  const [editRole, setEditRole] = useState<'STUDENT' | 'FACULTY' | 'ADMIN'>('STUDENT');
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch users from server API
  const loadUsers = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await userManagementService.getUsers({
        search: debouncedSearch,
        role: selectedRole,
        department: isPlatformAdmin ? selectedDept : callerDept,
        year: selectedYear,
        status: selectedStatus,
        page: currentPage,
        limit: pagination.limit
      });

      setUsers(response.users);
      setStats(response.stats);
      setPagination(response.pagination);
    } catch (err: any) {
      console.error('[AdminUsersPage] Error loading users:', err);
      setErrorMessage(err.message || 'Failed to load user records.');
      showToast('error', 'Error Loading Users', err.message || 'Unable to retrieve user management data from server.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [debouncedSearch, selectedRole, selectedDept, isPlatformAdmin, callerDept, selectedYear, selectedStatus, currentPage, pagination.limit, showToast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Reset Create Form
  const resetCreateForm = () => {
    setCreateRole('STUDENT');
    setCreateName('');
    setCreateEmail('');
    setCreatePhone('');
    setCreateDept(isPlatformAdmin ? 'Biotechnology' : callerDept);
    setCreateRegNumber('');
    setCreateYear('First Year');
    setCreateDesignation('');
    setCreateFacultyId('');
    setCreateSpec('');
    setCreateCustomSpec('');
    setCreateError(null);
  };

  // Open Edit Modal with user data
  const handleOpenEdit = (user: ManagedUser) => {
    setEditingUser(user);
    setEditName(user.name || '');
    setEditEmail(user.email || '');
    setEditPhone(user.phone || '');
    setEditDept(user.department || '');
    setEditRegNumber(user.registerNumber || '');
    setEditYear(user.academicYear || 'First Year');
    setEditDesignation(user.designation || '');
    setEditFacultyId(user.facultyId || '');
    setEditSpec(user.researchSpecialization || '');
    setEditCustomSpec(user.customSpecialization || '');
    setEditRole(user.role);
    setEditError(null);
  };

  // Submit Create User
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!createName.trim()) {
      setCreateError('Please enter user full name.');
      return;
    }
    if (!createEmail.trim()) {
      setCreateError('Please enter user college email address.');
      return;
    }
    if (createRole === 'STUDENT') {
      if (!createRegNumber.trim()) {
        setCreateError('Please enter a student registration number.');
        return;
      }
      if (!createYear) {
        setCreateError('Please select student academic year.');
        return;
      }
    }

    setIsSubmittingCreate(true);
    try {
      const payload: CreateUserPayload = {
        name: createName.trim(),
        email: createEmail.trim(),
        role: createRole,
        department: createDept,
        phone: createPhone.trim() || undefined,
        ...(createRole === 'STUDENT' ? {
          registerNumber: createRegNumber.trim(),
          academicYear: createYear
        } : {
          designation: createDesignation.trim() || undefined,
          facultyId: createFacultyId.trim() || undefined,
          researchSpecialization: createSpec || undefined,
          customSpecialization: createSpec === 'Other' ? createCustomSpec.trim() : undefined
        })
      };

      const result = await userManagementService.createUser(payload);
      showToast('success', 'User Created', result.message);

      setIsCreateModalOpen(false);
      resetCreateForm();
      await loadUsers();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create user account.');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Submit Edit User
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);

    if (!editName.trim()) {
      setEditError('Name cannot be empty.');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const payload: UpdateUserPayload = {
        name: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        department: editDept,
        ...(editingUser.role === 'STUDENT' ? {
          registerNumber: editRegNumber.trim(),
          academicYear: editYear
        } : {
          designation: editDesignation.trim(),
          facultyId: editFacultyId.trim(),
          researchSpecialization: editSpec,
          customSpecialization: editSpec === 'Other' ? editCustomSpec.trim() : '',
          role: isPlatformAdmin ? editRole : undefined
        })
      };

      const result = await userManagementService.updateUser(editingUser.uid, payload);
      showToast('success', 'Profile Updated', result.message);

      setEditingUser(null);
      await loadUsers();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update user profile.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Submit Status Toggle (Activate/Deactivate)
  const handleStatusSubmit = async () => {
    if (!statusTargetUser) return;
    const nextAction = statusTargetUser.isActive ? 'deactivate' : 'activate';

    setIsSubmittingStatus(true);
    try {
      const res = await userManagementService.setUserStatus(
        statusTargetUser.uid,
        nextAction,
        statusReason.trim() || undefined
      );

      showToast('success', nextAction === 'activate' ? 'Account Activated' : 'Account Deactivated', res.message);

      setStatusTargetUser(null);
      setStatusReason('');
      await loadUsers();
    } catch (err: any) {
      showToast('error', 'Action Failed', err.message || 'Failed to update account status.');
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  // Submit Safe Deletion
  const handleDeleteSubmit = async () => {
    if (!deletingUser) return;

    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      showToast('warning', 'Confirmation Required', 'Please type DELETE to confirm account deletion.');
      return;
    }

    setIsDeleting(true);
    try {
      const res = await userManagementService.deleteUser(deletingUser.uid);
      showToast('success', 'Account Deleted', res.message);

      setDeletingUser(null);
      setDeleteConfirmText('');
      await loadUsers();
    } catch (err: any) {
      showToast('error', 'Deletion Failed', err.message || 'Could not delete user account.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Specialization options helper based on department
  const currentSpecializations = useMemo(() => {
    const dept = isCreateModalOpen ? createDept : editDept;
    if (dept === 'Biotechnology') return BIOTECHNOLOGY_SPECIALIZATIONS;
    if (dept === 'Biomedical Engineering') return BIOMEDICAL_SPECIALIZATIONS;
    return [];
  }, [isCreateModalOpen, createDept, editDept]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="User Management"
          description="Manage student, faculty, and administrator accounts across Firebase Authentication and Cloud Firestore."
        />
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadUsers(true)}
            disabled={isLoading || isRefreshing}
            className="flex items-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              resetCreateForm();
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create User
          </Button>
        </div>
      </div>

      {/* Overview Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Users */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Users</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.totalUsers}</span>
            <span className="text-xs text-slate-500">records</span>
          </div>
        </div>

        {/* Active Accounts */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{stats.activeUsers}</span>
            <span className="text-xs text-slate-500">accounts</span>
          </div>
        </div>

        {/* Inactive Accounts */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inactive</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-600">{stats.inactiveUsers}</span>
            <span className="text-xs text-slate-500">deactivated</span>
          </div>
        </div>

        {/* Students Count */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Students</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.studentCount}</span>
            <span className="text-xs text-slate-500">enrolled</span>
          </div>
        </div>

        {/* Faculty & Admins Count */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-shadow col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Faculty & Admins</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.facultyCount}</span>
            <span className="text-xs text-slate-500">staff</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or registration no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="ALL">All Roles</option>
              <option value="STUDENT">Students</option>
              <option value="FACULTY">Faculty Coordinators</option>
              <option value="ADMIN">Platform Administrators</option>
            </select>
          </div>

          {/* Department Filter (Active for platform admins) */}
          <div>
            <select
              value={isPlatformAdmin ? selectedDept : callerDept}
              disabled={!isPlatformAdmin}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 ${!isPlatformAdmin ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
            >
              {isPlatformAdmin ? (
                <>
                  <option value="ALL">All Departments</option>
                  <option value="Biotechnology">Biotechnology</option>
                  <option value="Biomedical Engineering">Biomedical Engineering</option>
                </>
              ) : (
                <option value={callerDept}>{callerDept} (Restricted)</option>
              )}
            </select>
          </div>

          {/* Academic Year Filter */}
          <div>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="ALL">All Academic Years</option>
              <option value="First Year">First Year</option>
              <option value="Second Year">Second Year</option>
              <option value="Third Year">Third Year</option>
            </select>
          </div>
        </div>

        {/* Secondary Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-600">Status:</span>
            <div className="flex items-center gap-1.5">
              {['ALL', 'active', 'inactive', 'pending'].map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setSelectedStatus(st);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    selectedStatus === st
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st === 'active' ? 'Active' : st === 'inactive' ? 'Inactive' : 'Pending'}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-700">{users.length}</span> of{' '}
            <span className="font-semibold text-slate-700">{pagination.total}</span> users
          </div>
        </div>
      </div>

      {/* Main Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Loading User Directory...</p>
          </div>
        ) : errorMessage ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Failed to Load User Directory</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">{errorMessage}</p>
            <Button size="sm" variant="outline" onClick={() => loadUsers(true)}>
              Retry Loading
            </Button>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">No Users Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              {searchQuery || selectedRole !== 'ALL' || selectedStatus !== 'ALL' || selectedYear !== 'ALL'
                ? 'No user records match the active search filters. Try clearing or broadening your search parameters.'
                : 'No users have been registered in this department yet.'}
            </p>
            {(searchQuery || selectedRole !== 'ALL' || selectedStatus !== 'ALL' || selectedYear !== 'ALL') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedRole('ALL');
                  setSelectedYear('ALL');
                  setSelectedStatus('ALL');
                  if (isPlatformAdmin) setSelectedDept('ALL');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">College Email</th>
                  <th className="py-3 px-4">Registration No.</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Academic Year</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {users.map((user) => {
                  const isUserActive = user.isActive && user.status === 'active';
                  const isPending = user.status === 'pending';
                  const isTargetSelf = currentUser?.uid === user.uid;

                  return (
                    <tr
                      key={user.uid}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            user.role === 'ADMIN'
                              ? 'bg-amber-100 text-amber-800'
                              : user.role === 'FACULTY'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-cyan-100 text-cyan-800'
                          }`}>
                            {user.name ? user.name.slice(0, 2).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {user.name || 'Unnamed User'}
                              {isTargetSelf && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                                  You
                                </span>
                              )}
                            </div>
                            {user.designation && (
                              <div className="text-[11px] text-slate-500">{user.designation}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* College Email */}
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                        {user.email}
                      </td>

                      {/* Registration Number */}
                      <td className="py-3.5 px-4">
                        {user.registerNumber ? (
                          <span className="font-mono text-slate-800 font-semibold bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            {user.registerNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        {user.role === 'ADMIN' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Shield className="w-3 h-3 text-amber-500" />
                            Platform Admin
                          </span>
                        ) : user.role === 'FACULTY' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <Briefcase className="w-3 h-3 text-purple-500" />
                            Faculty Staff
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
                            <GraduationCap className="w-3 h-3 text-cyan-500" />
                            Student
                          </span>
                        )}
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${
                          user.department === 'Biotechnology'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : user.department === 'Biomedical Engineering'
                            ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                          {user.department || 'Unassigned'}
                        </span>
                      </td>

                      {/* Academic Year */}
                      <td className="py-3.5 px-4 text-slate-600">
                        {user.academicYear || '—'}
                      </td>

                      {/* Account Status */}
                      <td className="py-3.5 px-4">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        ) : isUserActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <UserX className="w-3 h-3" />
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Creation Date */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })
                          : '—'}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Details */}
                          <button
                            onClick={() => setViewingUser(user)}
                            title="View Full Profile"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit User */}
                          <button
                            onClick={() => handleOpenEdit(user)}
                            title="Edit User"
                            disabled={!isPlatformAdmin && user.role !== 'STUDENT'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              !isPlatformAdmin && user.role !== 'STUDENT'
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'
                            }`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {/* Activate / Deactivate Toggle */}
                          <button
                            onClick={() => {
                              setStatusTargetUser(user);
                              setStatusReason('');
                            }}
                            title={isUserActive ? 'Deactivate User' : 'Reactivate User'}
                            disabled={isTargetSelf}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isTargetSelf
                                ? 'text-slate-300 cursor-not-allowed'
                                : isUserActive
                                ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            <Power className="w-4 h-4" />
                          </button>

                          {/* Safe Delete */}
                          <button
                            onClick={() => {
                              setDeletingUser(user);
                              setDeleteConfirmText('');
                            }}
                            title="Delete Account"
                            disabled={isTargetSelf || (!isPlatformAdmin && user.role !== 'STUDENT')}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isTargetSelf || (!isPlatformAdmin && user.role !== 'STUDENT')
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="bg-slate-50/80 px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div>
              Page <span className="font-semibold text-slate-900">{pagination.page}</span> of{' '}
              <span className="font-semibold text-slate-900">{pagination.totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1 || isLoading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages || isLoading}
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="flex items-center gap-1 text-xs"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. VIEW USER MODAL */}
      {/* ========================================================================= */}
      {viewingUser && (
        <Modal
          isOpen={!!viewingUser}
          onClose={() => setViewingUser(null)}
          title="User Account Details"
          maxWidth="lg"
          footer={
            <div className="flex justify-between w-full">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const u = viewingUser;
                    setViewingUser(null);
                    handleOpenEdit(u);
                  }}
                  disabled={!isPlatformAdmin && viewingUser.role !== 'STUDENT'}
                >
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  Edit Profile
                </Button>
                <Button
                  variant={viewingUser.isActive ? 'danger' : 'primary'}
                  size="sm"
                  onClick={() => {
                    const u = viewingUser;
                    setViewingUser(null);
                    setStatusTargetUser(u);
                  }}
                  disabled={currentUser?.uid === viewingUser.uid}
                >
                  <Power className="w-3.5 h-3.5 mr-1.5" />
                  {viewingUser.isActive ? 'Deactivate' : 'Reactivate'}
                </Button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setViewingUser(null)}>
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Header Identity Card */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg ${
                viewingUser.role === 'ADMIN'
                  ? 'bg-amber-100 text-amber-800'
                  : viewingUser.role === 'FACULTY'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-cyan-100 text-cyan-800'
              }`}>
                {viewingUser.name ? viewingUser.name.slice(0, 2).toUpperCase() : 'U'}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">{viewingUser.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    viewingUser.isActive
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {viewingUser.isActive ? 'Active Account' : 'Inactive Account'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{viewingUser.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-200 text-slate-700">
                    {viewingUser.role}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-200 text-slate-700">
                    {viewingUser.department}
                  </span>
                  {viewingUser.academicYear && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-200 text-slate-700">
                      {viewingUser.academicYear}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Field Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Authentication UID</span>
                <p className="font-mono text-slate-800 text-[11px] break-all">{viewingUser.uid}</p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Contact Phone</span>
                <p className="font-semibold text-slate-800">{viewingUser.phone || 'Not provided'}</p>
              </div>

              {viewingUser.role === 'STUDENT' ? (
                <>
                  <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Registration Number</span>
                    <p className="font-mono font-bold text-slate-800 text-sm">{viewingUser.registerNumber || '—'}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Academic Class Scope</span>
                    <p className="font-semibold text-slate-800">{viewingUser.academicYear || '—'}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Designation</span>
                    <p className="font-semibold text-slate-800">{viewingUser.designation || 'Staff Member'}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Faculty / Employee ID</span>
                    <p className="font-mono font-semibold text-slate-800">{viewingUser.facultyId || 'Not registered'}</p>
                  </div>
                  <div className="col-span-2 p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Research Specialization</span>
                    <p className="font-semibold text-slate-800">
                      {viewingUser.researchSpecialization === 'Other'
                        ? `Custom: ${viewingUser.customSpecialization || 'Other'}`
                        : viewingUser.researchSpecialization || 'None specified'}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Timestamps & Governance Records */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Profile Registered:</span>
                <span className="font-semibold text-slate-700">
                  {viewingUser.createdAt ? new Date(viewingUser.createdAt).toLocaleString() : 'System Bootstrap'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Last Profile Update:</span>
                <span className="font-semibold text-slate-700">
                  {viewingUser.updatedAt ? new Date(viewingUser.updatedAt).toLocaleString() : 'No updates recorded'}
                </span>
              </div>
              {viewingUser.approvalStatus && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Institutional Approval:</span>
                  <span className="font-semibold text-slate-700">{viewingUser.approvalStatus}</span>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 2. CREATE USER MODAL */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create New User Account"
          maxWidth="lg"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {/* Role Tab Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Account Role</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCreateRole('STUDENT')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                    createRole === 'STUDENT'
                      ? 'border-cyan-500 bg-cyan-50 text-cyan-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setCreateRole('FACULTY')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                    createRole === 'FACULTY'
                      ? 'border-purple-500 bg-purple-50 text-purple-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Faculty Coordinator
                </button>
                <button
                  type="button"
                  disabled={!isPlatformAdmin}
                  onClick={() => setCreateRole('ADMIN')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                    createRole === 'ADMIN'
                      ? 'border-amber-500 bg-amber-50 text-amber-800'
                      : !isPlatformAdmin
                      ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Platform Admin {!isPlatformAdmin && '(Restricted)'}
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {createError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{createError}</span>
              </div>
            )}

            {/* Full Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <Input
                  required
                  placeholder="e.g. Anandha Kumar"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">College Email Address *</label>
                <Input
                  required
                  type="email"
                  placeholder="e.g. anandha@kitcbe.com"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Department & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department *</label>
                <select
                  disabled={!isPlatformAdmin}
                  value={createDept}
                  onChange={(e) => setCreateDept(e.target.value)}
                  className={`w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 ${!isPlatformAdmin ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                >
                  <option value="Biotechnology">Biotechnology</option>
                  <option value="Biomedical Engineering">Biomedical Engineering</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone (Optional)</label>
                <Input
                  placeholder="e.g. +91 9876543210"
                  value={createPhone}
                  onChange={(e) => setCreatePhone(e.target.value)}
                />
              </div>
            </div>

            {/* Student Specific Fields */}
            {createRole === 'STUDENT' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-cyan-50/50 rounded-xl border border-cyan-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Registration Number *</label>
                  <Input
                    required
                    placeholder="e.g. 71762201001"
                    value={createRegNumber}
                    onChange={(e) => setCreateRegNumber(e.target.value.toUpperCase())}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Academic Year *</label>
                  <select
                    value={createYear}
                    onChange={(e) => setCreateYear(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="First Year">First Year</option>
                    <option value="Second Year">Second Year</option>
                    <option value="Third Year">Third Year</option>
                  </select>
                </div>
              </div>
            )}

            {/* Faculty & Admin Specific Fields */}
            {createRole !== 'STUDENT' && (
              <div className="space-y-3 p-3 bg-purple-50/40 rounded-xl border border-purple-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                    <Input
                      placeholder={createRole === 'ADMIN' ? 'Institutional Administrator' : 'Assistant Professor'}
                      value={createDesignation}
                      onChange={(e) => setCreateDesignation(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Faculty / Employee ID</label>
                    <Input
                      placeholder="e.g. FAC-BT-024"
                      value={createFacultyId}
                      onChange={(e) => setCreateFacultyId(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Research Specialization</label>
                  <select
                    value={createSpec}
                    onChange={(e) => setCreateSpec(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">Select Specialization...</option>
                    {currentSpecializations.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {createSpec === 'Other' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Custom Specialization Name *</label>
                    <Input
                      placeholder="e.g. Nanomedicine and Drug Delivery"
                      value={createCustomSpec}
                      onChange={(e) => setCreateCustomSpec(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Notice regarding password setup */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500 leading-relaxed flex items-start gap-2">
              <Info className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
              <span>
                HackHub will create the account in Firebase Authentication and send a secure invitation link to the college email for password establishment. Shared default passwords are never created or stored.
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isSubmittingCreate}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmittingCreate}
              >
                Create Account
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 3. EDIT USER MODAL */}
      {/* ========================================================================= */}
      {editingUser && (
        <Modal
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          title={`Edit Profile: ${editingUser.name}`}
          maxWidth="lg"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {editError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{editError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <Input
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">College Email Address *</label>
                <Input
                  required
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                <select
                  disabled={!isPlatformAdmin}
                  value={editDept}
                  onChange={(e) => setEditDept(e.target.value)}
                  className={`w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 ${!isPlatformAdmin ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                >
                  <option value="Biotechnology">Biotechnology</option>
                  <option value="Biomedical Engineering">Biomedical Engineering</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
                <Input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
              </div>
            </div>

            {/* Student Specific Editable Fields */}
            {editingUser.role === 'STUDENT' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-cyan-50/50 rounded-xl border border-cyan-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Registration Number</label>
                  <Input
                    required
                    value={editRegNumber}
                    onChange={(e) => setEditRegNumber(e.target.value.toUpperCase())}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Academic Year</label>
                  <select
                    value={editYear}
                    onChange={(e) => setEditYear(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="First Year">First Year</option>
                    <option value="Second Year">Second Year</option>
                    <option value="Third Year">Third Year</option>
                  </select>
                </div>
              </div>
            )}

            {/* Faculty Specific Editable Fields */}
            {editingUser.role !== 'STUDENT' && (
              <div className="space-y-3 p-3 bg-purple-50/40 rounded-xl border border-purple-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                    <Input
                      value={editDesignation}
                      onChange={(e) => setEditDesignation(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Faculty / Employee ID</label>
                    <Input
                      value={editFacultyId}
                      onChange={(e) => setEditFacultyId(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Research Specialization</label>
                  <select
                    value={editSpec}
                    onChange={(e) => setEditSpec(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">None specified</option>
                    {currentSpecializations.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {editSpec === 'Other' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Custom Specialization Name</label>
                    <Input
                      value={editCustomSpec}
                      onChange={(e) => setEditCustomSpec(e.target.value)}
                    />
                  </div>
                )}

                {/* Role Elevation (Platform Admin Only) */}
                {isPlatformAdmin && currentUser?.uid !== editingUser.uid && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Platform Privilege</label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="FACULTY">Faculty Coordinator</option>
                      <option value="ADMIN">Platform Administrator</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditingUser(null)}
                disabled={isSubmittingEdit}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmittingEdit}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 4. ACTIVATE / DEACTIVATE CONFIRMATION DIALOG */}
      {/* ========================================================================= */}
      {statusTargetUser && (
        <ConfirmDialog
          isOpen={!!statusTargetUser}
          onClose={() => setStatusTargetUser(null)}
          onConfirm={handleStatusSubmit}
          isLoading={isSubmittingStatus}
          title={statusTargetUser.isActive ? 'Deactivate User Account' : 'Reactivate User Account'}
          message={
            statusTargetUser.isActive
              ? `Are you sure you want to deactivate ${statusTargetUser.name} (${statusTargetUser.email})? This will disable their Firebase Authentication account and revoke all active sessions immediately. Historical registrations and submissions will be preserved.`
              : `Are you sure you want to reactivate ${statusTargetUser.name} (${statusTargetUser.email})? This will restore their active status and allow them to sign in.`
          }
          confirmText={statusTargetUser.isActive ? 'Deactivate Account' : 'Reactivate Account'}
          confirmVariant={statusTargetUser.isActive ? 'danger' : 'primary'}
        />
      )}

      {/* ========================================================================= */}
      {/* 5. SAFE DELETE CONFIRMATION DIALOG */}
      {/* ========================================================================= */}
      {deletingUser && (
        <Modal
          isOpen={!!deletingUser}
          onClose={() => setDeletingUser(null)}
          title="Safe Delete User Account"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-800 leading-relaxed">
                <p className="font-bold mb-1">Destructive Action Confirmation</p>
                You are about to delete <span className="font-semibold">{deletingUser.name}</span> ({deletingUser.email}) with role <span className="font-semibold">{deletingUser.role}</span>.
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
              <p>
                <strong>What will happen:</strong>
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li>Firebase Authentication account will be deleted permanently.</li>
                <li>Registration number lookup bindings will be deleted.</li>
                <li>
                  Historical hackathon registrations, submissions, and team participation records will be <strong>preserved for collegiate audit compliance</strong>.
                </li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Type <span className="text-rose-600 font-mono">DELETE</span> to confirm:
              </label>
              <Input
                placeholder="DELETE"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDeletingUser(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleDeleteSubmit}
                isLoading={isDeleting}
                disabled={deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
              >
                Confirm Account Deletion
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminUsersPage;
