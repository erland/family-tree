// src/utils/dateUtils.ts
export type YMD = { y?: number; m?: number; d?: number };

export function parseISO(d?: string): Date | null {
  if (!d) return null;
  // Accepts "YYYY", "YYYY-MM", "YYYY-MM-DD"
  const [yyyy, mm, dd] = d.split("-");
  const y = Number(yyyy);
  const m = mm ? Number(mm) - 1 : 0;
  const day = dd ? Number(dd) : 1;
  if (!y || Number.isNaN(y)) return null;
  const dt = new Date(Date.UTC(y, m, day));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function monthsBetween(a: Date, b: Date): number {
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
}

/** Swedish age string: "<m> mån" if < 24 months, else "<y> år". */
export function formatAge(birth?: string, event?: string): string | undefined {
  if (!birth || !event) return;
  const b = parseISO(birth);
  const e = parseISO(event);
  if (!b || !e) return;
  const months = monthsBetween(b, e);
  if (months < 24) return `${months} mån`;
  const years = Math.floor(months / 12);
  return `${years} år`;
}

export const GEDCOM_MONTH_ABBR = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"] as const;
export const SWEDISH_MONTH_ABBR = ["jan","feb","mar","apr","maj","jun","jul","aug","sep","okt","nov","dec"] as const;

export function splitDateYYYYMMDD(dateStr?: string): YMD {
  if (!dateStr) return {};
  const [y, m, d] = dateStr.split("-");
  return {
    y: y ? Number(y) : undefined,
    m: m ? Number(m) : undefined,
    d: d ? Number(d) : undefined,
  };
}

export function buildDateYYYYMMDD({ y, m, d }: YMD): string | undefined {
  if (!y) return undefined;
  const mm = m ? String(m).padStart(2, "0") : undefined;
  const dd = d ? String(d).padStart(2, "0") : undefined;
  return [String(y), mm, dd].filter(Boolean).join("-");
}

/** GEDCOM "DD MON YYYY" or partials like "MON YYYY" / "YYYY". */
export function formatGedcomDate(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;
  const { y, m, d } = splitDateYYYYMMDD(dateStr);
  if (!y) return undefined;
  const mon = m ? GEDCOM_MONTH_ABBR[(m - 1) as number] : undefined;
  const day = d ? String(d).padStart(2, "0") : undefined;
  return [day, mon, String(y)].filter(Boolean).join(" ");
}

// Back-compat convenience re-exports used elsewhere
export { parseISO as parseDate };
export { formatAge as calculateAgeAtEvent };