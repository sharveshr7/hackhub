/**
 * HackHub Department Constants & Utilities
 * 
 * HackHub strictly supports only two academic departments:
 * 1. Biotechnology
 * 2. Biomedical Engineering
 */

export const SUPPORTED_DEPARTMENTS = [
  'Biotechnology',
  'Biomedical Engineering'
] as const;

export type SupportedDepartment = (typeof SUPPORTED_DEPARTMENTS)[number];

export const DEPARTMENT_CODES: Record<SupportedDepartment, string> = {
  'Biotechnology': 'BT',
  'Biomedical Engineering': 'BME'
};

/**
 * Checks whether a department string is strictly one of the supported departments
 */
export function isSupportedDepartment(dept: unknown): dept is SupportedDepartment {
  if (typeof dept !== 'string') return false;
  return SUPPORTED_DEPARTMENTS.includes(dept.trim() as SupportedDepartment);
}

/**
 * Normalizes input strings (handling case, common abbreviations) to supported department name
 */
export function normalizeDepartment(dept: unknown): SupportedDepartment | null {
  if (typeof dept !== 'string') return null;
  const clean = dept.trim().toLowerCase();
  
  if (clean === 'biotechnology' || clean === 'biotech' || clean === 'bt' || clean === 'b.tech biotechnology') {
    return 'Biotechnology';
  }
  
  if (
    clean === 'biomedical engineering' ||
    clean === 'biomedical' ||
    clean === 'bme' ||
    clean === 'b.e. biomedical engineering' ||
    clean === 'b.e biomedical engineering'
  ) {
    return 'Biomedical Engineering';
  }

  return null;
}

/**
 * Returns a display badge metadata for a given department
 */
export function getDepartmentBadge(dept: string | undefined | null): {
  isValid: boolean;
  name: string;
  shortCode: string;
  colorClass: string;
  className: string;
  badgeText: string;
} {
  const norm = normalizeDepartment(dept);
  if (norm === 'Biotechnology') {
    const colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
    return {
      isValid: true,
      name: 'Biotechnology',
      shortCode: 'BT',
      colorClass,
      className: colorClass,
      badgeText: 'Biotechnology'
    };
  }
  if (norm === 'Biomedical Engineering') {
    const colorClass = 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800';
    return {
      isValid: true,
      name: 'Biomedical Engineering',
      shortCode: 'BME',
      colorClass,
      className: colorClass,
      badgeText: 'Biomedical Engineering'
    };
  }
  const colorClass = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
  return {
    isValid: false,
    name: dept ? String(dept) : 'Unassigned',
    shortCode: 'UNSUPPORTED',
    colorClass,
    className: colorClass,
    badgeText: dept ? `Unsupported: ${dept}` : 'Missing Department'
  };
}

/**
 * HackHub Supported Student Academic-Year Categories
 * 1. First Year
 * 2. Second Year
 * 3. Third Year
 */
export const SUPPORTED_ACADEMIC_YEARS = [
  'First Year',
  'Second Year',
  'Third Year'
] as const;

export type SupportedAcademicYear = (typeof SUPPORTED_ACADEMIC_YEARS)[number];

/**
 * Normalizes academic year input strings (supporting legacy '1st Year' etc.)
 */
export function normalizeAcademicYear(year: unknown): SupportedAcademicYear | null {
  if (typeof year !== 'string') return null;
  const clean = year.trim().toLowerCase();
  if (clean === '1st year' || clean === 'first year' || clean === '1' || clean === 'year 1') {
    return 'First Year';
  }
  if (clean === '2nd year' || clean === 'second year' || clean === '2' || clean === 'year 2') {
    return 'Second Year';
  }
  if (clean === '3rd year' || clean === 'third year' || clean === '3' || clean === 'year 3') {
    return 'Third Year';
  }
  return null;
}

export function isSupportedAcademicYear(year: unknown): year is SupportedAcademicYear {
  return normalizeAcademicYear(year) !== null;
}

/**
 * Department-Specific Faculty Research Specializations
 */
export const BIOTECHNOLOGY_SPECIALIZATIONS = [
  'Molecular Biology',
  'Genetic Engineering',
  'Bioinformatics',
  'Microbiology',
  'Bioprocess Technology',
  'Cell and Tissue Culture',
  'Environmental Biotechnology',
  'Other'
] as const;

export const BIOMEDICAL_SPECIALIZATIONS = [
  'Medical Imaging',
  'Biomedical Instrumentation',
  'Biosensors',
  'Rehabilitation Engineering',
  'Biomaterials',
  'Medical Signal Processing',
  'AI in Healthcare',
  'Biomechanics',
  'Other'
] as const;

export type BiotechnologySpecialization = (typeof BIOTECHNOLOGY_SPECIALIZATIONS)[number];
export type BiomedicalSpecialization = (typeof BIOMEDICAL_SPECIALIZATIONS)[number];

export const DEPARTMENT_SPECIALIZATIONS: Record<SupportedDepartment, readonly string[]> = {
  'Biotechnology': BIOTECHNOLOGY_SPECIALIZATIONS,
  'Biomedical Engineering': BIOMEDICAL_SPECIALIZATIONS
};

/**
 * Returns the permitted specializations for a given department
 */
export function getSpecializationsForDepartment(dept: unknown): readonly string[] {
  const norm = normalizeDepartment(dept);
  if (norm && DEPARTMENT_SPECIALIZATIONS[norm]) {
    return DEPARTMENT_SPECIALIZATIONS[norm];
  }
  return [];
}

/**
 * Checks whether a specialization belongs to the specified department
 */
export function isValidSpecialization(dept: unknown, spec: unknown): boolean {
  if (typeof spec !== 'string') return false;
  const list = getSpecializationsForDepartment(dept);
  return list.includes(spec.trim());
}

/**
 * Sanitizes custom specialization text for "Other" selections
 */
export function sanitizeCustomSpecialization(text: unknown): string {
  if (typeof text !== 'string') return '';
  // Strip control characters, excessive whitespace, and HTML tags
  return text
    .replace(/<[^>]*>?/gm, '')
    .replace(/[^\w\s\-\.\,\(\)\/]/gi, '')
    .trim()
    .slice(0, 100);
}
