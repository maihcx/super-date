/**
 * instance.ts — SuperDateInstance manages one enhanced date input:
 * overlay rendering, keyboard/mouse/paste interaction, and lifecycle.
 */
import { parseFormat, tokenMaxDigits, tokenMaxValue, tokenMinValue, buildDate, readInputDate, writeInputDate, parsePastedDate, } from './format';
import { buildOverlay, renderSegments, activateSegmentEl, deactivateAll, } from './overlay';
// Augment HTMLInputElement to carry our instance reference.
export const INSTANCE_KEY = '__superdate__';
export class SuperDateInstance {
    constructor(input, globalFormat) {
        var _a;
        this.activeTokenIdx = -1;
        this.typingBuffer = '';
        this.input = input;
        this.format = (_a = input.dataset.dateFormat) !== null && _a !== void 0 ? _a : globalFormat;
        this.segments = parseFormat(this.format);
        const elements = buildOverlay(input, this.segments, (idx) => this.activateSegment(idx), () => { var _a, _b; return (_b = (_a = this.input).showPicker) === null || _b === void 0 ? void 0 : _b.call(_a); });
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
                this.stepValue(token, +1);
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
        const base = date !== null && date !== void 0 ? date : new Date();
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
        var _a, _b;
        e.preventDefault();
        const text = (_b = (_a = e.clipboardData) === null || _a === void 0 ? void 0 : _a.getData('text/plain')) !== null && _b !== void 0 ? _b : '';
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
//# sourceMappingURL=instance.js.map