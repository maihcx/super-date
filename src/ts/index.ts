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

import "../css/index.css"

import { SuperDateRegistry } from './core/registry';

/** Singleton registry — the default export used in most projects. */
const SuperDate = new SuperDateRegistry();

const __LIB_VERSION__ = "LIB_VERSION";
const __LIB_NAME__ = "LIB_NAME";

SuperDate.version = __LIB_VERSION__;
SuperDate.name = __LIB_NAME__;

export default SuperDate;
