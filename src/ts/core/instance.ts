/**
 * instance.ts — SuperDateInstance manages one enhanced date input:
 * overlay rendering, keyboard/mouse/paste interaction, and lifecycle.
 */

import { DateToken } from '../types/date-token.type';
import { Segment } from '../types/segment.type';
import {
  parseFormat,
  tokenMaxDigits,
  tokenMaxValue,
  tokenMinValue,
  buildDate,
  readInputDate,
  writeInputDate,
  parsePastedDate,
} from './format';
import {
  buildOverlay,
  renderSegments,
  activateSegmentEl,
  deactivateAll,
} from './overlay';

// Augment HTMLInputElement to carry our instance reference.
export const INSTANCE_KEY = '__superdate__';

declare global {
  interface HTMLInputElement {
    [INSTANCE_KEY]?: SuperDateInstance;
  }
}

export class SuperDateInstance {
  private input: HTMLInputElement;
  private format: string;
  private segments: Segment[];

  private wrapper: HTMLElement;
  private overlay: HTMLElement;
  private segEls: HTMLElement[];

  private activeTokenIdx: number = -1;
  private typingBuffer: string = '';

  constructor(input: HTMLInputElement, globalFormat: string) {
    this.input = input;
    this.format = input.dataset.dateFormat ?? globalFormat;
    
    this.segments = parseFormat(this.format);
    
    
    const elements = buildOverlay(
      input,
      this.segments,
      (idx) => this.activateSegment(idx),
      () => this.input.showPicker?.(),
    );

    this.wrapper = elements.wrapper;
    this.overlay = elements.overlay;
    this.segEls  = elements.segEls;

    this.render();
    this.attachEvents();
  }

  // ── Rendering ───────────────────────────────────────────────────────────────

  private render(): void {
    renderSegments(this.segments, this.segEls, readInputDate(this.input));
  }

  // ── Segment activation ───────────────────────────────────────────────────────

  private activateSegment(idx: number): void {
    if (idx < 0 || idx >= this.segments.length) return;
    if (!this.segments[idx].token) return;

    this.typingBuffer = '';
    this.activeTokenIdx = idx;
    activateSegmentEl(this.segEls, idx);
    this.input.focus({ preventScroll: true });
  }

  private deactivate(): void {
    this.activeTokenIdx = -1;
    this.typingBuffer = '';
    deactivateAll(this.segEls);
  }

  private firstTokenIdx(): number {
    return this.segments.findIndex(s => s.token !== null);
  }

  private nextTokenIdx(from: number, dir: 1 | -1 = 1): number {
    let i = from + dir;
    while (i >= 0 && i < this.segments.length) {
      if (this.segments[i].token) return i;
      i += dir;
    }
    return -1;
  }

  // ── Keyboard handling ────────────────────────────────────────────────────────

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.activeTokenIdx === -1) return;

    const token = this.segments[this.activeTokenIdx].token!;

    switch (e.key) {
      case 'Tab':
        this.handleTab(e);
        break;
      case 'ArrowRight':
        e.preventDefault();
        { const n = this.nextTokenIdx(this.activeTokenIdx, 1);  if (n !== -1) this.activateSegment(n); }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        { const p = this.nextTokenIdx(this.activeTokenIdx, -1); if (p !== -1) this.activateSegment(p); }
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
          if (e.key === 'a') { e.preventDefault(); this.activateSegment(this.firstTokenIdx()); }
          break;
        }
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

  // ── Digit typing ─────────────────────────────────────────────────────────────

  private typeDigit(token: DateToken, digit: string): void {
    this.typingBuffer += digit;
    const num      = parseInt(this.typingBuffer, 10);
    const maxVal   = tokenMaxValue(token);
    const maxDigit = tokenMaxDigits(token);

    const wouldExceed = num * 10 > maxVal;
    const fullLength  = this.typingBuffer.length >= maxDigit;

    if (fullLength || wouldExceed) {
      const clamped = Math.max(tokenMinValue(token), Math.min(maxVal, num));
      this.commitTokenValue(token, clamped);
      this.typingBuffer = '';
      const next = this.nextTokenIdx(this.activeTokenIdx, 1);
      if (next !== -1) setTimeout(() => this.activateSegment(next), 0);
    } else {
      this.renderBuffer();
    }
  }

  private renderBuffer(): void {
    const el    = this.segEls[this.activeTokenIdx];
    const token = this.segments[this.activeTokenIdx].token!;
    if (this.typingBuffer) {
      el.textContent = this.typingBuffer;
      el.classList.remove('empty');
    } else {
      el.textContent = token === 'yyyy' ? 'yyyy'
                     : token === 'yy'   ? 'yy'
                     : token === 'MM' || token === 'M' ? (token === 'MM' ? 'mm' : 'm')
                     : token === 'dd' ? 'dd' : 'd';
      el.classList.add('empty');
    }
  }

  // ── Step (↑ ↓) ───────────────────────────────────────────────────────────────

  private stepValue(token: DateToken, delta: number): void {
    const date = readInputDate(this.input);
    const base = date ?? new Date();
    let current: number;

    switch (token) {
      case 'dd': case 'd':   current = base.getDate();              break;
      case 'MM': case 'M':   current = base.getMonth() + 1;         break;
      case 'yyyy':           current = base.getFullYear();           break;
      case 'yy':             current = base.getFullYear() % 100;    break;
    }

    const minV = tokenMinValue(token);
    const maxV = tokenMaxValue(token);
    let next   = current + delta;

    if (next < minV) next = maxV;
    if (next > maxV) next = minV;

    this.commitTokenValue(token, next);
  }

  private commitTokenValue(token: DateToken, value: number): void {
    const date = buildDate(readInputDate(this.input), token, value);
    writeInputDate(this.input, date);
    this.render();
  }

  // ── Paste ────────────────────────────────────────────────────────────────────

  private handlePaste(e: ClipboardEvent): void {
    e.preventDefault();
    const text = e.clipboardData?.getData('text/plain') ?? '';
    const date = parsePastedDate(text.trim(), this.format);
    if (date) {
      writeInputDate(this.input, date);
      this.render();
    }
  }

  // ── Event wiring ─────────────────────────────────────────────────────────────

  private attachEvents(): void {
    this.input.addEventListener('keydown', (e) => this.handleKeyDown(e));
    this.input.addEventListener('paste',   (e) => this.handlePaste(e));
    this.input.addEventListener('change',  ()  => this.render());

    this.input.addEventListener('blur', (e) => {
      const related = (e as FocusEvent).relatedTarget as Node | null;
      if (!related || !this.wrapper.contains(related)) this.deactivate();
    });

    // Click on wrapper background → activate first segment
    this.wrapper.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
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
  public update(): void {
    this.render();
  }

  /** Destroy this instance and restore the original input element. */
  public destroy(): void {
    this.input.classList.remove('superdate-input');
    this.input.style.display  = '';
    this.input.style.width    = '';
    this.input.style.color    = '';
    this.wrapper.replaceWith(this.input);
  }
}
