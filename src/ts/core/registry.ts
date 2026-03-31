/**
 * registry.ts — SuperDateRegistry tracks bound selectors and uses a single
 * MutationObserver to auto-initialise matching inputs added to the DOM later.
 */

import { BindEntry } from '../types/bind-entry.type';
import { SuperDateOptions } from '../types/super-date.type';
import { SuperDateInstance, INSTANCE_KEY } from './instance';

let observer: MutationObserver | null = null;
let bindings: BindEntry[] = [];

function defaultOpts(options: SuperDateOptions = {}): Required<SuperDateOptions> {
  return {
    format: options.format ?? 'dd/MM/yyyy',
    locale: options.locale ?? (typeof navigator !== 'undefined' ? navigator.language : 'en'),
  };
}

function initAll(selector: string, opts: Required<SuperDateOptions>): void {
  document.querySelectorAll<HTMLInputElement>(selector).forEach(el => {
    if (el.type !== 'date' || el[INSTANCE_KEY]) return;
    el[INSTANCE_KEY] = new SuperDateInstance(el, opts.format);
  });
}

function tryInit(node: Element): void {
  for (const binding of bindings) {
    // The node itself may match
    if (node instanceof HTMLInputElement && node.matches(binding.selector)) {
      if (node.type === 'date' && !node[INSTANCE_KEY]) {
        node[INSTANCE_KEY] = new SuperDateInstance(node, binding.options.format);
      }
    }
    // Or it may contain matching descendants
    node.querySelectorAll<HTMLInputElement>(binding.selector).forEach(el => {
      if (el.type !== 'date' || el[INSTANCE_KEY]) return;
      el[INSTANCE_KEY] = new SuperDateInstance(el, binding.options.format);
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
   * Bind SuperDate to all current **and future** `<input type="date">`
   * elements matching `selector`. Safe to call multiple times with
   * different selectors.
   */
  bind(selector: string, options: SuperDateOptions = {}): this {
    const opts = defaultOpts(options);
    bindings.push({ selector, options: opts });
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

    const opts     = defaultOpts(options);
    const instance = new SuperDateInstance(el, opts.format);
    el[INSTANCE_KEY] = instance;
    return instance;
  }

  /** Remove the enhancement from a single element. */
  destroy(el: HTMLInputElement): void {
    if (el[INSTANCE_KEY]) {
      el[INSTANCE_KEY]!.destroy();
      delete el[INSTANCE_KEY];
    }
  }
}
