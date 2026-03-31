/**
 * format.ts — format string parsing, token metadata, and date read/write helpers.
 */
// ─── Format parsing ───────────────────────────────────────────────────────────
/**
 * Parse a format string into an ordered array of Segment descriptors.
 * Recognised tokens: yyyy, yy, MM, M, dd, d.
 * Everything else is treated as a literal separator.
 */
export function parseFormat(format) {
    const TOKEN_RE = /yyyy|yy|YYYY|YY|MM|M|dd|DD|d|D/g;
    const segments = [];
    let cursor = 0;
    let match;
    while ((match = TOKEN_RE.exec(format)) !== null) {
        if (match.index > cursor) {
            const lit = format.slice(cursor, match.index);
            segments.push({ token: null, text: lit, start: cursor, end: match.index });
        }
        segments.push({
            token: match[0],
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
// ─── Token metadata ───────────────────────────────────────────────────────────
export function tokenValue(token, date) {
    if (!date)
        return '';
    switch (token) {
        case 'dd': return pad(date.getDate(), 2);
        case 'd': return String(date.getDate());
        case 'MM': return pad(date.getMonth() + 1, 2);
        case 'M': return String(date.getMonth() + 1);
        case 'yyyy': return pad(date.getFullYear(), 4);
        case 'yy': return pad(date.getFullYear() % 100, 2);
    }
}
export function tokenPlaceholder(token) {
    switch (token) {
        case 'dd': return 'dd';
        case 'd': return 'd';
        case 'MM': return 'mm';
        case 'M': return 'm';
        case 'yyyy': return 'yyyy';
        case 'yy': return 'yy';
    }
}
export function tokenMaxDigits(token) {
    switch (token) {
        case 'dd':
        case 'd': return 2;
        case 'MM':
        case 'M': return 2;
        case 'yyyy': return 4;
        case 'yy': return 2;
    }
}
export function tokenMaxValue(token) {
    switch (token) {
        case 'dd':
        case 'd': return 31;
        case 'MM':
        case 'M': return 12;
        case 'yyyy': return 9999;
        case 'yy': return 99;
    }
}
export function tokenMinValue(token) {
    switch (token) {
        case 'dd':
        case 'd': return 1;
        case 'MM':
        case 'M': return 1;
        case 'yyyy': return 1;
        case 'yy': return 0;
    }
}
// ─── Date construction ────────────────────────────────────────────────────────
/** Clamp a year/month/day combination to a real calendar date. */
export function buildDate(current, token, newRaw) {
    const base = current !== null && current !== void 0 ? current : new Date();
    let y = base.getFullYear();
    let m = base.getMonth() + 1; // 1-based
    let d = base.getDate();
    switch (token) {
        case 'dd':
        case 'd':
            d = newRaw;
            break;
        case 'MM':
        case 'M':
            m = newRaw;
            break;
        case 'yyyy':
            y = newRaw;
            break;
        case 'yy':
            y = 2000 + newRaw;
            break;
    }
    // Clamp day to valid range for the given month/year
    const maxDay = new Date(y, m, 0).getDate();
    d = Math.max(1, Math.min(d, maxDay));
    return new Date(y, m - 1, d);
}
// ─── Input read/write ─────────────────────────────────────────────────────────
/** Read a date-only ISO string (yyyy-MM-dd) from the hidden input. */
export function readInputDate(input) {
    if (!input.value)
        return null;
    const parts = input.value.split('-');
    if (parts.length !== 3)
        return null;
    const [y, m, d] = parts.map(Number);
    if (isNaN(y) || isNaN(m) || isNaN(d))
        return null;
    return new Date(y, m - 1, d);
}
/** Write a Date back as ISO date (yyyy-MM-dd) and fire native events. */
export function writeInputDate(input, date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    input.value = `${y}-${m}-${d}`;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
}
// ─── Paste parser ─────────────────────────────────────────────────────────────
const PASTE_FALLBACKS = ['yyyy-MM-dd', 'dd/MM/yyyy', 'MM/dd/yyyy', 'd.M.yyyy', 'MM-dd-yyyy'];
/**
 * Try to parse a pasted string using `preferredFormat` first,
 * then common fallback formats. Returns null if all attempts fail.
 */
export function parsePastedDate(text, preferredFormat) {
    const formats = [preferredFormat, ...PASTE_FALLBACKS.filter(f => f !== preferredFormat)];
    for (const fmt of formats) {
        const d = parseWithFormat(text, fmt);
        if (d)
            return d;
    }
    return null;
}
function parseWithFormat(text, format) {
    const segs = parseFormat(format);
    let pos = 0;
    let d = 1, m = 1, y = new Date().getFullYear();
    for (const seg of segs) {
        if (pos >= text.length)
            break;
        if (!seg.token) {
            if (text.slice(pos, pos + seg.text.length) === seg.text)
                pos += seg.text.length;
            continue;
        }
        const maxDigits = tokenMaxDigits(seg.token);
        let chunk = '';
        for (let i = 0; i < maxDigits && pos < text.length; i++, pos++) {
            if (!/\d/.test(text[pos]))
                break;
            chunk += text[pos];
        }
        if (!chunk)
            return null;
        const num = parseInt(chunk, 10);
        switch (seg.token) {
            case 'dd':
            case 'd':
                d = num;
                break;
            case 'MM':
            case 'M':
                m = num;
                break;
            case 'yyyy':
                y = num;
                break;
            case 'yy':
                y = 2000 + num;
                break;
        }
    }
    if (m < 1 || m > 12 || d < 1 || d > 31)
        return null;
    return new Date(y, m - 1, d);
}
// ─── Utility ──────────────────────────────────────────────────────────────────
export function pad(n, len) {
    return String(n).padStart(len, '0');
}
//# sourceMappingURL=format.js.map