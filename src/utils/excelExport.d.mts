export interface ExcelColumn {
  header: string;
  key: string;
}

export interface ExcelWorkbookOptions {
  sheetName?: string;
  title?: string;
  columns: ExcelColumn[];
  rows: Array<Record<string, unknown>>;
  fileName?: string;
}

export function createExcelWorkbook(options: ExcelWorkbookOptions): Blob;
export function downloadExcelWorkbook(options: ExcelWorkbookOptions): void;
export function resolveHackathonReference(
  hackathonId: string | undefined,
  hackathons: Array<{ id: string; title?: string }>
): { name: string; id: string; status: string };
export function getHackathonReportTitle(
  selectedHackathonId: string | undefined,
  hackathons: Array<{ id: string; title?: string }>
): string;
