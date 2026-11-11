export type RangeKey = 'all' | 'today' | 'week' | 'month' | 'lastMonth' | 'fy' | 'custom';

export const RANGE_LABELS: Record<RangeKey, string> = {
  all: 'All time',
  today: 'Today',
  week: 'Last 7 days',
  month: 'This month',
  lastMonth: 'Last month',
  fy: 'This FY',
  custom: 'Custom',
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

/** Indian financial year starts 1 April. */
export const fyStart = (d = new Date()) => new Date(d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1, 3, 1);

export function rangeBounds(key: RangeKey, from?: string, to?: string): [Date | null, Date | null] {
  const now = new Date();
  switch (key) {
    case 'today': return [startOfDay(now), endOfDay(now)];
    case 'week': return [startOfDay(new Date(now.getTime() - 6 * 86400000)), endOfDay(now)];
    case 'month': return [new Date(now.getFullYear(), now.getMonth(), 1), endOfDay(now)];
    case 'lastMonth': return [new Date(now.getFullYear(), now.getMonth() - 1, 1), endOfDay(new Date(now.getFullYear(), now.getMonth(), 0))];
    case 'fy': return [fyStart(now), endOfDay(now)];
    case 'custom': {
      const parse = (s?: string) => { if (!s) return null; const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
      const f = parse(from), t = parse(to);
      return [f ? startOfDay(f) : null, t ? endOfDay(t) : null];
    }
    default: return [null, null];
  }
}

export const inRange = (d: Date, [a, b]: [Date | null, Date | null]) => {
  const t = new Date(d).getTime();
  return (!a || t >= a.getTime()) && (!b || t <= b.getTime());
};

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = '﻿' + [headers, ...rows].map(r => r.map(esc).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
