import { auth } from '../lib/firebase';
import {
  ManagedUser,
  UserManagementStats,
  UserManagementPagination,
  UserManagementListResponse
} from '../types';

export interface UserListFilterParams {
  search?: string;
  role?: string;
  department?: string;
  year?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  role: 'STUDENT' | 'FACULTY' | 'ADMIN';
  department: string;
  academicYear?: string;
  registerNumber?: string;
  phone?: string;
  designation?: string;
  facultyId?: string;
  researchSpecialization?: string;
  customSpecialization?: string;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  phone?: string;
  department?: string;
  academicYear?: string;
  year?: string;
  registerNumber?: string;
  designation?: string;
  facultyId?: string;
  researchSpecialization?: string;
  customSpecialization?: string;
  role?: 'STUDENT' | 'FACULTY' | 'ADMIN';
}

async function getAuthHeader(): Promise<{ Authorization: string }> {
  if (!auth.currentUser) {
    throw new Error('Your administrative session has expired. Please sign in again.');
  }
  const token = await auth.currentUser.getIdToken(true);
  return {
    Authorization: `Bearer ${token}`
  };
}

export const userManagementService = {
  /**
   * Fetch paginated and filtered user list with summary stats
   */
  async getUsers(params: UserListFilterParams = {}): Promise<UserManagementListResponse> {
    const headers = await getAuthHeader();
    const query = new URLSearchParams();

    if (params.search) query.set('search', params.search);
    if (params.role && params.role !== 'ALL') query.set('role', params.role);
    if (params.department && params.department !== 'ALL') query.set('department', params.department);
    if (params.year && params.year !== 'ALL') query.set('year', params.year);
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    const qs = query.toString();
    const url = `/api/admin/users${qs ? `?${qs}` : ''}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to load user directory.');
    }

    return {
      users: (data.users || []) as ManagedUser[],
      stats: (data.stats || {
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        studentCount: 0,
        facultyCount: 0
      }) as UserManagementStats,
      pagination: (data.pagination || {
        page: 1,
        limit: 25,
        total: 0,
        totalPages: 1
      }) as UserManagementPagination
    };
  },

  /**
   * Retrieve full details for a single user by UID
   */
  async getUserDetails(uid: string): Promise<ManagedUser> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/admin/users?uid=${encodeURIComponent(uid)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to retrieve user details.');
    }

    return data.user as ManagedUser;
  },

  /**
   * Create a new student, faculty, or administrator account
   */
  async createUser(payload: CreateUserPayload): Promise<{ uid: string; email: string; name: string; message: string }> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create user.');
    }

    return {
      uid: data.uid,
      email: data.email,
      name: data.name,
      message: data.message || 'User created successfully.'
    };
  },

  /**
   * Edit permitted fields of an existing user profile
   */
  async updateUser(uid: string, updates: UpdateUserPayload): Promise<{ success: boolean; message: string }> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/admin/users?uid=${encodeURIComponent(uid)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(updates)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update user profile.');
    }

    return {
      success: true,
      message: data.message || 'User profile updated successfully.'
    };
  },

  /**
   * Activate or deactivate a user account in both Auth & Firestore
   */
  async setUserStatus(
    uid: string,
    action: 'activate' | 'deactivate',
    reason?: string
  ): Promise<{ success: boolean; isActive: boolean; accountStatus: string; message: string }> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/admin/users?uid=${encodeURIComponent(uid)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({ action, reason, statusAction: true })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Failed to ${action} user account.`);
    }

    return {
      success: true,
      isActive: data.isActive,
      accountStatus: data.accountStatus,
      message: data.message || `Account successfully ${action === 'activate' ? 'reactivated' : 'deactivated'}.`
    };
  },

  /**
   * Safely delete or retire an account while preserving historical event data
   */
  async deleteUser(uid: string): Promise<{ success: boolean; hasHistoricalRecords: boolean; message: string }> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/admin/users?uid=${encodeURIComponent(uid)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete user account.');
    }

    return {
      success: true,
      hasHistoricalRecords: !!data.hasHistoricalRecords,
      message: data.message || 'User deleted successfully.'
    };
  }
};
