export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

/** Transactional email. The real provider arrives with the account from E-00f. */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}
