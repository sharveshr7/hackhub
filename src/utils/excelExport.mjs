const encoder = new TextEncoder();

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let value = n;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    }
    table[n] = value >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function columnName(index) {
  let value = index + 1;
  let name = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function xmlCell(reference, value, style = '') {
  const styleAttribute = style ? ` s="${style}"` : '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${reference}"${styleAttribute} t="n"><v>${value}</v></c>`;
  }
  if (typeof value === 'boolean') {
    return `<c r="${reference}"${styleAttribute} t="b"><v>${value ? 1 : 0}</v></c>`;
  }
  let text;
  if (value instanceof Date) {
    text = value.toISOString();
  } else if (value && typeof value === 'object' && typeof value.toDate === 'function') {
    text = value.toDate().toISOString();
  } else if (value && typeof value === 'object' && Number.isFinite(value.seconds)) {
    text = new Date(value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6)).toISOString();
  } else if (value && typeof value === 'object') {
    text = JSON.stringify(value);
  } else {
    text = String(value ?? '');
  }
  return `<c r="${reference}"${styleAttribute} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(text)}</t></is></c>`;
}

function dosDateTime() {
  // Fixed workbook timestamps make generated files reproducible.
  return { time: 0, date: (1 << 5) | 1 };
}

function zipStore(files) {
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;
  const { time, date } = dosDateTime();

  for (const [path, content] of files) {
    const name = encoder.encode(path);
    const data = encoder.encode(content);
    const checksum = crc32(data);
    const local = new Uint8Array(30 + name.length + data.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, time, true);
    localView.setUint16(12, date, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, name.length, true);
    localView.setUint16(28, 0, true);
    local.set(name, 30);
    local.set(data, 30 + name.length);
    localParts.push(local);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, time, true);
    centralView.setUint16(14, date, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, localOffset, true);
    central.set(name, 46);
    centralParts.push(central);
    localOffset += local.length;
  }

  const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, localOffset, true);
  endView.setUint16(20, 0, true);

  return new Blob([...localParts, ...centralParts, end], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

function safeSheetName(name) {
  const safe = String(name || 'Report').replace(/[\\/?*\[\]:]/g, ' ').trim().slice(0, 31);
  return safe || 'Report';
}

/** Create a real one-sheet XLSX workbook using inline strings and a compact ZIP container. */
export function createExcelWorkbook({ sheetName = 'Report', title = '', columns, rows }) {
  if (!Array.isArray(columns) || columns.length === 0) throw new Error('At least one Excel column is required.');
  if (!Array.isArray(rows)) throw new Error('Excel rows must be an array.');

  const normalizedSheetName = safeSheetName(sheetName);
  const headerRowNumber = title ? 2 : 1;
  const lastColumn = columnName(columns.length - 1);
  const sheetRows = [];
  let rowNumber = 1;

  if (title) {
    const titleCell = xmlCell(`A${rowNumber}`, title, '1');
    sheetRows.push(`<row r="${rowNumber}" ht="24" customHeight="1">${titleCell}</row>`);
    rowNumber += 1;
  }

  const headerCells = columns.map((column, index) =>
    xmlCell(`${columnName(index)}${rowNumber}`, column.header, '2')
  ).join('');
  sheetRows.push(`<row r="${rowNumber}">${headerCells}</row>`);
  const firstDataRow = rowNumber + 1;
  rowNumber += 1;

  for (const row of rows) {
    const cells = columns.map((column, index) =>
      xmlCell(`${columnName(index)}${rowNumber}`, row[column.key])
    ).join('');
    sheetRows.push(`<row r="${rowNumber}">${cells}</row>`);
    rowNumber += 1;
  }

  const lastRow = Math.max(rowNumber - 1, headerRowNumber);
  const filter = rows.length ? `<autoFilter ref="A${headerRowNumber}:${lastColumn}${lastRow}"/>` : '';
  const merge = title ? `<mergeCells count="1"><mergeCell ref="A1:${lastColumn}1"/></mergeCells>` : '';
  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<dimension ref="A1:${lastColumn}${lastRow}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="${headerRowNumber}" topLeftCell="A${firstDataRow}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="15"/><sheetData>${sheetRows.join('')}</sheetData>${filter}${merge}<pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/></worksheet>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xmlEscape(normalizedSheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const files = [
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml', workbookXml],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDBEAFE"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`],
    ['xl/worksheets/sheet1.xml', sheetXml]
  ];
  return zipStore(files);
}

export function downloadExcelWorkbook(options) {
  const blob = createExcelWorkbook(options);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const fileName = options.fileName || 'hackhub-report';
  link.download = fileName.toLowerCase().endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function resolveHackathonReference(hackathonId, hackathons) {
  const hackathon = hackathons.find((candidate) => candidate.id === hackathonId);
  return {
    name: hackathon?.title || 'Unresolved hackathon',
    id: hackathonId || '',
    status: hackathon ? 'Resolved' : 'Missing hackathon reference'
  };
}

export function getHackathonReportTitle(selectedHackathonId, hackathons) {
  if (!selectedHackathonId || selectedHackathonId === 'ALL' || selectedHackathonId === 'all') {
    return 'Multiple Hackathons';
  }
  const hackathon = hackathons.find((candidate) => candidate.id === selectedHackathonId);
  return hackathon?.title || `Unresolved hackathon (${selectedHackathonId})`;
}
