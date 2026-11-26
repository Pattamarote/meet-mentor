import 'server-only';
import ExcelJS from 'exceljs';

export async function readSheet(file: File): Promise<unknown[][]> {
  const wb = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load((await file.arrayBuffer()) as any);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const rows: unknown[][] = [];
  ws.eachRow({ includeEmpty: true }, (row, n) => {
    const vals = (row.values as unknown[]).slice(1);
    rows[n - 1] = vals.map(cellValue);
  });
  return rows.map((r) => r ?? []);
}

function cellValue(v: unknown): unknown {
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (v instanceof Date) return v;
    if ('result' in o) return cellValue(o.result);
    if ('text' in o) return String(o.text);
    if ('richText' in o) return (o.richText as { text: string }[]).map((t) => t.text).join('');
    if ('hyperlink' in o) return String(o.hyperlink);
  }
  return v;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** แปลงค่าเซลล์เป็น YYYY-MM-DD (รองรับ Date ของ Excel, 2026-12-08, 8/12/2026, ปี พ.ศ.) */
export function toDateStr(v: unknown): string | null {
  if (v instanceof Date) return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`;
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    const d = new Date(Math.round((v - 25569) * 86400000));
    return toDateStr(d);
  }
  const s = String(v ?? '').trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const y = Number(m[1]) > 2400 ? Number(m[1]) - 543 : Number(m[1]);
    return `${y}-${pad(+m[2])}-${pad(+m[3])}`;
  }
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) {
    const y = Number(m[3]) > 2400 ? Number(m[3]) - 543 : Number(m[3]);
    return `${y}-${pad(+m[2])}-${pad(+m[1])}`;
  }
  return null;
}

/** แปลงค่าเซลล์เป็น HH:MM */
export function toTimeStr(v: unknown): string | null {
  if (v instanceof Date) return `${pad(v.getUTCHours())}:${pad(v.getUTCMinutes())}`;
  if (typeof v === 'number' && v >= 0 && v < 1) {
    const mins = Math.round(v * 24 * 60);
    return `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
  }
  const s = String(v ?? '').trim().replace('.', ':');
  const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (m) return `${pad(+m[1])}:${m[2]}`;
  return null;
}

export function str(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  return String(v).trim();
}

export async function sendWorkbook(wb: ExcelJS.Workbook, filename: string) {
  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store',
    },
  });
}

export function styleHeader(ws: ExcelJS.Worksheet) {
  const r = ws.getRow(1);
  r.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5BEA' } };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
}

export { ExcelJS };
