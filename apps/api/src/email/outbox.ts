export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

/** Transactional email. The real provider arrives with the account from E-00f. */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

/** Keeps messages in memory: tests read them, development prints them. */
export class MemoryOutbox implements EmailSender {
  readonly sent: EmailMessage[] = [];

  send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
    return Promise.resolve();
  }
}
