export const Speaker = { patient: 'Paciente', clinic: 'Recepção', tool: 'Ferramenta' } as const;
export type Speaker = (typeof Speaker)[keyof typeof Speaker];

export interface Line {
  speaker: Speaker;
  text: string;
}

export function renderTranscript(lines: readonly Line[]): string {
  return lines.map(({ speaker, text }) => `${speaker}: ${text}`).join('\n');
}

/** What the patient sees: no tool lines. */
export function visibleLines(lines: readonly Line[]): Line[] {
  return lines.filter((line) => line.speaker !== Speaker.tool);
}
