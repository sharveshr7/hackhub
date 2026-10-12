import type { Hackathon } from '../types';

/** Remove legacy public attendance secrets before a hackathon enters client state. */
export function sanitizeHackathonDocument(id: string, data: Record<string, unknown>): Hackathon {
  const safeData = { ...data } as Record<string, unknown> & { id: string };
  safeData.id = id;
  delete safeData.attendanceCode;
  delete safeData.attendanceOpen;
  return safeData as unknown as Hackathon;
}
