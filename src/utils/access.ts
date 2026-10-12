import type { UserRole } from '../types';
import type { CurrentUser } from '../lib/store';

export function isStaffRole(role: UserRole | null | undefined): boolean {
  return role === 'ADMIN' || role === 'FACULTY';
}

export function isPlatformAdministrator(user: CurrentUser | null | undefined): boolean {
  return user?.role === 'ADMIN' && user.adminData?.isPlatformAdmin === true;
}

export function isDepartmentApprover(user: CurrentUser | null | undefined): boolean {
  return isStaffRole(user?.role) && user?.adminData?.isDepartmentApprover === true;
}
