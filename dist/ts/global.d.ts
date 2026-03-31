/**
 * SuperDate — lightweight TypeScript date-input enhancer.
 *
 * Hides the native browser chrome, renders a fully custom overlay,
 * and supports keyboard editing, copy/paste, and custom date formats.
 *
 * Usage:
 *   import SuperDate from 'superdate';
 *   SuperDate.bind('.date-field');
 *   SuperDate.bind('[data-datepicker]', { format: 'MM/dd/yyyy' });
 */
import "../css/index.css";
import { SuperDateRegistry } from './core/registry';
declare global {
    var GLOBAL_SDATE: SuperDateRegistry;
}
declare var SuperDate: SuperDateRegistry;
export default SuperDate;
//# sourceMappingURL=global.d.ts.map