/*! SuperDate v1.3.0 | MIT License */
/**
 * format.ts — format string parsing, token metadata, and date read/write helpers.
 */
// ─── Format parsing ───────────────────────────────────────────────────────────
/**
 * Parse a format string into an ordered array of Segment descriptors.
 * Recognised tokens: yyyy, yy, MM, M, dd, d.
 * Everything else is treated as a literal separator.
 */
function parseFormat(format) {
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
function tokenValue(token, date) {
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
function tokenPlaceholder(token) {
    switch (token) {
        case 'dd': return 'dd';
        case 'd': return 'd';
        case 'MM': return 'mm';
        case 'M': return 'm';
        case 'yyyy': return 'yyyy';
        case 'yy': return 'yy';
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
    }
}
// ─── Date construction ────────────────────────────────────────────────────────
/** Clamp a year/month/day combination to a real calendar date. */
function buildDate(current, token, newRaw) {
    const base = current ?? new Date();
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
function readInputDate(input) {
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
function writeInputDate(input, date) {
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
function parsePastedDate(text, preferredFormat) {
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
function pad(n, len) {
    return String(n).padStart(len, '0');
}

/**
 * overlay.ts — builds and updates the visual overlay that sits on top of
 * the hidden native date input.
 */
const CALENDAR_ICON_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="2" stroke-linecap="round"
  stroke-linejoin="round" aria-hidden="true">
  <rect x="3" y="4" width="18" height="18" rx="2"/>
  <line x1="16" y1="2" x2="16" y2="6"/>
  <line x1="8" y1="2" x2="8" y2="6"/>
  <line x1="3" y1="10" x2="21" y2="10"/>
</svg>`;
/**
 * Wrap `input` in a `.superdate-wrapper`, inject the overlay element and
 * segment spans. Returns references to every created element.
 */
function buildOverlay(input, segments, onSegmentClick, onIconClick) {
    // ── Wrapper ─────────────────────────────────────────────────────────────────
    const wrapper = document.createElement('div');
    wrapper.className = 'superdate-wrapper';
    wrapper.style.width = input.style.width || '';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    input.classList.add('superdate-input');
    input.style.display = 'block';
    input.style.width = '100%';
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
    // ── Calendar icon ────────────────────────────────────────────────────────────
    const icon = document.createElement('span');
    icon.className = 'superdate-icon';
    icon.innerHTML = CALENDAR_ICON_SVG;
    icon.addEventListener('click', (e) => {
        e.stopPropagation();
        onIconClick();
    });
    overlay.appendChild(icon);
    wrapper.appendChild(overlay);
    return { wrapper, overlay, segEls };
}
/**
 * Re-render all segment spans from the current date value.
 */
function renderSegments(segments, segEls, date) {
    segments.forEach((seg, i) => {
        const el = segEls[i];
        if (!seg.token) {
            el.textContent = seg.text;
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
 * instance.ts — SuperDateInstance manages one enhanced date input:
 * overlay rendering, keyboard/mouse/paste interaction, and lifecycle.
 */
// Augment HTMLInputElement to carry our instance reference.
const INSTANCE_KEY = '__superdate__';
class SuperDateInstance {
    constructor(input, globalFormat) {
        this.activeTokenIdx = -1;
        this.typingBuffer = '';
        this.input = input;
        this.format = input.dataset.dateFormat ?? globalFormat;
        this.segments = parseFormat(this.format);
        const elements = buildOverlay(input, this.segments, (idx) => this.activateSegment(idx), () => this.input.showPicker?.());
        this.wrapper = elements.wrapper;
        this.overlay = elements.overlay;
        this.segEls = elements.segEls;
        this.render();
        this.attachEvents();
    }
    // ── Rendering ───────────────────────────────────────────────────────────────
    render() {
        renderSegments(this.segments, this.segEls, readInputDate(this.input));
    }
    // ── Segment activation ───────────────────────────────────────────────────────
    activateSegment(idx) {
        if (idx < 0 || idx >= this.segments.length)
            return;
        if (!this.segments[idx].token)
            return;
        this.typingBuffer = '';
        this.activeTokenIdx = idx;
        activateSegmentEl(this.segEls, idx);
        this.input.focus({ preventScroll: true });
    }
    deactivate() {
        this.activeTokenIdx = -1;
        this.typingBuffer = '';
        deactivateAll(this.segEls);
    }
    firstTokenIdx() {
        return this.segments.findIndex(s => s.token !== null);
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
    // ── Keyboard handling ────────────────────────────────────────────────────────
    handleKeyDown(e) {
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
            case 'Escape':
                this.deactivate();
                break;
            default:
                if (e.ctrlKey || e.metaKey) {
                    if (e.key === 'a') {
                        e.preventDefault();
                        this.activateSegment(this.firstTokenIdx());
                    }
                    break;
                }
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
    // ── Digit typing ─────────────────────────────────────────────────────────────
    typeDigit(token, digit) {
        this.typingBuffer += digit;
        const num = parseInt(this.typingBuffer, 10);
        const maxVal = tokenMaxValue(token);
        const maxDigit = tokenMaxDigits(token);
        const wouldExceed = num * 10 > maxVal;
        const fullLength = this.typingBuffer.length >= maxDigit;
        if (fullLength || wouldExceed) {
            const clamped = Math.max(tokenMinValue(token), Math.min(maxVal, num));
            this.commitTokenValue(token, clamped);
            this.typingBuffer = '';
            const next = this.nextTokenIdx(this.activeTokenIdx, 1);
            if (next !== -1)
                setTimeout(() => this.activateSegment(next), 0);
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
            el.textContent = token === 'yyyy' ? 'yyyy'
                : token === 'yy' ? 'yy'
                    : token === 'MM' || token === 'M' ? (token === 'MM' ? 'mm' : 'm')
                        : token === 'dd' ? 'dd' : 'd';
            el.classList.add('empty');
        }
    }
    // ── Step (↑ ↓) ───────────────────────────────────────────────────────────────
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
    // ── Paste ────────────────────────────────────────────────────────────────────
    handlePaste(e) {
        e.preventDefault();
        const text = e.clipboardData?.getData('text/plain') ?? '';
        const date = parsePastedDate(text.trim(), this.format);
        if (date) {
            writeInputDate(this.input, date);
            this.render();
        }
    }
    // ── Event wiring ─────────────────────────────────────────────────────────────
    attachEvents() {
        this.input.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.input.addEventListener('paste', (e) => this.handlePaste(e));
        this.input.addEventListener('change', () => this.render());
        this.input.addEventListener('blur', (e) => {
            const related = e.relatedTarget;
            if (!related || !this.wrapper.contains(related))
                this.deactivate();
        });
        // Click on wrapper background → activate first segment
        this.wrapper.addEventListener('click', (e) => {
            const target = e.target;
            if (target === this.wrapper || target === this.input) {
                this.activateSegment(this.firstTokenIdx());
            }
        });
        // Re-render if `value` attribute is changed externally
        new MutationObserver(() => this.render()).observe(this.input, {
            attributes: true,
            attributeFilter: ['value', 'min', 'max'],
        });
    }
    // ── Public API ────────────────────────────────────────────────────────────────
    /** Re-render the overlay from the current input value. */
    update() {
        this.render();
    }
    /** Destroy this instance and restore the original input element. */
    destroy() {
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
 */
let observer = null;
let bindings = [];
function defaultOpts(options = {}) {
    return {
        format: options.format ?? 'dd/MM/yyyy',
        locale: options.locale ?? (typeof navigator !== 'undefined' ? navigator.language : 'en'),
    };
}
function initAll(selector, opts) {
    document.querySelectorAll(selector).forEach(el => {
        if (el.type !== 'date' || el[INSTANCE_KEY])
            return;
        el[INSTANCE_KEY] = new SuperDateInstance(el, opts.format);
    });
}
function tryInit(node) {
    for (const binding of bindings) {
        // The node itself may match
        if (node instanceof HTMLInputElement && node.matches(binding.selector)) {
            if (node.type === 'date' && !node[INSTANCE_KEY]) {
                node[INSTANCE_KEY] = new SuperDateInstance(node, binding.options.format);
            }
        }
        // Or it may contain matching descendants
        node.querySelectorAll(binding.selector).forEach(el => {
            if (el.type !== 'date' || el[INSTANCE_KEY])
                return;
            el[INSTANCE_KEY] = new SuperDateInstance(el, binding.options.format);
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
     * Bind SuperDate to all current **and future** `<input type="date">`
     * elements matching `selector`. Safe to call multiple times with
     * different selectors.
     */
    bind(selector, options = {}) {
        const opts = defaultOpts(options);
        bindings.push({ selector, options: opts });
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
        const opts = defaultOpts(options);
        const instance = new SuperDateInstance(el, opts.format);
        el[INSTANCE_KEY] = instance;
        return instance;
    }
    /** Remove the enhancement from a single element. */
    destroy(el) {
        if (el[INSTANCE_KEY]) {
            el[INSTANCE_KEY].destroy();
            delete el[INSTANCE_KEY];
        }
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
SuperDate.version = "1.3.0";
SuperDate.name = "SuperDate";

export { SuperDate as default };
//# sourceMappingURL=super-date.esm.js.map
