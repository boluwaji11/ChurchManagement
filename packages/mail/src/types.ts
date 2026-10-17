/** One message, in the few fields every transport here needs. */
export interface Message {
  to: string;
  from: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

/** Whether it went, and what the provider said where it did not. */
export type Sent =
  | { ok: true }
  | { ok: false; connected: boolean; said?: string };
