import { generateText } from 'ai';
import { Provider, type ModelRef } from '../src/models.ts';
import { NO_RETENTION, type ModelResolver } from '../src/providers.ts';
import type { Meter } from './meter.ts';
import { renderTranscript, visibleLines, type Line } from './transcript.ts';

// Spec 04: a model plays the patient, with a persona and a goal. It is not a candidate,
// so it does not favor any of them.
export const SIMULATOR: ModelRef = { provider: Provider.google, model: 'gemini-3.1-flash-lite' };
export const END_MARKER = '<fim>';

export interface Patient {
  persona: string;
  goal: string;
}

const INSTRUCTIONS = `Você simula um paciente conversando pelo WhatsApp com a recepção de um consultório de quiropraxia.
Escreva só a próxima mensagem do paciente: curta, informal, como alguém digitando no celular (pode ter abreviação e erro de digitação).
Siga a persona e persiga o objetivo. Não aceite algo diferente do objetivo sem a recepção oferecer.
Quando o objetivo for cumprido, quando ficar claro que não será, ou quando a recepção disser que uma pessoa vai assumir, responda exatamente ${END_MARKER}.`;

export interface SimulatorDeps {
  resolver: ModelResolver;
  meter: Meter;
}

/** Next patient message, or null when the simulated patient is done. */
export async function nextPatientMessage(
  deps: SimulatorDeps,
  patient: Patient,
  lines: readonly Line[],
): Promise<string | null> {
  const result = await generateText({
    model: deps.resolver.language(SIMULATOR),
    instructions: INSTRUCTIONS,
    prompt: `Persona: ${patient.persona}\nObjetivo: ${patient.goal}\n\nConversa até agora:\n${renderTranscript(visibleLines(lines))}\n\nPróxima mensagem do paciente:`,
    maxRetries: 2,
    providerOptions: { gateway: NO_RETENTION },
  });
  deps.meter.add(SIMULATOR, result.usage);
  const text = result.text.trim();
  return text.includes(END_MARKER) || !text ? null : text;
}
