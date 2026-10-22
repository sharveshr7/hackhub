import usersHandler from '../users.ts';

/**
 * Vercel Serverless Dynamic Route: /api/admin/users/:uid
 * Handles GET, PATCH, DELETE for a specific user UID
 */
export default async function handler(req: any, res: any) {
  return usersHandler(req, res);
}
