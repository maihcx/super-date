/**
 * registry.ts — SuperDateRegistry tracks bound selectors and uses a single
 * MutationObserver to auto-initialise matching inputs added to the DOM later.
 */
import { SuperDateOptions } from '../types/super-date.type';
import { SuperDateInstance } from './instance';
export declare class SuperDateRegistry {
    version: string;
    name: string;
    /**
     * Bind SuperDate to all current **and future** `<input type="date">`
     * elements matching `selector`. Safe to call multiple times with
     * different selectors.
     */
    bind(selector: string, options?: SuperDateOptions): this;
    /**
     * Manually enhance a single element.
     * Returns the existing instance if one is already attached.
     */
    init(el: HTMLInputElement, options?: SuperDateOptions): SuperDateInstance;
    /** Remove the enhancement from a single element. */
    destroy(el: HTMLInputElement): void;
}
//# sourceMappingURL=registry.d.ts.map