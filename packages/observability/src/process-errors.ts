const UNCAUGHT = 'uncaughtException';
const UNHANDLED = 'unhandledRejection';
const EXIT_FAILURE = 1;
const FATAL = 'process crashed';

interface FatalLog {
  fatal: (fields: object, message: string) => void;
}

/**
 * Structured log for errors nobody caught, then exit (the supervisor restarts the process).
 * Install only without Sentry: its own integrations already capture both and then exit.
 * ponytail: exits right away, so the last line may miss the Axiom batch; stdout always has it.
 */
export function logProcessErrors(log: FatalLog): void {
  for (const signal of [UNCAUGHT, UNHANDLED]) {
    process.on(signal, (error: unknown) => {
      log.fatal({ err: error, signal }, FATAL);
      process.exit(EXIT_FAILURE);
    });
  }
}
