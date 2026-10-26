import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Obsolete: Staff accounts do not require HOD or faculty approval.
 * Any legacy navigation to this route redirects directly to /admin.
 */
export const AdminFacultyApprovalsPage: React.FC = () => {
  return <Navigate to="/admin" replace />;
};

export default AdminFacultyApprovalsPage;
