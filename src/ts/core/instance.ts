/**
 * instance.ts — SuperDateInstance manages one enhanced date/time input:
 * overlay rendering, keyboard/mouse/paste interaction, and lifecycle.
 * Supports input[type="date"], input[type="time"], and input[type="datetime-local"].
 */

import { DateToken } from '../types/date-token.type';
import { Segment } from '../types/segment.type';
import {
  parseFormat,
  buildDateTimeFormat,
  getInputKind,
  InputKind,
  isTimeToken,
  tokenMaxDigits,
  tokenMaxValue,
  tokenMinValue,
  tokenValue,
  tokenPlaceholder,
  tokenCurrentValue,
  buildDate,
  readInputDate,
  writeInputDate,
  parsePastedDate,
  pad,
} from './format';
import {
  buildOverlay,
  renderSegments,
  activateSegmentEl,
  deactivateAll,
} from './overlay';

export const INSTANCE_KEY = '__superdate__';

declare global {
  interface HTMLInputElement {
    [INSTANCE_KEY]?: SuperDateInstance;
  }
}

export class SuperDateInstance {
  private input: HTMLInputElement;
  private kind: InputKind;

  /** Combined display format (for datetime-local: "dd/MM/yyyy HH:mm") */
  private format: string;
  private segments: Segment[];

  private wrapper: HTMLElement;
  private overlay: HTMLElement;
  private segEls: HTMLElement[];

  private activeTokenIdx: number = -1;
  private typingBuffer: string = '';

  // ── Selection state ────────────────────────────────────────────────────────
  private selAnchor: number = -1;
  private selEnd: number = -1;
  private _justDragged = false;

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  private _onKeyDown: (e: Event) => void;
  private _onPaste: (e: Event) => void;
  private _onChange: () => void;
  private _onBlur: (e: Event) => void;
  private _onFocus: (e: Event) => void;
  private _onWrapClick: (e: Event) => void;
  private _onWrapDblClick: (e: Event) => void;
  private _onMouseDown: (e: Event) => void;
  private _onMouseMove: (e: Event) => void;
  private _onMouseUp: (e: Event) => void;
  private _mutObs: MutationObserver;
  private _destroyed = false;

  constructor(
    input: HTMLInputElement,
    globalDateFormat: string,
    globalTimeFormat: string = 'HH:mm',
    globalDelimiter: string = ' ',
  ) {
    this.input = input;
    this.kind = getInputKind(input);

    const dateFormat = input.dataset.dateFormat ?? globalDateFormat;
    const timeFormat = input.dataset.timeFormat ?? globalTimeFormat;
    const delimiter = input.dataset.dateTimeDelimiter ?? globalDelimiter;

    this.format =
      this.kind === 'datetime-local' ? buildDateTimeFormat(dateFormat, timeFormat, delimiter) :
        this.kind === 'time' ? timeFormat :
          dateFormat;

    this.segments = parseFormat(this.format);

    const elements = buildOverlay(
      input,
      this.segments,
      (idx) => this.activateSegment(idx),
      () => this.input.showPicker?.(),
      this.kind,
    );

    this.wrapper = elements.wrapper;
    this.overlay = elements.overlay;
    this.segEls = elements.segEls;

    this.render();

    this._onKeyDown = (e) => this.handleKeyDown(e as KeyboardEvent);
    this._onPaste = (e) => this.handlePaste(e as ClipboardEvent);
    this._onChange = () => this.render();
    this._onBlur = (e) => this.handleBlur(e as FocusEvent);
    this._onFocus = (e) => this.handleFocus(e as FocusEvent);
    this._onWrapClick = (e) => this.handleWrapperClick(e as MouseEvent);
    this._onWrapDblClick = (e) => this.handleWrapperDblClick(e as MouseEvent);
    this._onMouseDown = (e) => this.handleMouseDown(e as MouseEvent);
    this._onMouseMove = (e) => this.handleMouseMove(e as MouseEvent);
    this._onMouseUp = (e) => this.handleMouseUp(e as MouseEvent);
    this._mutObs = new MutationObserver(() => { if (!this._destroyed) this.render(); });

    this.attachEvents();
  }

  // ── Rendering ───────────────────────────────────────────────────────────────

  private render(): void {
    renderSegments(this.segments, this.segEls, readInputDate(this.input));
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private firstTokenIdx(): number {
    return this.segments.findIndex(s => s.token !== null);
  }

  private lastTokenIdx(): number {
    for (let i = this.segments.length - 1; i >= 0; i--) {
      if (this.segments[i].token) return i;
    }
    return -1;
  }

  private nextTokenIdx(from: number, dir: 1 | -1 = 1): number {
    let i = from + dir;
    while (i >= 0 && i < this.segments.length) {
      if (this.segments[i].token) return i;
      i += dir;
    }
    return -1;
  }

  // ── Segment activation ───────────────────────────────────────────────────────

  /**
   * Validate and normalise the buffer for the given segment index.
   * - Empty buffer ("0" or no input) → fills with today's value.
   * - Partial numeric buffer → left-pads to maxDigits.
   * - Year buffer shorter than 4 digits → prepend century from today.
   */
  private verifySegment(idx: number): void {
    const token = this.segments[idx].token;
    if (!token) return;

    let bufferVal = this.getBufferValue(idx);
    const maxDigits = tokenMaxDigits(token);
    const nowValue = pad(tokenCurrentValue(token, new Date()), maxDigits);

    if (bufferVal === '0') {
      this.typingBuffer = '';
      this.typeDigit(token, nowValue, true);
    } else if (bufferVal !== '') {
      if (maxDigits <= 2) {
        if (bufferVal.length < maxDigits) {
          bufferVal = bufferVal.padStart(maxDigits, '0');
          this.typingBuffer = '';
          this.typeDigit(token, bufferVal, true);
        }
      } else {
        // Year: prepend leading digits from today
        this.typingBuffer = '';
        const needle = maxDigits - bufferVal.length;
        bufferVal = `${nowValue.substring(0, needle)}${bufferVal}`;
        this.typeDigit(token, bufferVal, true);
      }
    }
  }

  private activateSegment(idx: number): void {
    if (idx < 0 || idx >= this.segments.length) return;
    if (!this.segments[idx].token) return;

    this.endSelection();
    this.typingBuffer = '';
    this.activeTokenIdx = idx;
    activateSegmentEl(this.segEls, idx);
    this.input.focus({ preventScroll: true });
  }

  private deactivate(): void {
    if (this.activeTokenIdx !== -1) {
      const token = this.segments[this.activeTokenIdx].token;
      if (token) {
        this.verifySegment(this.activeTokenIdx);

        const date = readInputDate(this.input);
        if (date) {
          const current = tokenCurrentValue(token, date);
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

  private hasSelection(): boolean {
    return this.selAnchor !== -1;
  }

  private paintSelection(anchor: number, end: number): void {
    const from = Math.min(anchor, end);
    const to = Math.max(anchor, end);
    this.segEls.forEach((el, i) => {
      el.classList.toggle('active', this.segments[i].token !== null && i >= from && i <= to);
    });
  }

  private extendSelectionTo(idx: number): void {
    this.selEnd = idx;
    this.paintSelection(this.selAnchor, this.selEnd);
  }

  private selectAll(): void {
    const first = this.firstTokenIdx();
    const last = this.lastTokenIdx();
    if (first === -1) return;
    this.activeTokenIdx = -1;
    this.selAnchor = first;
    this.selEnd = last;
    this.paintSelection(first, last);
  }

  private endSelection(): void {
    if (this.activeTokenIdx !== -1) {
      this.verifySegment(this.activeTokenIdx);
    }
    this.selAnchor = -1;
    this.selEnd = -1;
    deactivateAll(this.segEls);
  }

  // ── Copy / delete selected range ─────────────────────────────────────────

  private copySelection(): void {
    const date = readInputDate(this.input);
    if (!date || !this.hasSelection()) return;

    const from = Math.min(this.selAnchor, this.selEnd);
    const to = Math.max(this.selAnchor, this.selEnd);
    let text = '';
    for (let i = from; i <= to; i++) {
      const seg = this.segments[i];
      if (!seg) continue;
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

  private deleteSelection(): void {
    // Check if every token segment is already empty
    const isEmpty = this.segments.every(
      (seg, i) => !seg.token || this.getBufferValue(i) === '',
    );

    if (isEmpty) {
      this.input.value = '';
      this.input.dispatchEvent(new Event('input', { bubbles: true }));
      this.input.dispatchEvent(new Event('change', { bubbles: true }));
      this.render();
      this.activeTokenIdx = -1;
    }
  }

  // ── Mouse drag ───────────────────────────────────────────────────────────

  private tokenIdxFromEvent(e: MouseEvent): number {
    const el = (e.target as HTMLElement).closest('[data-idx]') as HTMLElement | null;
    if (!el) return -1;
    const idx = parseInt(el.dataset.idx ?? '-1', 10);
    return this.segments[idx]?.token ? idx : -1;
  }

  private handleMouseDown(e: MouseEvent): void {
    if (e.detail >= 2) return;
    const idx = this.tokenIdxFromEvent(e);
    if (idx === -1) return;
    this.selAnchor = idx;
    this.selEnd = idx;
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.selAnchor === -1 || !(e.buttons & 1)) return;
    const idx = this.tokenIdxFromEvent(e);
    if (idx === -1 || idx === this.selEnd) return;

    if (this.activeTokenIdx !== -1) {
      this.activeTokenIdx = -1;
      this.typingBuffer = '';
    }
    this.extendSelectionTo(idx);
  }

  private handleMouseUp(_e: MouseEvent): void {
    if (this.selAnchor !== -1 && this.selAnchor === this.selEnd) {
      const idx = this.selAnchor;
      this.selAnchor = -1;
      this.selEnd = -1;
      this.activateSegment(idx);
    } else if (this.selAnchor !== this.selEnd) {
      this._justDragged = true;
      this.input.focus({ preventScroll: true });
    }
  }

  // ── Double-click ─────────────────────────────────────────────────────────

  private handleWrapperDblClick(e: MouseEvent): void {
    e.preventDefault();
    this.activeTokenIdx = -1;
    this.typingBuffer = '';
    this.selectAll();
    this.input.focus({ preventScroll: true });
  }

  // ── Blur / Focus / wrapper click ─────────────────────────────────────────────────

  private handleBlur(e: FocusEvent): void {
    const related = e.relatedTarget as Node | null;
    if (!related || !this.wrapper.contains(related)) {
      this.deactivate();
    }
  }

  private handleFocus(e: FocusEvent): void {
    this.activateSegment(0);
  }

  private handleWrapperClick(e: MouseEvent): void {
    if (this._justDragged) {
      this._justDragged = false;
      return;
    }
    const target = e.target as HTMLElement;
    if (target === this.wrapper || target === this.input || target === this.overlay) {
      this.endSelection();
      this.activateSegment(this.firstTokenIdx());
    }
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────

  private handleKeyDown(e: KeyboardEvent): void {
    const mod = e.ctrlKey || e.metaKey;

    if (mod && e.key === 'a') {
      e.preventDefault();
      this.selectAll();
      return;
    }

    if (mod && e.key === 'c') {
      if (this.hasSelection()) {
        e.preventDefault();
        this.copySelection();
      }
      return;
    }

    if (e.key === 'Escape') {
      this.hasSelection() ? this.endSelection() : this.deactivate();
      return;
    }

    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      this.typingBuffer = '';
      let selAnchor = -1;

      if (this.hasSelection()) {
        selAnchor = this.selAnchor;
        for (let i = selAnchor; i <= this.selEnd; i++) {
          if (this.segments[i]?.token) {
            this.renderBuffer(i);
          }
        }
        this.endSelection();
      } else if (this.activeTokenIdx !== -1) {
        if (this.getBufferValue(this.activeTokenIdx) === '') selAnchor = this.activeTokenIdx;
        this.renderBuffer();
      }

      if (selAnchor > 0) {
        let s = selAnchor - 1;
        while (s >= 0) {
          if (this.segments[s]?.token) { this.activateSegment(s); break; }
          s--;
        }
      }
      else if (selAnchor == 0) {
        this.activateSegment(selAnchor);
      }

      this.deleteSelection();
      return;
    }

    if (this.activeTokenIdx === -1) return;

    const token = this.segments[this.activeTokenIdx].token!;

    switch (e.key) {
      case 'Tab':
        this.handleTab(e);
        break;
      case 'ArrowRight': {
        e.preventDefault();
        const n = this.nextTokenIdx(this.activeTokenIdx, 1);
        if (n !== -1) this.activateSegment(n);
        break;
      }
      case 'ArrowLeft': {
        e.preventDefault();
        const p = this.nextTokenIdx(this.activeTokenIdx, -1);
        if (p !== -1) this.activateSegment(p);
        break;
      }
      case 'ArrowUp':
        e.preventDefault();
        this.stepValue(token, +1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.stepValue(token, -1);
        break;
      default:
        if (/^\d$/.test(e.key)) {
          e.preventDefault();
          this.typeDigit(token, e.key);
        }
        break;
    }
  }

  private handleTab(e: KeyboardEvent): void {
    const next = this.nextTokenIdx(this.activeTokenIdx, e.shiftKey ? -1 : 1);
    if (next !== -1) {
      e.preventDefault();
      this.activateSegment(next);
    } else {
      this.deactivate();
    }
  }

  // ── Digit typing ──────────────────────────────────────────────────────────

  private typeDigit(token: DateToken, digit: string, skipNext: boolean = false): void {
    this.typingBuffer += digit;
    const num = parseInt(this.typingBuffer, 10);
    const maxVal = tokenMaxValue(token);
    const maxDigit = tokenMaxDigits(token);

    if (this.typingBuffer.length >= maxDigit) {
      const minVal = tokenMinValue(token);
      const clamped = Math.max(minVal, Math.min(maxVal, num));
      this.commitTokenValue(token, clamped);
      this.typingBuffer = '';
      if (!skipNext) {
        const next = this.nextTokenIdx(this.activeTokenIdx, 1);
        if (next !== -1) setTimeout(() => this.activateSegment(next), 0);
      }
    } else {
      this.renderBuffer();
    }
  }

  private renderBuffer(activeTokenIdx: number = this.activeTokenIdx): void {
    const el = this.segEls[activeTokenIdx];
    const token = this.segments[activeTokenIdx].token!;
    if (this.typingBuffer) {
      el.textContent = this.typingBuffer;
      el.classList.remove('empty');
    } else {
      el.textContent = tokenPlaceholder(token);
      el.classList.add('empty');
    }
  }

  private getBufferValue(activeTokenIdx: number): string {
    if (this.typingBuffer) return this.typingBuffer;
    const el = this.segEls[activeTokenIdx];
    return el.classList.contains('empty') ? '' : (el.textContent ?? '');
  }

  // ── Step (↑ ↓) ────────────────────────────────────────────────────────────

  private stepValue(token: DateToken, delta: number): void {
    const date = readInputDate(this.input);
    const base = date ?? new Date();
    const current = tokenCurrentValue(token, base);
    const minV = tokenMinValue(token);
    const maxV = tokenMaxValue(token);
    let next = current + delta;

    if (next < minV) next = maxV;
    if (next > maxV) next = minV;

    this.commitTokenValue(token, next);
  }

  private commitTokenValue(token: DateToken, value: number): void {
    const date = buildDate(readInputDate(this.input), token, value);
    writeInputDate(this.input, date);
    this.render();
  }

  // ── Paste ─────────────────────────────────────────────────────────────────

  private handlePaste(e: ClipboardEvent): void {
    e.preventDefault();
    const text = e.clipboardData?.getData('text/plain') ?? '';
    const date = parsePastedDate(text.trim(), this.format, this.kind);
    if (date) {
      writeInputDate(this.input, date);
      this.render();
    }
  }

  // ── Event wiring ──────────────────────────────────────────────────────────

  private attachEvents(): void {
    this.input.addEventListener('keydown', this._onKeyDown);
    this.input.addEventListener('paste', this._onPaste);
    this.input.addEventListener('change', this._onChange);
    this.input.addEventListener('blur', this._onBlur);
    this.input.addEventListener('focus', this._onFocus);

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

  public update(): void {
    this.render();
  }

  public destroy(): void {
    if (this._destroyed) return;
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
