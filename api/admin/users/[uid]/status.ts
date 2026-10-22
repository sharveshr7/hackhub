import usersHandler from '../../users.ts';

/**
 * Vercel Serverless Dynamic Route: /api/admin/users/:uid/status
 * Handles account activation and deactivation
 */
export default async function handler(req: any, res: any) {
  if (req.body && typeof req.body === 'object') {
    req.body.statusAction = true;
  }
  return usersHandler(req, res);
}
