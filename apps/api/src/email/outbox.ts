import type { EmailMessage, EmailSender } from '@app/core';

export type { EmailMessage, EmailSender };

/** Keeps messages in memory: tests read them, development prints them. */
export class MemoryOutbox implements EmailSender {
  readonly sent: EmailMessage[] = [];

  send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
    return Promise.resolve();
  }
}
