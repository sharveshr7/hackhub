import type { UserRole } from '../types';
import type { CurrentUser } from '../lib/store';

export function isStaffRole(role: UserRole | null | undefined): boolean {
  return role === 'ADMIN' || role === 'FACULTY';
}

export function isPlatformAdministrator(user: CurrentUser | null | undefined): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  const adminData = user.adminData;
  if (adminData?.isPlatformAdmin === true) return true;
  if (adminData?.isFirstAdmin === true) return true;
  if ((adminData?.role as string) === 'ADMIN') return true;
  return false;
}

export function isDepartmentApprover(user: CurrentUser | null | undefined): boolean {
  return isStaffRole(user?.role) && user?.adminData?.isDepartmentApprover === true;
}
