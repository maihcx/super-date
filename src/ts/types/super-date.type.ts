export interface SuperDateOptions {
  /** Default display format for date inputs, e.g. "dd/MM/yyyy". Can be overridden per-element
   *  via the `data-date-format` attribute. */
  format?: string;
  /** Default display format for time tokens, e.g. "HH:mm" or "HH:mm:ss".
   *  Can be overridden per-element via `data-time-format` attribute. */
  timeFormat?: string;
  /** Delimiter between date part and time part in datetime-local inputs.
   *  Can be overridden per-element via `data-date-time-delimiter` attribute.
   *  Defaults to " " (space). */
  dateTimeDelimiter?: string;
  /** Locale used for month/weekday names. Defaults to navigator.language. */
  locale?: string;
}
