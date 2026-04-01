/** A single recognized date/time token in a format string. */
export type DateToken =
  // Date tokens
  | 'dd' | 'MM' | 'yyyy' | 'yy' | 'd' | 'M'
  // Time tokens
  | 'HH' | 'H'   // 24h hours (padded / unpadded)
  | 'hh' | 'h'   // 12h hours (padded / unpadded)
  | 'mm'          // minutes (padded)  — NOTE: lowercase mm = minutes, uppercase MM = months
  | 'ss';         // seconds (padded)
