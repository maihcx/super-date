/*! SuperDate v0.1.0 | MIT License */
/**
 * format.ts — format string parsing, token metadata, and date/time read/write helpers.
 */
function getInputKind(input) {
    const t = input.type;
    if (t === 'time' || t === 'datetime-local')
        return t;
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
function parseFormat(format) {
    // yyyy/yy must precede MM/M; HH before H; hh before h; dd before d
    const TOKEN_RE = /yyyy|yy|YYYY|YY|MM|M|HH|H|hh|h|mm|ss|dd|DD|d|D/g;
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
/**
 * Build a combined format string for datetime-local inputs.
 * e.g. dateFormat="dd/MM/yyyy", timeFormat="HH:mm", delimiter=" "
 * → "dd/MM/yyyy HH:mm"
 */
function buildDateTimeFormat(dateFormat, timeFormat, delimiter) {
    return `${dateFormat}${delimiter}${timeFormat}`;
}
// ─── Token metadata ───────────────────────────────────────────────────────────
function tokenValue(token, date) {
    if (!date)
        return '';
    switch (token) {
        // ── Date ──
        case 'dd': return pad(date.getDate(), 2);
        case 'd': return String(date.getDate());
        case 'MM': return pad(date.getMonth() + 1, 2);
        case 'M': return String(date.getMonth() + 1);
        case 'yyyy': return pad(date.getFullYear(), 4);
        case 'yy': return pad(date.getFullYear() % 100, 2);
        // ── Time ──
        case 'HH': return pad(date.getHours(), 2);
        case 'H': return String(date.getHours());
        case 'hh': return pad(to12h(date.getHours()), 2);
        case 'h': return String(to12h(date.getHours()));
        case 'mm': return pad(date.getMinutes(), 2);
        case 'ss': return pad(date.getSeconds(), 2);
    }
}
function tokenPlaceholder(token) {
    switch (token) {
        case 'dd': return 'dd';
        case 'd': return 'd';
        case 'MM': return 'mm';
        case 'M': return 'm';
        case 'yyyy': return 'yyyy';
        case 'yy': return 'yy';
        case 'HH': return 'HH';
        case 'H': return 'H';
        case 'hh': return 'hh';
        case 'h': return 'h';
        case 'mm': return 'mm';
        case 'ss': return 'ss';
    }
}
function tokenMaxDigits(token) {
    switch (token) {
        case 'dd':
        case 'd': return 2;
        case 'MM':
        case 'M': return 2;
        case 'yyyy': return 4;
        case 'yy': return 2;
        case 'HH':
        case 'H':
        case 'hh':
        case 'h': return 2;
        case 'mm': return 2;
        case 'ss': return 2;
    }
}
function tokenMaxValue(token) {
    switch (token) {
        case 'dd':
        case 'd': return 31;
        case 'MM':
        case 'M': return 12;
        case 'yyyy': return 9999;
        case 'yy': return 99;
        case 'HH':
        case 'H': return 23;
        case 'hh':
        case 'h': return 12;
        case 'mm': return 59;
        case 'ss': return 59;
    }
}
function tokenMinValue(token) {
    switch (token) {
        case 'dd':
        case 'd': return 1;
        case 'MM':
        case 'M': return 1;
        case 'yyyy': return 1;
        case 'yy': return 0;
        case 'HH':
        case 'H': return 0;
        case 'hh':
        case 'h': return 1;
        case 'mm': return 0;
        case 'ss': return 0;
    }
}
// ─── Date/time construction ───────────────────────────────────────────────────
/** Clamp a year/month/day combination to a real calendar date. */
function buildDate(current, token, newRaw) {
    const base = current ?? new Date();
    let y = base.getFullYear();
    let mo = base.getMonth() + 1; // 1-based
    let d = base.getDate();
    let h = base.getHours();
    let mi = base.getMinutes();
    let s = base.getSeconds();
    switch (token) {
        case 'dd':
        case 'd':
            d = newRaw;
            break;
        case 'MM':
        case 'M':
            mo = newRaw;
            break;
        case 'yyyy':
            y = newRaw;
            break;
        case 'yy':
            y = 2000 + newRaw;
            break;
        case 'HH':
        case 'H':
            h = newRaw;
            break;
        case 'hh':
        case 'h':
            h = from12h(newRaw, h);
            break;
        case 'mm':
            mi = newRaw;
            break;
        case 'ss':
            s = newRaw;
            break;
    }
    // Clamp day to valid range for the given month/year
    const maxDay = new Date(y, mo, 0).getDate();
    d = Math.max(1, Math.min(d, maxDay));
    return new Date(y, mo - 1, d, h, mi, s);
}
// ─── Input read/write ─────────────────────────────────────────────────────────
/** Read a Date from input. Supports date, time, and datetime-local inputs. */
function readInputDate(input) {
    if (!input.value)
        return null;
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
function writeInputDate(input, date) {
    const kind = getInputKind(input);
    if (kind === 'date') {
        input.value = formatDateISO(date);
    }
    else if (kind === 'time') {
        input.value = formatTimeISO(date);
    }
    else {
        input.value = formatDateTimeISO(date);
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
}
// ─── ISO format helpers ───────────────────────────────────────────────────────
function parseDateISO(value) {
    const parts = value.split('-');
    if (parts.length !== 3)
        return null;
    const [y, m, d] = parts.map(Number);
    if (isNaN(y) || isNaN(m) || isNaN(d))
        return null;
    return new Date(y, m - 1, d);
}
function parseTimeISO(value) {
    // "HH:mm" or "HH:mm:ss"
    const parts = value.split(':');
    if (parts.length < 2)
        return null;
    const [h, mi, s = 0] = parts.map(Number);
    if (isNaN(h) || isNaN(mi))
        return null;
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, mi, s);
}
function parseDateTimeISO(value) {
    // "yyyy-MM-ddTHH:mm" or "yyyy-MM-ddTHH:mm:ss"
    const [datePart, timePart] = value.split('T');
    if (!datePart || !timePart)
        return null;
    const dateOnly = parseDateISO(datePart);
    if (!dateOnly)
        return null;
    const timeParts = timePart.split(':').map(Number);
    const [h = 0, mi = 0, s = 0] = timeParts;
    return new Date(dateOnly.getFullYear(), dateOnly.getMonth(), dateOnly.getDate(), h, mi, s);
}
function formatDateISO(date) {
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1, 2);
    const d = pad(date.getDate(), 2);
    return `${y}-${m}-${d}`;
}
function formatTimeISO(date) {
    const h = pad(date.getHours(), 2);
    const mi = pad(date.getMinutes(), 2);
    const s = pad(date.getSeconds(), 2);
    return `${h}:${mi}:${s}`;
}
function formatDateTimeISO(date) {
    return `${formatDateISO(date)}T${formatTimeISO(date)}`;
}
// ─── Paste parser ─────────────────────────────────────────────────────────────
const PASTE_DATE_FALLBACKS = ['yyyy-MM-dd', 'dd/MM/yyyy', 'MM/dd/yyyy', 'd.M.yyyy', 'MM-dd-yyyy'];
const PASTE_TIME_FALLBACKS = ['HH:mm:ss', 'HH:mm', 'H:mm'];
const PASTE_DATETIME_FALLBACKS = ['yyyy-MM-dd HH:mm:ss', 'yyyy-MM-dd HH:mm', 'dd/MM/yyyy HH:mm'];
/**
 * Try to parse a pasted string for date, time, or datetime-local inputs.
 * Uses preferredFormat first, then common fallbacks.
 */
function parsePastedDate(text, preferredFormat, kind = 'date') {
    let fallbacks;
    if (kind === 'time')
        fallbacks = PASTE_TIME_FALLBACKS;
    else if (kind === 'datetime-local')
        fallbacks = PASTE_DATETIME_FALLBACKS;
    else
        fallbacks = PASTE_DATE_FALLBACKS;
    const formats = [preferredFormat, ...fallbacks.filter(f => f !== preferredFormat)];
    for (const fmt of formats) {
        const d = parseWithFormat(text, fmt, kind);
        if (d)
            return d;
    }
    return null;
}
function parseWithFormat(text, format, kind) {
    const segs = parseFormat(format);
    let pos = 0;
    const now = new Date();
    let d = now.getDate(), mo = now.getMonth() + 1, y = now.getFullYear();
    let h = 0, mi = 0, s = 0;
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
                mo = num;
                break;
            case 'yyyy':
                y = num;
                break;
            case 'yy':
                y = 2000 + num;
                break;
            case 'HH':
            case 'H':
                h = num;
                break;
            case 'hh':
            case 'h':
                h = from12h(num, h);
                break;
            case 'mm':
                mi = num;
                break;
            case 'ss':
                s = num;
                break;
        }
    }
    if (kind === 'date' || kind === 'datetime-local') {
        if (mo < 1 || mo > 12 || d < 1 || d > 31)
            return null;
    }
    if (kind === 'time') {
        if (h < 0 || h > 23 || mi < 0 || mi > 59)
            return null;
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, mi, s);
    }
    return new Date(y, mo - 1, d, h, mi, s);
}
// ─── Utility ──────────────────────────────────────────────────────────────────
function pad(n, len) {
    return String(n).padStart(len, '0');
}
function to12h(h24) {
    if (h24 === 0)
        return 12;
    if (h24 > 12)
        return h24 - 12;
    return h24;
}
function from12h(h12, currentH24) {
    // Preserve AM/PM based on current hour
    const isPM = currentH24 >= 12;
    if (h12 === 12)
        return isPM ? 12 : 0;
    return isPM ? h12 + 12 : h12;
}

/**
 * overlay.ts — builds and updates the visual overlay that sits on top of
 * the hidden native date/time input.
 */
const CALENDAR_ICON_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="2" stroke-linecap="round"
  stroke-linejoin="round" aria-hidden="true">
  <rect x="3" y="4" width="18" height="18" rx="2"/>
  <line x1="16" y1="2" x2="16" y2="6"/>
  <line x1="8" y1="2" x2="8" y2="6"/>
  <line x1="3" y1="10" x2="21" y2="10"/>
</svg>`;
const CLOCK_ICON_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="2" stroke-linecap="round"
  stroke-linejoin="round" aria-hidden="true">
  <circle cx="12" cy="12" r="10"/>
  <polyline points="12 6 12 12 16 14"/>
</svg>`;
/**
 * Wrap `input` in a `.superdate-wrapper`, inject the overlay element and
 * segment spans. Returns references to every created element.
 */
function buildOverlay(input, segments, onSegmentClick, onIconClick, kind = 'date') {
    // ── Wrapper ─────────────────────────────────────────────────────────────────
    const wrapper = document.createElement('div');
    wrapper.className = 'superdate-wrapper';
    wrapper.style.width = input.style.width || '';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    input.classList.add('superdate-input');
    input.style.display = 'block';
    input.style.boxSizing = 'border-box';
    // ── Overlay ──────────────────────────────────────────────────────────────────
    const overlay = document.createElement('div');
    overlay.className = 'superdate-overlay';
    const segEls = [];
    segments.forEach((seg, i) => {
        const el = document.createElement('span');
        el.className = 'superdate-seg';
        if (seg.token) {
            el.dataset.token = seg.token;
            el.dataset.idx = String(i);
            el.setAttribute('tabindex', '-1');
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                onSegmentClick(i);
            });
        }
        overlay.appendChild(el);
        segEls.push(el);
    });
    // ── Icon (calendar for date/datetime-local, clock for time) ─────────────────
    const icon = document.createElement('span');
    icon.className = 'superdate-icon';
    icon.innerHTML = kind === 'time' ? CLOCK_ICON_SVG : CALENDAR_ICON_SVG;
    icon.addEventListener('click', (e) => {
        e.stopPropagation();
        onIconClick();
    });
    overlay.appendChild(icon);
    wrapper.appendChild(overlay);
    return { wrapper, overlay, segEls };
}
/**
 * Re-render all segment spans from the current date/time value.
 */
function renderSegments(segments, segEls, date) {
    segments.forEach((seg, i) => {
        const el = segEls[i];
        if (!seg.token) {
            // Use innerHTML with &nbsp; for whitespace-only literals so CSS doesn't collapse them
            if (seg.text.trim() === '') {
                el.innerHTML = seg.text.replace(/ /g, '&nbsp;');
            }
            else {
                el.textContent = seg.text;
            }
            return;
        }
        const val = tokenValue(seg.token, date);
        if (val) {
            el.textContent = val;
            el.classList.remove('empty');
        }
        else {
            el.textContent = tokenPlaceholder(seg.token);
            el.classList.add('empty');
        }
    });
}
/**
 * Mark one segment element as active (highlighted), deactivate all others.
 */
function activateSegmentEl(segEls, idx) {
    segEls.forEach((el, i) => el.classList.toggle('active', i === idx));
}
/** Remove active highlight from all segment elements. */
function deactivateAll(segEls) {
    segEls.forEach(el => el.classList.remove('active'));
}

/**
 * instance.ts — SuperDateInstance manages one enhanced date/time input:
 * overlay rendering, keyboard/mouse/paste interaction, and lifecycle.
 * Supports input[type="date"], input[type="time"], and input[type="datetime-local"].
 */
const INSTANCE_KEY = '__superdate__';
class SuperDateInstance {
    constructor(input, globalDateFormat, globalTimeFormat = 'HH:mm', globalDelimiter = ' ') {
        this.activeTokenIdx = -1;
        this.typingBuffer = '';
        // ── Selection state ────────────────────────────────────────────────────────
        this.selAnchor = -1;
        this.selEnd = -1;
        this._justDragged = false;
        this._destroyed = false;
        this.input = input;
        this.kind = getInputKind(input);
        // Resolve effective formats from data-attributes or globals
        const dateFormat = input.dataset.dateFormat ?? globalDateFormat;
        const timeFormat = input.dataset.timeFormat ?? globalTimeFormat;
        const delimiter = input.dataset.dateTimeDelimiter ?? globalDelimiter;
        if (this.kind === 'datetime-local') {
            this.format = buildDateTimeFormat(dateFormat, timeFormat, delimiter);
        }
        else if (this.kind === 'time') {
            this.format = timeFormat;
        }
        else {
            this.format = dateFormat;
        }
        this.segments = parseFormat(this.format);
        const elements = buildOverlay(input, this.segments, (idx) => this.activateSegment(idx), () => this.input.showPicker?.(), this.kind);
        this.wrapper = elements.wrapper;
        this.overlay = elements.overlay;
        this.segEls = elements.segEls;
        this.render();
        this._onKeyDown = (e) => this.handleKeyDown(e);
        this._onPaste = (e) => this.handlePaste(e);
        this._onChange = () => this.render();
        this._onBlur = (e) => this.handleBlur(e);
        this._onWrapClick = (e) => this.handleWrapperClick(e);
        this._onWrapDblClick = (e) => this.handleWrapperDblClick(e);
        this._onMouseDown = (e) => this.handleMouseDown(e);
        this._onMouseMove = (e) => this.handleMouseMove(e);
        this._onMouseUp = (e) => this.handleMouseUp(e);
        this._mutObs = new MutationObserver(() => { if (!this._destroyed)
            this.render(); });
        this.attachEvents();
    }
    // ── Rendering ───────────────────────────────────────────────────────────────
    render() {
        renderSegments(this.segments, this.segEls, readInputDate(this.input));
    }
    // ── Helpers ──────────────────────────────────────────────────────────────────
    firstTokenIdx() {
        return this.segments.findIndex(s => s.token !== null);
    }
    lastTokenIdx() {
        for (let i = this.segments.length - 1; i >= 0; i--) {
            if (this.segments[i].token)
                return i;
        }
        return -1;
    }
    nextTokenIdx(from, dir = 1) {
        let i = from + dir;
        while (i >= 0 && i < this.segments.length) {
            if (this.segments[i].token)
                return i;
            i += dir;
        }
        return -1;
    }
    // ── Segment activation ───────────────────────────────────────────────────────
    verifySegment(token) {
        let bufferVal = this.getBufferValue(token);
        if (bufferVal == '0') {
            const now = new Date();
            let nowValue;
            switch (token) {
                case 'dd':
                case 'd':
                    nowValue = now.getDate();
                    break;
                case 'MM':
                case 'M':
                    nowValue = now.getMonth() + 1;
                    break;
                case 'yyyy':
                    nowValue = now.getFullYear();
                    break;
                case 'yy':
                    nowValue = now.getFullYear() % 100;
                    break;
                case 'HH':
                case 'H':
                    nowValue = now.getHours();
                    break;
                case 'hh':
                case 'h':
                    nowValue = now.getHours() % 12 || 12;
                    break;
                case 'mm':
                    nowValue = now.getMinutes();
                    break;
                case 'ss':
                    nowValue = now.getSeconds();
                    break;
            }
            nowValue = nowValue.toString();
            if (nowValue.length < tokenMaxDigits(token)) {
                nowValue = nowValue.padStart(tokenMaxDigits(token), '0');
            }
            this.typingBuffer = '';
            this.typeDigit(token, nowValue, true);
        }
        else if (bufferVal != '') {
            if (bufferVal.length < tokenMaxDigits(token)) {
                bufferVal = bufferVal.padStart(tokenMaxDigits(token), '0');
                this.typingBuffer = '';
                this.typeDigit(token, bufferVal, true);
            }
        }
    }
    activateSegment(idx) {
        if (idx < 0 || idx >= this.segments.length)
            return;
        if (!this.segments[idx].token)
            return;
        this.endSelection();
        this.typingBuffer = '';
        this.activeTokenIdx = idx;
        activateSegmentEl(this.segEls, idx);
        this.input.focus({ preventScroll: true });
    }
    deactivate() {
        // Snap segment value up to minValue if it went below (e.g. 0 → 1 for day/month)
        if (this.activeTokenIdx !== -1) {
            const token = this.segments[this.activeTokenIdx].token;
            if (token) {
                this.verifySegment(token);
                const date = readInputDate(this.input);
                if (date) {
                    let current;
                    switch (token) {
                        case 'dd':
                        case 'd':
                            current = date.getDate();
                            break;
                        case 'MM':
                        case 'M':
                            current = date.getMonth() + 1;
                            break;
                        case 'yyyy':
                            current = date.getFullYear();
                            break;
                        case 'yy':
                            current = date.getFullYear() % 100;
                            break;
                        case 'HH':
                        case 'H':
                            current = date.getHours();
                            break;
                        case 'hh':
                        case 'h':
                            current = date.getHours() % 12 || 12;
                            break;
                        case 'mm':
                            current = date.getMinutes();
                            break;
                        case 'ss':
                            current = date.getSeconds();
                            break;
                    }
                    if (current < tokenMinValue(token)) {
                        this.commitTokenValue(token, tokenMinValue(token));
                    }
                }
            }
        }
        this.activeTokenIdx = -1;
        this.typingBuffer = '';
        this.endSelection();
        deactivateAll(this.segEls);
    }
    // ── Selection via active class ────────────────────────────────────────────
    hasSelection() {
        return this.selAnchor !== -1;
    }
    paintSelection(anchor, end) {
        const from = Math.min(anchor, end);
        const to = Math.max(anchor, end);
        this.segEls.forEach((el, i) => {
            el.classList.toggle('active', this.segments[i].token !== null && i >= from && i <= to);
        });
    }
    extendSelectionTo(idx) {
        this.selEnd = idx;
        this.paintSelection(this.selAnchor, this.selEnd);
    }
    selectAll() {
        const first = this.firstTokenIdx();
        const last = this.lastTokenIdx();
        if (first === -1)
            return;
        this.activeTokenIdx = -1;
        this.selAnchor = first;
        this.selEnd = last;
        this.paintSelection(first, last);
    }
    endSelection() {
        if (this.activeTokenIdx !== -1) {
            this.verifySegment(this.segments[this.activeTokenIdx].token);
        }
        this.selAnchor = -1;
        this.selEnd = -1;
        deactivateAll(this.segEls);
    }
    // ── Copy / delete selected range ─────────────────────────────────────────
    copySelection() {
        const date = readInputDate(this.input);
        if (!date || !this.hasSelection())
            return;
        const from = Math.min(this.selAnchor, this.selEnd);
        const to = Math.max(this.selAnchor, this.selEnd);
        let text = '';
        for (let i = from; i <= to; i++) {
            const seg = this.segments[i];
            if (!seg)
                continue;
            text += seg.token ? tokenValue(seg.token, date) : seg.text;
        }
        navigator.clipboard.writeText(text).catch(() => {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        });
    }
    deleteSelection() {
        if (!this.hasSelection())
            return;
        const from = Math.min(this.selAnchor, this.selEnd);
        const to = Math.max(this.selAnchor, this.selEnd);
        const allTokenCount = this.segments.filter(s => s.token).length;
        let selTokenCount = 0;
        for (let i = from; i <= to; i++) {
            if (this.segments[i]?.token)
                selTokenCount++;
        }
        if (selTokenCount === allTokenCount) {
            this.input.value = '';
            this.input.dispatchEvent(new Event('input', { bubbles: true }));
            this.input.dispatchEvent(new Event('change', { bubbles: true }));
            this.render();
        }
        this.endSelection();
        this.activeTokenIdx = -1;
    }
    // ── Mouse drag ───────────────────────────────────────────────────────────
    tokenIdxFromEvent(e) {
        const el = e.target.closest('[data-idx]');
        if (!el)
            return -1;
        const idx = parseInt(el.dataset.idx ?? '-1', 10);
        return this.segments[idx]?.token ? idx : -1;
    }
    handleMouseDown(e) {
        if (e.detail >= 2)
            return;
        const idx = this.tokenIdxFromEvent(e);
        if (idx === -1)
            return;
        this.selAnchor = idx;
        this.selEnd = idx;
    }
    handleMouseMove(e) {
        if (this.selAnchor === -1 || !(e.buttons & 1))
            return;
        const idx = this.tokenIdxFromEvent(e);
        if (idx === -1)
            return;
        if (idx === this.selEnd)
            return;
        if (this.activeTokenIdx !== -1) {
            this.activeTokenIdx = -1;
            this.typingBuffer = '';
        }
        this.extendSelectionTo(idx);
    }
    handleMouseUp(_e) {
        if (this.selAnchor !== -1 && this.selAnchor === this.selEnd) {
            const idx = this.selAnchor;
            this.selAnchor = -1;
            this.selEnd = -1;
            this.activateSegment(idx);
        }
        else if (this.selAnchor !== this.selEnd) {
            this._justDragged = true;
            this.input.focus({ preventScroll: true });
        }
    }
    // ── Double-click ─────────────────────────────────────────────────────────
    handleWrapperDblClick(e) {
        e.preventDefault();
        this.activeTokenIdx = -1;
        this.typingBuffer = '';
        this.selectAll();
        this.input.focus({ preventScroll: true });
    }
    // ── Blur / wrapper click ─────────────────────────────────────────────────
    handleBlur(e) {
        const related = e.relatedTarget;
        if (!related || !this.wrapper.contains(related)) {
            this.deactivate();
        }
    }
    handleWrapperClick(e) {
        if (this._justDragged) {
            this._justDragged = false;
            return;
        }
        const target = e.target;
        if (target === this.wrapper || target === this.input || target === this.overlay) {
            this.endSelection();
            this.activateSegment(this.firstTokenIdx());
        }
    }
    // ── Keyboard ──────────────────────────────────────────────────────────────
    handleKeyDown(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            e.preventDefault();
            this.selectAll();
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            if (this.hasSelection()) {
                e.preventDefault();
                this.copySelection();
            }
            return;
        }
        if ((e.key === 'Backspace' || e.key === 'Delete') && this.hasSelection()) {
            e.preventDefault();
            this.deleteSelection();
            return;
        }
        if (e.key === 'Escape') {
            if (this.hasSelection()) {
                this.endSelection();
            }
            else {
                this.deactivate();
            }
            return;
        }
        if (this.activeTokenIdx === -1)
            return;
        const token = this.segments[this.activeTokenIdx].token;
        switch (e.key) {
            case 'Tab':
                this.handleTab(e);
                break;
            case 'ArrowRight':
                e.preventDefault();
                {
                    const n = this.nextTokenIdx(this.activeTokenIdx, 1);
                    if (n !== -1)
                        this.activateSegment(n);
                }
                break;
            case 'ArrowLeft':
                e.preventDefault();
                {
                    const p = this.nextTokenIdx(this.activeTokenIdx, -1);
                    if (p !== -1)
                        this.activateSegment(p);
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.stepValue(token, 1);
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.stepValue(token, -1);
                break;
            case 'Backspace':
            case 'Delete':
                e.preventDefault();
                this.typingBuffer = this.typingBuffer.slice(0, -1);
                this.renderBuffer();
                break;
            default:
                if (/^\d$/.test(e.key)) {
                    e.preventDefault();
                    this.typeDigit(token, e.key);
                }
                break;
        }
    }
    handleTab(e) {
        const next = this.nextTokenIdx(this.activeTokenIdx, e.shiftKey ? -1 : 1);
        if (next !== -1) {
            e.preventDefault();
            this.activateSegment(next);
        }
        else {
            this.deactivate();
        }
    }
    // ── Digit typing ──────────────────────────────────────────────────────────
    typeDigit(token, digit, skipNext = false) {
        this.typingBuffer += digit;
        const num = parseInt(this.typingBuffer, 10);
        const maxVal = tokenMaxValue(token);
        const maxDigit = tokenMaxDigits(token);
        const fullLength = this.typingBuffer.length >= maxDigit;
        if (fullLength) {
            const minVal = tokenMinValue(token);
            const clamped = Math.max(minVal, Math.min(maxVal, num));
            this.commitTokenValue(token, clamped);
            this.typingBuffer = '';
            if (!skipNext) {
                const next = this.nextTokenIdx(this.activeTokenIdx, 1);
                if (next !== -1)
                    setTimeout(() => this.activateSegment(next), 0);
            }
        }
        else {
            this.renderBuffer();
        }
    }
    renderBuffer() {
        const el = this.segEls[this.activeTokenIdx];
        const token = this.segments[this.activeTokenIdx].token;
        if (this.typingBuffer) {
            el.textContent = this.typingBuffer;
            el.classList.remove('empty');
        }
        else {
            // Restore placeholder
            switch (token) {
                case 'yyyy':
                    el.textContent = 'yyyy';
                    break;
                case 'yy':
                    el.textContent = 'yy';
                    break;
                case 'MM':
                    el.textContent = 'mm';
                    break;
                case 'M':
                    el.textContent = 'm';
                    break;
                case 'dd':
                    el.textContent = 'dd';
                    break;
                case 'd':
                    el.textContent = 'd';
                    break;
                case 'HH':
                    el.textContent = 'HH';
                    break;
                case 'H':
                    el.textContent = 'H';
                    break;
                case 'hh':
                    el.textContent = 'hh';
                    break;
                case 'h':
                    el.textContent = 'h';
                    break;
                case 'mm':
                    el.textContent = 'mm';
                    break;
                case 'ss':
                    el.textContent = 'ss';
                    break;
            }
            el.classList.add('empty');
        }
    }
    getBufferValue(token) {
        if (this.typingBuffer)
            return this.typingBuffer;
        const date = readInputDate(this.input);
        if (!date)
            return '';
        return tokenValue(token, date);
    }
    // ── Step (↑ ↓) ────────────────────────────────────────────────────────────
    stepValue(token, delta) {
        const date = readInputDate(this.input);
        const base = date ?? new Date();
        let current;
        switch (token) {
            case 'dd':
            case 'd':
                current = base.getDate();
                break;
            case 'MM':
            case 'M':
                current = base.getMonth() + 1;
                break;
            case 'yyyy':
                current = base.getFullYear();
                break;
            case 'yy':
                current = base.getFullYear() % 100;
                break;
            case 'HH':
            case 'H':
                current = base.getHours();
                break;
            case 'hh':
            case 'h':
                current = base.getHours() % 12 || 12;
                break;
            case 'mm':
                current = base.getMinutes();
                break;
            case 'ss':
                current = base.getSeconds();
                break;
        }
        const minV = tokenMinValue(token);
        const maxV = tokenMaxValue(token);
        let next = current + delta;
        if (next < minV)
            next = maxV;
        if (next > maxV)
            next = minV;
        this.commitTokenValue(token, next);
    }
    commitTokenValue(token, value) {
        const date = buildDate(readInputDate(this.input), token, value);
        writeInputDate(this.input, date);
        this.render();
    }
    // ── Paste ─────────────────────────────────────────────────────────────────
    handlePaste(e) {
        e.preventDefault();
        const text = e.clipboardData?.getData('text/plain') ?? '';
        const date = parsePastedDate(text.trim(), this.format, this.kind);
        if (date) {
            writeInputDate(this.input, date);
            this.render();
        }
    }
    // ── Event wiring ──────────────────────────────────────────────────────────
    attachEvents() {
        this.input.addEventListener('keydown', this._onKeyDown);
        this.input.addEventListener('paste', this._onPaste);
        this.input.addEventListener('change', this._onChange);
        this.input.addEventListener('blur', this._onBlur);
        this.wrapper.addEventListener('click', this._onWrapClick);
        this.wrapper.addEventListener('dblclick', this._onWrapDblClick);
        this.overlay.addEventListener('mousedown', this._onMouseDown);
        this.overlay.addEventListener('mousemove', this._onMouseMove);
        this.overlay.addEventListener('mouseup', this._onMouseUp);
        this._mutObs.observe(this.input, {
            attributes: true,
            attributeFilter: ['value', 'min', 'max'],
        });
    }
    // ── Public API ────────────────────────────────────────────────────────────
    update() {
        this.render();
    }
    destroy() {
        if (this._destroyed)
            return;
        this._destroyed = true;
        this._mutObs.disconnect();
        this.input.removeEventListener('keydown', this._onKeyDown);
        this.input.removeEventListener('paste', this._onPaste);
        this.input.removeEventListener('change', this._onChange);
        this.input.removeEventListener('blur', this._onBlur);
        this.wrapper.removeEventListener('click', this._onWrapClick);
        this.wrapper.removeEventListener('dblclick', this._onWrapDblClick);
        this.overlay.removeEventListener('mousedown', this._onMouseDown);
        this.overlay.removeEventListener('mousemove', this._onMouseMove);
        this.overlay.removeEventListener('mouseup', this._onMouseUp);
        this.input.classList.remove('superdate-input');
        this.input.style.display = '';
        this.input.style.width = '';
        this.input.style.color = '';
        this.wrapper.replaceWith(this.input);
    }
}

/**
 * registry.ts — SuperDateRegistry tracks bound selectors and uses a single
 * MutationObserver to auto-initialise matching inputs added to the DOM later.
 * Supports input[type="date"], input[type="time"], and input[type="datetime-local"].
 */
let observer = null;
let bindings = [];
const DESTROYED_ATTR = 'data-superdate-destroyed';
const SUPPORTED_TYPES = new Set(['date', 'time', 'datetime-local']);
function isDestroyed(el) {
    return el.hasAttribute(DESTROYED_ATTR);
}
function markDestroyed(el) {
    el.setAttribute(DESTROYED_ATTR, '');
}
function clearDestroyedBySelector(selector) {
    document.querySelectorAll(selector).forEach(el => {
        el.removeAttribute(DESTROYED_ATTR);
    });
}
function defaultOpts(options = {}) {
    return {
        format: options.format ?? 'dd/MM/yyyy',
        timeFormat: options.timeFormat ?? 'HH:mm',
        dateTimeDelimiter: options.dateTimeDelimiter ?? ' ',
        locale: options.locale ?? (typeof navigator !== 'undefined' ? navigator.language : 'en'),
    };
}
function initAll(selector, opts) {
    document.querySelectorAll(selector).forEach(el => {
        if (!SUPPORTED_TYPES.has(el.type) || el[INSTANCE_KEY] || isDestroyed(el))
            return;
        el[INSTANCE_KEY] = new SuperDateInstance(el, opts.format, opts.timeFormat, opts.dateTimeDelimiter);
    });
}
function tryInit(node) {
    for (const binding of bindings) {
        if (node instanceof HTMLInputElement && node.matches(binding.selector)) {
            if (SUPPORTED_TYPES.has(node.type) && !node[INSTANCE_KEY] && !isDestroyed(node)) {
                node[INSTANCE_KEY] = new SuperDateInstance(node, binding.options.format, binding.options.timeFormat, binding.options.dateTimeDelimiter);
            }
        }
        node.querySelectorAll(binding.selector).forEach(el => {
            if (!SUPPORTED_TYPES.has(el.type) || el[INSTANCE_KEY] || isDestroyed(el))
                return;
            el[INSTANCE_KEY] = new SuperDateInstance(el, binding.options.format, binding.options.timeFormat, binding.options.dateTimeDelimiter);
        });
    }
}
function startObserver() {
    observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            for (const node of Array.from(mutation.addedNodes)) {
                if (node instanceof Element)
                    tryInit(node);
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}
class SuperDateRegistry {
    constructor() {
        this.version = '';
        this.name = '';
    }
    /**
     * Bind SuperDate to all current **and future** `<input type="date">`,
     * `<input type="time">`, and `<input type="datetime-local">` elements
     * matching `selector`. Safe to call multiple times with different selectors.
     */
    bind(selector, options = {}) {
        const opts = defaultOpts(options);
        bindings.push({ selector, options: opts });
        clearDestroyedBySelector(selector);
        initAll(selector, opts);
        if (!observer)
            startObserver();
        return this;
    }
    /**
     * Manually enhance a single element.
     * Returns the existing instance if one is already attached.
     */
    init(el, options = {}) {
        if (el[INSTANCE_KEY])
            return el[INSTANCE_KEY];
        el.removeAttribute(DESTROYED_ATTR);
        const opts = defaultOpts(options);
        const instance = new SuperDateInstance(el, opts.format, opts.timeFormat, opts.dateTimeDelimiter);
        el[INSTANCE_KEY] = instance;
        return instance;
    }
    /**
     * Remove the enhancement from a single element and mark it with
     * [data-superdate-destroyed] so the MutationObserver won't re-bind it.
     */
    destroy(el) {
        if (el[INSTANCE_KEY]) {
            el[INSTANCE_KEY].destroy();
            delete el[INSTANCE_KEY];
        }
        markDestroyed(el);
    }
}

/**
 * SuperDate — lightweight TypeScript date-input enhancer.
 *
 * Hides the native browser chrome, renders a fully custom overlay,
 * and supports keyboard editing, copy/paste, and custom date formats.
 *
 * Usage:
 *   import SuperDate from 'superdate';
 *   SuperDate.bind('.date-field');
 *   SuperDate.bind('[data-datepicker]', { format: 'MM/dd/yyyy' });
 */
/** Singleton registry — the default export used in most projects. */
const SuperDate = new SuperDateRegistry();
SuperDate.version = "0.1.0";
SuperDate.name = "SuperDate";

export { SuperDate as default };
//# sourceMappingURL=super-date.esm.js.map
