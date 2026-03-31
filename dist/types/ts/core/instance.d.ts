/**
 * instance.ts — SuperDateInstance manages one enhanced date input:
 * overlay rendering, keyboard/mouse/paste interaction, and lifecycle.
 */
export declare const INSTANCE_KEY = "__superdate__";
declare global {
    interface HTMLInputElement {
        [INSTANCE_KEY]?: SuperDateInstance;
    }
}
export declare class SuperDateInstance {
    private input;
    private format;
    private segments;
    private wrapper;
    private overlay;
    private segEls;
    private activeTokenIdx;
    private typingBuffer;
    constructor(input: HTMLInputElement, globalFormat: string);
    private render;
    private activateSegment;
    private deactivate;
    private firstTokenIdx;
    private nextTokenIdx;
    private handleKeyDown;
    private handleTab;
    private typeDigit;
    private renderBuffer;
    private stepValue;
    private commitTokenValue;
    private handlePaste;
    private attachEvents;
    /** Re-render the overlay from the current input value. */
    update(): void;
    /** Destroy this instance and restore the original input element. */
    destroy(): void;
}
//# sourceMappingURL=instance.d.ts.map