/**
 * format.ts — format string parsing, token metadata, and date/time read/write helpers.
 */

import { DateToken } from "../types/date-token.type";
import { Segment } from "../types/segment.type";

// ─── Input type helpers ───────────────────────────────────────────────────────

export type InputKind = 'date' | 'time' | 'datetime-local';

export function getInputKind(input: HTMLInputElement): InputKind {
  const t = input.type as InputKind;
  if (t === 'time' || t === 'datetime-local') return t;
  return 'date';
}

// ─── Format parsing ───────────────────────────────────────────────────────────

/**
 * Parse a format string into an ordered array of Segment descriptors.
 * Date tokens: yyyy, yy, MM, M, dd, d
 * Time tokens: HH, H, hh, h, mm, ss
 * Everything else is treated as a literal separator.
 *
 * NOTE: token regex order matters — longer tokens must appear before shorter ones.
 */
export function parseFormat(format: string): Segment[] {
  // yyyy/yy must precede MM/M; HH before H; hh before h; dd before d
  const TOKEN_RE = /yyyy|yy|YYYY|YY|MM|M|HH|H|hh|h|mm|ss|dd|DD|d|D/g;
  const segments: Segment[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = TOKEN_RE.exec(format)) !== null) {
    if (match.index > cursor) {
      const lit = format.slice(cursor, match.index);
      segments.push({ token: null, text: lit, start: cursor, end: match.index });
    }
    segments.push({
      token: match[0] as DateToken,
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
    cursor = match.index + match[0].length;
  }

  if (cursor < format.length) {
    const lit = format.slice(cursor);
    segments.push({ token: null, text: lit, start: cursor, end: format.length });
  }

  return segments;
}

/**
 * Build a combined format string for datetime-local inputs.
 * e.g. dateFormat="dd/MM/yyyy", timeFormat="HH:mm", delimiter=" "
 * → "dd/MM/yyyy HH:mm"
 */
export function buildDateTimeFormat(dateFormat: string, timeFormat: string, delimiter: string): string {
  return `${dateFormat}${delimiter}${timeFormat}`;
}

// ─── Token classification ─────────────────────────────────────────────────────

export function isTimeToken(token: DateToken): boolean {
  return token === 'HH' || token === 'H' || token === 'hh' || token === 'h'
      || token === 'mm' || token === 'ss';
}

export function isDateToken(token: DateToken): boolean {
  return !isTimeToken(token);
}

// ─── Token metadata ───────────────────────────────────────────────────────────

export function tokenValue(token: DateToken, date: Date | null): string {
  if (!date) return '';
  switch (token) {
    // ── Date ──
    case 'dd':   return pad(date.getDate(), 2);
    case 'd':    return String(date.getDate());
    case 'MM':   return pad(date.getMonth() + 1, 2);
    case 'M':    return String(date.getMonth() + 1);
    case 'yyyy': return pad(date.getFullYear(), 4);
    case 'yy':   return pad(date.getFullYear() % 100, 2);
    // ── Time ──
    case 'HH':   return pad(date.getHours(), 2);
    case 'H':    return String(date.getHours());
    case 'hh':   return pad(to12h(date.getHours()), 2);
    case 'h':    return String(to12h(date.getHours()));
    case 'mm':   return pad(date.getMinutes(), 2);
    case 'ss':   return pad(date.getSeconds(), 2);
  }
}

export function tokenPlaceholder(token: DateToken): string {
  switch (token) {
    case 'dd':   return 'dd';
    case 'd':    return 'd';
    case 'MM':   return 'mm';
    case 'M':    return 'm';
    case 'yyyy': return 'yyyy';
    case 'yy':   return 'yy';
    case 'HH':   return 'HH';
    case 'H':    return 'H';
    case 'hh':   return 'hh';
    case 'h':    return 'h';
    case 'mm':   return 'mm';
    case 'ss':   return 'ss';
  }
}

export function tokenMaxDigits(token: DateToken): number {
  switch (token) {
    case 'dd': case 'd':                      return 2;
    case 'MM': case 'M':                      return 2;
    case 'yyyy':                              return 4;
    case 'yy':                               return 2;
    case 'HH': case 'H': case 'hh': case 'h': return 2;
    case 'mm':                               return 2;
    case 'ss':                               return 2;
  }
}

export function tokenMaxValue(token: DateToken): number {
  switch (token) {
    case 'dd': case 'd':   return 31;
    case 'MM': case 'M':   return 12;
    case 'yyyy':           return 9999;
    case 'yy':             return 99;
    case 'HH': case 'H':   return 23;
    case 'hh': case 'h':   return 12;
    case 'mm':             return 59;
    case 'ss':             return 59;
  }
}

export function tokenMinValue(token: DateToken): number {
  switch (token) {
    case 'dd': case 'd':   return 1;
    case 'MM': case 'M':   return 1;
    case 'yyyy':           return 1;
    case 'yy':             return 0;
    case 'HH': case 'H':   return 0;
    case 'hh': case 'h':   return 1;
    case 'mm':             return 0;
    case 'ss':             return 0;
  }
}

// ─── Date/time construction ───────────────────────────────────────────────────

/** Clamp a year/month/day combination to a real calendar date. */
export function buildDate(current: Date | null, token: DateToken, newRaw: number): Date {
  const base = current ?? new Date();
  let y = base.getFullYear();
  let mo = base.getMonth() + 1; // 1-based
  let d = base.getDate();
  let h = base.getHours();
  let mi = base.getMinutes();
  let s = base.getSeconds();

  switch (token) {
    case 'dd': case 'd':    d  = newRaw; break;
    case 'MM': case 'M':    mo = newRaw; break;
    case 'yyyy':            y  = newRaw; break;
    case 'yy':              y  = 2000 + newRaw; break;
    case 'HH': case 'H':   h  = newRaw; break;
    case 'hh': case 'h':   h  = from12h(newRaw, h); break;
    case 'mm':              mi = newRaw; break;
    case 'ss':              s  = newRaw; break;
  }

  // Clamp day to valid range for the given month/year
  const maxDay = new Date(y, mo, 0).getDate();
  d = Math.max(1, Math.min(d, maxDay));
  return new Date(y, mo - 1, d, h, mi, s);
}

// ─── Input read/write ─────────────────────────────────────────────────────────

/** Read a Date from input. Supports date, time, and datetime-local inputs. */
export function readInputDate(input: HTMLInputElement): Date | null {
  if (!input.value) return null;
  const kind = getInputKind(input);

  if (kind === 'date') {
    return parseDateISO(input.value);
  }
  if (kind === 'time') {
    return parseTimeISO(input.value);
  }
  // datetime-local: "yyyy-MM-ddTHH:mm" or "yyyy-MM-ddTHH:mm:ss"
  return parseDateTimeISO(input.value);
}

/** Write a Date back as ISO string appropriate for the input type, and fire native events. */
export function writeInputDate(input: HTMLInputElement, date: Date): void {
  const kind = getInputKind(input);
  if (kind === 'date') {
    input.value = formatDateISO(date);
  } else if (kind === 'time') {
    input.value = formatTimeISO(date);
  } else {
    input.value = formatDateTimeISO(date);
  }
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

// ─── ISO format helpers ───────────────────────────────────────────────────────

function parseDateISO(value: string): Date | null {
  const parts = value.split('-');
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return new Date(y, m - 1, d);
}

function parseTimeISO(value: string): Date | null {
  // "HH:mm" or "HH:mm:ss"
  const parts = value.split(':');
  if (parts.length < 2) return null;
  const [h, mi, s = 0] = parts.map(Number);
  if (isNaN(h) || isNaN(mi)) return null;
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, mi, s);
}

function parseDateTimeISO(value: string): Date | null {
  // "yyyy-MM-ddTHH:mm" or "yyyy-MM-ddTHH:mm:ss"
  const [datePart, timePart] = value.split('T');
  if (!datePart || !timePart) return null;
  const dateOnly = parseDateISO(datePart);
  if (!dateOnly) return null;
  const timeParts = timePart.split(':').map(Number);
  const [h = 0, mi = 0, s = 0] = timeParts;
  return new Date(dateOnly.getFullYear(), dateOnly.getMonth(), dateOnly.getDate(), h, mi, s);
}

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1, 2);
  const d = pad(date.getDate(), 2);
  return `${y}-${m}-${d}`;
}

function formatTimeISO(date: Date): string {
  const h  = pad(date.getHours(), 2);
  const mi = pad(date.getMinutes(), 2);
  const s  = pad(date.getSeconds(), 2);
  return `${h}:${mi}:${s}`;
}

function formatDateTimeISO(date: Date): string {
  return `${formatDateISO(date)}T${formatTimeISO(date)}`;
}

// ─── Paste parser ─────────────────────────────────────────────────────────────

const PASTE_DATE_FALLBACKS   = ['yyyy-MM-dd', 'dd/MM/yyyy', 'MM/dd/yyyy', 'd.M.yyyy', 'MM-dd-yyyy'];
const PASTE_TIME_FALLBACKS   = ['HH:mm:ss', 'HH:mm', 'H:mm'];
const PASTE_DATETIME_FALLBACKS = ['yyyy-MM-dd HH:mm:ss', 'yyyy-MM-dd HH:mm', 'dd/MM/yyyy HH:mm'];

/**
 * Try to parse a pasted string for date, time, or datetime-local inputs.
 * Uses preferredFormat first, then common fallbacks.
 */
export function parsePastedDate(
  text: string,
  preferredFormat: string,
  kind: InputKind = 'date',
): Date | null {
  let fallbacks: string[];
  if (kind === 'time')           fallbacks = PASTE_TIME_FALLBACKS;
  else if (kind === 'datetime-local') fallbacks = PASTE_DATETIME_FALLBACKS;
  else                           fallbacks = PASTE_DATE_FALLBACKS;

  const formats = [preferredFormat, ...fallbacks.filter(f => f !== preferredFormat)];
  for (const fmt of formats) {
    const d = parseWithFormat(text, fmt, kind);
    if (d) return d;
  }
  return null;
}

function parseWithFormat(text: string, format: string, kind: InputKind): Date | null {
  const segs = parseFormat(format);
  let pos = 0;
  const now = new Date();
  let d = now.getDate(), mo = now.getMonth() + 1, y = now.getFullYear();
  let h = 0, mi = 0, s = 0;

  for (const seg of segs) {
    if (pos >= text.length) break;
    if (!seg.token) {
      if (text.slice(pos, pos + seg.text.length) === seg.text) pos += seg.text.length;
      continue;
    }
    const maxDigits = tokenMaxDigits(seg.token);
    let chunk = '';
    for (let i = 0; i < maxDigits && pos < text.length; i++, pos++) {
      if (!/\d/.test(text[pos])) break;
      chunk += text[pos];
    }
    if (!chunk) return null;
    const num = parseInt(chunk, 10);
    switch (seg.token) {
      case 'dd': case 'd':    d  = num; break;
      case 'MM': case 'M':    mo = num; break;
      case 'yyyy':            y  = num; break;
      case 'yy':              y  = 2000 + num; break;
      case 'HH': case 'H':   h  = num; break;
      case 'hh': case 'h':   h  = from12h(num, h); break;
      case 'mm':              mi = num; break;
      case 'ss':              s  = num; break;
    }
  }

  if (kind === 'date' || kind === 'datetime-local') {
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  }
  if (kind === 'time') {
    if (h < 0 || h > 23 || mi < 0 || mi > 59) return null;
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, mi, s);
  }
  return new Date(y, mo - 1, d, h, mi, s);
}

// ─── Utility ──────────────────────────────────────────────────────────────────

export function pad(n: number, len: number): string {
  return String(n).padStart(len, '0');
}

function to12h(h24: number): number {
  if (h24 === 0) return 12;
  if (h24 > 12)  return h24 - 12;
  return h24;
}

function from12h(h12: number, currentH24: number): number {
  // Preserve AM/PM based on current hour
  const isPM = currentH24 >= 12;
  if (h12 === 12) return isPM ? 12 : 0;
  return isPM ? h12 + 12 : h12;
}
