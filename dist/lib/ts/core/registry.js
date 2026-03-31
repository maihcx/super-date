/**
 * registry.ts — SuperDateRegistry tracks bound selectors and uses a single
 * MutationObserver to auto-initialise matching inputs added to the DOM later.
 */
import { SuperDateInstance, INSTANCE_KEY } from './instance';
let observer = null;
let bindings = [];
function defaultOpts(options = {}) {
    var _a, _b;
    return {
        format: (_a = options.format) !== null && _a !== void 0 ? _a : 'dd/MM/yyyy',
        locale: (_b = options.locale) !== null && _b !== void 0 ? _b : (typeof navigator !== 'undefined' ? navigator.language : 'en'),
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
export class SuperDateRegistry {
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
//# sourceMappingURL=registry.js.map