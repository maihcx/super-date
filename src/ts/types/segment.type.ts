import { DateToken } from "./date-token.type";

export interface Segment {
  token: DateToken | null; // null → literal text
  text: string;
  start: number; // character position in the format string
  end: number;
}