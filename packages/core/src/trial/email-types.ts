export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

/** Transactional email: Resend in production (resend-sender.ts), the log in development. */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}
