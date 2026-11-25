interface ImportMetaEnv {
  readonly VITE_HELP_URL?: string;
  /** Sentry DSN of the panel; empty turns error reporting off. */
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_RELEASE?: string;
}
