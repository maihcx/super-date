/**
 * registry.ts — SuperDateRegistry tracks bound selectors and uses a single
 * MutationObserver to auto-initialise matching inputs added to the DOM later.
 * Supports input[type="date"], input[type="time"], and input[type="datetime-local"].
 */

import { BindEntry } from '../types/bind-entry.type';
import { SuperDateOptions } from '../types/super-date.type';
import { SuperDateInstance, INSTANCE_KEY } from './instance';

let observer: MutationObserver | null = null;
let bindings: BindEntry[] = [];

const DESTROYED_ATTR = 'data-superdate-destroyed';
const SUPPORTED_TYPES = new Set(['date', 'time', 'datetime-local']);

function isDestroyed(el: HTMLInputElement): boolean {
  return el.hasAttribute(DESTROYED_ATTR);
}

function markDestroyed(el: HTMLInputElement): void {
  el.setAttribute(DESTROYED_ATTR, '');
}

function clearDestroyedBySelector(selector: string): void {
  document.querySelectorAll<HTMLInputElement>(selector).forEach(el => {
    el.removeAttribute(DESTROYED_ATTR);
  });
}

function defaultOpts(options: SuperDateOptions = {}): Required<SuperDateOptions> {
  return {
    format:            options.format            ?? 'dd/MM/yyyy',
    timeFormat:        options.timeFormat         ?? 'HH:mm',
    dateTimeDelimiter: options.dateTimeDelimiter  ?? ' ',
    locale:            options.locale             ?? (typeof navigator !== 'undefined' ? navigator.language : 'en'),
  };
}

function initAll(selector: string, opts: Required<SuperDateOptions>): void {
  document.querySelectorAll<HTMLInputElement>(selector).forEach(el => {
    if (!SUPPORTED_TYPES.has(el.type) || el[INSTANCE_KEY] || isDestroyed(el)) return;
    el[INSTANCE_KEY] = new SuperDateInstance(
      el,
      opts.format,
      opts.timeFormat,
      opts.dateTimeDelimiter,
    );
  });
}

function tryInit(node: Element): void {
  for (const binding of bindings) {
    if (node instanceof HTMLInputElement && node.matches(binding.selector)) {
      if (SUPPORTED_TYPES.has(node.type) && !node[INSTANCE_KEY] && !isDestroyed(node)) {
        node[INSTANCE_KEY] = new SuperDateInstance(
          node,
          binding.options.format,
          binding.options.timeFormat,
          binding.options.dateTimeDelimiter,
        );
      }
    }
    node.querySelectorAll<HTMLInputElement>(binding.selector).forEach(el => {
      if (!SUPPORTED_TYPES.has(el.type) || el[INSTANCE_KEY] || isDestroyed(el)) return;
      el[INSTANCE_KEY] = new SuperDateInstance(
        el,
        binding.options.format,
        binding.options.timeFormat,
        binding.options.dateTimeDelimiter,
      );
    });
  }
}

function startObserver(): void {
  observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (node instanceof Element) tryInit(node);
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

export class SuperDateRegistry {

  public version: string = '';
  public name: string = '';

  /**
   * Bind SuperDate to all current **and future** `<input type="date">`,
   * `<input type="time">`, and `<input type="datetime-local">` elements
   * matching `selector`. Safe to call multiple times with different selectors.
   */
  bind(selector: string, options: SuperDateOptions = {}): this {
    const opts = defaultOpts(options);
    bindings.push({ selector, options: opts });

    clearDestroyedBySelector(selector);
    initAll(selector, opts);

    if (!observer) startObserver();

    return this;
  }

  /**
   * Manually enhance a single element.
   * Returns the existing instance if one is already attached.
   */
  init(el: HTMLInputElement, options: SuperDateOptions = {}): SuperDateInstance {
    if (el[INSTANCE_KEY]) return el[INSTANCE_KEY]!;

    el.removeAttribute(DESTROYED_ATTR);

    const opts     = defaultOpts(options);
    const instance = new SuperDateInstance(el, opts.format, opts.timeFormat, opts.dateTimeDelimiter);
    el[INSTANCE_KEY] = instance;
    return instance;
  }

  /**
   * Remove the enhancement from a single element and mark it with
   * [data-superdate-destroyed] so the MutationObserver won't re-bind it.
   */
  destroy(el: HTMLInputElement): void {
    if (el[INSTANCE_KEY]) {
      el[INSTANCE_KEY]!.destroy();
      delete el[INSTANCE_KEY];
    }
    markDestroyed(el);
  }
}
