/**
 * overlay.ts — builds and updates the visual overlay that sits on top of
 * the hidden native date input.
 */
import { tokenValue, tokenPlaceholder } from './format';
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
export function buildOverlay(input, segments, onSegmentClick, onIconClick) {
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
export function renderSegments(segments, segEls, date) {
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
export function activateSegmentEl(segEls, idx) {
    segEls.forEach((el, i) => el.classList.toggle('active', i === idx));
}
/** Remove active highlight from all segment elements. */
export function deactivateAll(segEls) {
    segEls.forEach(el => el.classList.remove('active'));
}
//# sourceMappingURL=overlay.js.map