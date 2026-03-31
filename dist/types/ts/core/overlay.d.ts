/**
 * overlay.ts — builds and updates the visual overlay that sits on top of
 * the hidden native date input.
 */
import { Segment } from '../types/segment.type';
export interface OverlayElements {
    wrapper: HTMLElement;
    overlay: HTMLElement;
    segEls: HTMLElement[];
}
/**
 * Wrap `input` in a `.superdate-wrapper`, inject the overlay element and
 * segment spans. Returns references to every created element.
 */
export declare function buildOverlay(input: HTMLInputElement, segments: Segment[], onSegmentClick: (idx: number) => void, onIconClick: () => void): OverlayElements;
/**
 * Re-render all segment spans from the current date value.
 */
export declare function renderSegments(segments: Segment[], segEls: HTMLElement[], date: Date | null): void;
/**
 * Mark one segment element as active (highlighted), deactivate all others.
 */
export declare function activateSegmentEl(segEls: HTMLElement[], idx: number): void;
/** Remove active highlight from all segment elements. */
export declare function deactivateAll(segEls: HTMLElement[]): void;
//# sourceMappingURL=overlay.d.ts.map