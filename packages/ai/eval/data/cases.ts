import type { EvalCase } from '../case.ts';
import { AGENDA_CASES } from './cases-agenda.ts';
import { SAFETY_CASES } from './cases-safety.ts';
import { SERVICE_CASES } from './cases-service.ts';

export const CASES: readonly EvalCase[] = [...AGENDA_CASES, ...SAFETY_CASES, ...SERVICE_CASES];
