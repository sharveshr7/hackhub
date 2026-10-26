import { deleteField } from 'firebase/firestore';
import type { Hackathon, Prize } from '../types';

/**
 * Checks if a value is a special Firestore sentinel (FieldValue, Timestamp) or native Date.
 * These objects must be preserved as-is and not traversed as plain objects.
 */
export function isFirestoreSentinel(value: any): boolean {
  if (!value || typeof value !== 'object') return false;
  if (value instanceof Date) return true;
  // FieldValue sentinels (serverTimestamp, deleteField, etc.) and Timestamps
  if (typeof value._methodName === 'string') return true;
  if (value._delegate !== undefined) return true;
  if (typeof value.toMillis === 'function') return true;
  if (typeof value.isEqual === 'function' && typeof value.nanoseconds === 'number') return true;
  return false;
}

/**
 * Recursively sanitizes any payload destined for Firestore by omitting any keys
 * with `undefined` values, removing `undefined` from arrays, and preserving legitimate
 * explicit values:
 * - 0 and other numbers (e.g., zero prize money, score 0, count 0)
 * - false and other booleans
 * - explicit nulls (where appropriate)
 * - non-undefined strings (including empty strings if intended)
 * - Firestore FieldValue / Timestamp / Date sentinels
 */
export function sanitizeForFirestore<T = Record<string, any>>(input: any): T {
  if (input === undefined) {
    return undefined as unknown as T;
  }

  if (input === null || typeof input !== 'object') {
    return input as T;
  }

  if (isFirestoreSentinel(input)) {
    return input as T;
  }

  if (Array.isArray(input)) {
    return input
      .map((item) => sanitizeForFirestore(item))
      .filter((item) => item !== undefined) as unknown as T;
  }

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) {
      continue; // Strictly omit undefined property
    }
    const sanitized = sanitizeForFirestore(value);
    if (sanitized !== undefined) {
      result[key] = sanitized;
    }
  }

  return result as T;
}

export interface SerializeHackathonOptions {
  isUpdate?: boolean;
}

/**
 * Type-safe serialization for Hackathon documents and updates.
 * Guarantees that:
 * 1. Optional fields like `prizePool` never evaluate to `undefined`.
 * 2. Explicit zero values (e.g., `0`, `"0"`, `minTeamSize: 1`, `prizePool: "0"`) are preserved.
 * 3. Empty optional strings are handled consistently according to the data model.
 * 4. Arrays (eligibility, rules, prizes, problemStatements, etc.) are sanitized recursively.
 * 5. On updates, empty optional fields can be safely omitted or deleted without wiping untouched data.
 */
export function serializeHackathonPayload(
  data: Partial<Hackathon>,
  options: SerializeHackathonOptions = {}
): Record<string, any> {
  const payload: Record<string, any> = {};

  // Core String Fields
  if (data.title !== undefined) {
    payload.title = String(data.title).trim();
  }
  if (data.organizer !== undefined) {
    payload.organizer = String(data.organizer).trim();
  }
  if (data.shortDescription !== undefined) {
    payload.shortDescription = String(data.shortDescription).trim();
    payload.description = payload.shortDescription;
  } else if (data.description !== undefined) {
    payload.description = String(data.description).trim();
    payload.shortDescription = payload.description;
  }

  if (data.tagline !== undefined) {
    payload.tagline = String(data.tagline).trim();
  }

  if (data.category !== undefined) {
    payload.category = data.category;
  }
  if (data.organizerType !== undefined) {
    payload.organizerType = data.organizerType;
  }

  if (data.officialUrl !== undefined) {
    payload.officialUrl = String(data.officialUrl).trim();
    payload.externalRegistrationUrl = payload.officialUrl;
  } else if (data.externalRegistrationUrl !== undefined) {
    payload.externalRegistrationUrl = String(data.externalRegistrationUrl).trim();
    payload.officialUrl = payload.externalRegistrationUrl;
  }

  if (data.department !== undefined) {
    payload.department = data.department;
  }

  if (data.isExternal !== undefined) {
    payload.isExternal = Boolean(data.isExternal);
  }

  if (data.mode !== undefined) {
    payload.mode = data.mode;
  }

  if (data.location !== undefined) {
    payload.location = String(data.location).trim();
    payload.venue = payload.location;
  } else if (data.venue !== undefined) {
    payload.venue = String(data.venue).trim();
    payload.location = payload.venue;
  }

  if (data.bannerUrl !== undefined) {
    payload.bannerUrl = String(data.bannerUrl).trim();
  }

  if (data.status !== undefined) {
    payload.status = data.status;
  }

  if (data.publishedBy !== undefined && data.publishedBy) {
    payload.publishedBy = data.publishedBy;
  }
  if (data.createdBy !== undefined && data.createdBy) {
    payload.createdBy = data.createdBy;
  }
  if (data.publisherName !== undefined && data.publisherName) {
    payload.publisherName = data.publisherName;
  }

  // Safe Handling of Prize Information:
  // Preserves 0 (e.g. 0, "0", "₹0", "None / Free")
  // Omits undefined completely. On updates with empty string, either deletes or omits.
  if (data.prizePool !== undefined) {
    const rawPrize = typeof data.prizePool === 'number' ? String(data.prizePool) : String(data.prizePool).trim();
    if (rawPrize.length > 0) {
      payload.prizePool = rawPrize;
      if (!data.prizes || data.prizes.length === 0) {
        payload.prizes = [{ title: 'Confirmed Prize Pool', reward: rawPrize }];
      }
    } else if (options.isUpdate) {
      payload.prizePool = deleteField();
      payload.prizes = [];
    }
    // On create with empty prize, prizePool is cleanly omitted from payload
  }

  // Prizes array
  if (data.prizes !== undefined) {
    if (Array.isArray(data.prizes)) {
      payload.prizes = data.prizes
        .filter((p): p is Prize => Boolean(p && typeof p === 'object'))
        .map((p) => {
          const item: Record<string, any> = {
            title: String(p.title || 'Prize').trim(),
            reward: String(p.reward || '').trim()
          };
          if (p.description !== undefined && String(p.description).trim()) {
            item.description = String(p.description).trim();
          }
          return item;
        });
    }
  }

  // Numeric Team Sizes: preserve 0 if explicitly provided, but enforce positive defaults
  if (data.minTeamSize !== undefined) {
    if (typeof data.minTeamSize === 'number' && !isNaN(data.minTeamSize)) {
      payload.minTeamSize = data.minTeamSize;
    }
  }
  if (data.maxTeamSize !== undefined) {
    if (typeof data.maxTeamSize === 'number' && !isNaN(data.maxTeamSize)) {
      payload.maxTeamSize = data.maxTeamSize;
    }
  }
  if (data.participantCount !== undefined) {
    if (typeof data.participantCount === 'number' && !isNaN(data.participantCount)) {
      payload.participantCount = data.participantCount;
    }
  }

  // Date Fields (Normalize ISO format or empty string)
  const sanitizeDateString = (dateVal: unknown): string => {
    if (!dateVal) return '';
    const dateStr = String(dateVal).trim();
    if (!dateStr) return '';
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? '' : parsed.toISOString();
  };

  if (data.registrationStart !== undefined) {
    payload.registrationStart = sanitizeDateString(data.registrationStart);
  }
  if (data.registrationDeadline !== undefined) {
    payload.registrationDeadline = sanitizeDateString(data.registrationDeadline);
  }
  if (data.eventStart !== undefined) {
    payload.eventStart = sanitizeDateString(data.eventStart);
  }
  if (data.eventEnd !== undefined) {
    payload.eventEnd = sanitizeDateString(data.eventEnd);
  }
  if (data.submissionDeadline !== undefined) {
    payload.submissionDeadline = sanitizeDateString(data.submissionDeadline);
  }

  // Array Fields (filter out empty strings/nulls)
  if (data.eligibility !== undefined) {
    payload.eligibility = Array.isArray(data.eligibility)
      ? data.eligibility.map((item) => String(item).trim()).filter(Boolean)
      : [];
  }
  if (data.rules !== undefined) {
    payload.rules = Array.isArray(data.rules)
      ? data.rules.map((item) => String(item).trim()).filter(Boolean)
      : [];
  }
  if (data.problemStatements !== undefined) {
    payload.problemStatements = Array.isArray(data.problemStatements)
      ? data.problemStatements.filter((item) => Boolean(item && typeof item === 'object'))
      : [];
  }
  if (data.evaluationCriteria !== undefined) {
    payload.evaluationCriteria = Array.isArray(data.evaluationCriteria)
      ? data.evaluationCriteria.filter((item) => Boolean(item && typeof item === 'object'))
      : [];
  }
  if (data.faq !== undefined) {
    payload.faq = Array.isArray(data.faq)
      ? data.faq.filter((item) => Boolean(item && typeof item === 'object' && item.question && item.answer))
      : [];
  }

  // Finally run generic recursive sanitizer
  return sanitizeForFirestore(payload);
}
