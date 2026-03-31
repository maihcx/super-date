/**
 * format.ts — format string parsing, token metadata, and date read/write helpers.
 */
import { DateToken } from "../types/date-token.type";
import { Segment } from "../types/segment.type";
/**
 * Parse a format string into an ordered array of Segment descriptors.
 * Recognised tokens: yyyy, yy, MM, M, dd, d.
 * Everything else is treated as a literal separator.
 */
export declare function parseFormat(format: string): Segment[];
export declare function tokenValue(token: DateToken, date: Date | null): string;
export declare function tokenPlaceholder(token: DateToken): string;
export declare function tokenMaxDigits(token: DateToken): number;
export declare function tokenMaxValue(token: DateToken): number;
export declare function tokenMinValue(token: DateToken): number;
/** Clamp a year/month/day combination to a real calendar date. */
export declare function buildDate(current: Date | null, token: DateToken, newRaw: number): Date;
/** Read a date-only ISO string (yyyy-MM-dd) from the hidden input. */
export declare function readInputDate(input: HTMLInputElement): Date | null;
/** Write a Date back as ISO date (yyyy-MM-dd) and fire native events. */
export declare function writeInputDate(input: HTMLInputElement, date: Date): void;
/**
 * Try to parse a pasted string using `preferredFormat` first,
 * then common fallback formats. Returns null if all attempts fail.
 */
export declare function parsePastedDate(text: string, preferredFormat: string): Date | null;
export declare function pad(n: number, len: number): string;
//# sourceMappingURL=format.d.ts.map