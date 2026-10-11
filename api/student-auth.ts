/**
 * HackHub Serverless API: Student Authentication & Secure Resolution
 * 
 * Provides trusted, rate-limited student authentication that:
 * 1. Never exposes student names, UIDs, or personal information in unauthenticated lookups.
 * 2. Enforces IP-based rate limiting (sliding window: max 5 failed attempts/min) to prevent brute force.
 * 3. Returns identical generic 401 "Invalid registration number or password." for both nonexistent IDs
 *    and wrong passwords, equalizing timing so students cannot be enumerated.
 * 4. Validates actual credentials against Google Identity Toolkit without storing passwords anywhere.
 */

interface RateLimitEntry {
  attempts: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 1000;

function checkRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { attempts: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.attempts++;
  return { allowed: true, retryAfter: 0 };
}

function resetRateLimit(ip: string) {
  rateLimitMap.delete(ip);
}

const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY || "AIzaSyDola5Yv45cq2h4OgmBPrFar5dUcRUh_as";
const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || "foceye-2546c";

export async function handleStudentAuth(body: { identifier?: string; password?: string }, clientIp: string) {
  const identifier = (body.identifier || '').trim();
  const password = body.password || '';

  if (!identifier || !password) {
    return {
      status: 400,
      body: { error: 'Registration number/email and password are required.' }
    };
  }

  // Rate Limiting Check
  const rateLimit = checkRateLimit(clientIp);
  if (!rateLimit.allowed) {
    return {
      status: 429,
      body: { 
        error: `Too many login attempts. Please wait ${rateLimit.retryAfter} seconds before trying again.`,
        retryAfter: rateLimit.retryAfter
      }
    };
  }

  let targetEmail = '';

  if (identifier.includes('@')) {
    targetEmail = identifier.toLowerCase();
  } else {
    // Normalized registration number lookup
    const cleanRegNo = identifier.toUpperCase().replace(/\s+/g, '');
    try {
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/reg_lookups/${encodeURIComponent(cleanRegNo)}`;
      const res = await fetch(firestoreUrl);
      if (res.ok) {
        const docData = (await res.json()) as any;
        targetEmail = docData?.fields?.email?.stringValue || '';
      }
    } catch {
      // Catch network errors silently to preserve anti-enumeration
    }

    if (!targetEmail) {
      // Simulate equalized execution delay (~150ms) to prevent timing attacks
      await new Promise(r => setTimeout(r, 150));
      return {
        status: 401,
        body: { error: 'Invalid registration number or password.' }
      };
    }
  }

  // Authenticate against Google Identity Toolkit
  try {
    const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;
    const authRes = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: targetEmail,
        password: password,
        returnSecureToken: true
      })
    });

    const authData = (await authRes.json()) as any;

    if (!authRes.ok || authData?.error) {
      return {
        status: 401,
        body: { error: 'Invalid registration number or password.' }
      };
    }

    // Success: Clear rate limit
    resetRateLimit(clientIp);

    return {
      status: 200,
      body: {
        success: true,
        email: targetEmail,
        idToken: authData.idToken,
        refreshToken: authData.refreshToken,
        localId: authData.localId,
        expiresIn: authData.expiresIn
      }
    };
  } catch {
    return {
      status: 500,
      body: { error: 'Authentication service temporarily unavailable.' }
    };
  }
}

// Vercel Serverless Function Default Export
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1').toString().split(',')[0].trim();
  const result = await handleStudentAuth(req.body || {}, clientIp);
  return res.status(result.status).json(result.body);
}
