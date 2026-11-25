import pino, { type DestinationStream, type Logger, type LoggerOptions } from 'pino';
import { isObject } from './guards.ts';
import { currentLogContext } from './context.ts';
import { scrub } from './scrub.ts';

const AXIOM_TARGET = '@axiomhq/pino';
const STDOUT_TARGET = 'pino/file';
const STDOUT_FD = 1;
const DEFAULT_LEVEL = 'info';

export interface LoggerConfig {
  /** Process name on every line: api, worker. */
  service: string;
  level?: string | undefined;
  AXIOM_TOKEN?: string | undefined;
  AXIOM_DATASET?: string | undefined;
}

/** Stdout always; Axiom too when both AXIOM_TOKEN and AXIOM_DATASET are set. */
function transportOf({ AXIOM_TOKEN: token, AXIOM_DATASET: dataset, level }: LoggerConfig) {
  if (!token || !dataset) return {};
  const lvl = level ?? DEFAULT_LEVEL;
  return {
    transport: {
      targets: [
        { target: AXIOM_TARGET, level: lvl, options: { dataset, token } },
        { target: STDOUT_TARGET, level: lvl, options: { destination: STDOUT_FD } },
      ],
    },
  };
}

/** Pino options shared by the API (Fastify `logger`) and the worker. */
export function loggerOptions(config: LoggerConfig): LoggerOptions {
  return {
    level: config.level ?? DEFAULT_LEVEL,
    base: { service: config.service },
    mixin: currentLogContext,
    // Runs on every line before serialization: redaction cannot be skipped by a call site.
    formatters: {
      log: (fields) => {
        const clean = scrub(fields);
        return isObject(clean) ? { ...clean } : {};
      },
    },
    ...transportOf(config),
  };
}

/** `stream` replaces the transport (tests). */
export function createLogger(config: LoggerConfig, stream?: DestinationStream): Logger {
  const { transport, ...options } = loggerOptions(config);
  return stream ? pino(options, stream) : pino({ ...options, ...(transport && { transport }) });
}
