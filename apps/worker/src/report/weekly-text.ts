import type { EmailMessage } from '@app/core';
import type { Notice } from '../notify/reasons.ts';

// Research 09 #2: the owner's Monday report in five lines (pt-BR, RN-56). Counts and the
// service-price sum only: no patient name, no message text (RN-38). No promise of gain (RF-71).

export interface WeeklyReport {
  /** Local days, `YYYY-MM-DD`, first and last of the week reported. */
  from: string;
  to: string;
  answered: number;
  booked: number;
  attended: number;
  valueCents: number;
  unanswered: number;
  minSample: number;
}

const CENTS_PER_REAL = 100;
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const RESULTS_PATH = '/resultados';
const TAG = 'weekly-report';
const DAY_MONTH = /^\d{4}-(\d{2})-(\d{2})$/;
const ANSWERED = ['conversa respondida', 'conversas respondidas'] as const;

const plural = (count: number, one: string, many: string) =>
  `${String(count)} ${count === 1 ? one : many}`;
const dayMonth = (day: string) => day.replace(DAY_MONTH, '$2/$1');
const money = (cents: number) => BRL.format(cents / CENTS_PER_REAL);

const WeeklyCopy = {
  subject: (report: WeeklyReport) =>
    `Sua semana no consultório (${dayMonth(report.from)} a ${dayMonth(report.to)})`,
  greeting: 'Olá! Os números da semana passada, contados do seu painel:',
  answered: (n: number) => plural(n, ...ANSWERED),
  booked: (n: number) =>
    plural(n, 'agendamento feito pelo assistente', 'agendamentos feitos pelo assistente'),
  attended: (n: number) =>
    `${plural(n, 'atendimento agendado pelo assistente', 'atendimentos agendados pelo assistente')} com "compareceu" marcado`,
  recovered: (cents: number) =>
    `Recuperado: ${money(cents)} (preço dos serviços desses atendimentos)`,
  noData: (n: number, min: number) =>
    `Recuperado: ainda sem dados suficientes (${String(n)} de ${String(min)} atendimentos)`,
  unanswered: (n: number) =>
    plural(n, 'pergunta sem resposta esperando você', 'perguntas sem resposta esperando você'),
  footer: (url: string) =>
    `Como calculamos e o detalhe por semana: ${url}\nPara não receber mais, desligue em Mais > Notificações.`,
  pushTitle: 'Sua semana no consultório',
  pushBody: (report: WeeklyReport) =>
    `${plural(report.answered, ...ANSWERED)}, ${plural(report.booked, 'agendamento', 'agendamentos')} pelo assistente. Toque para ver.`,
} as const;

/** The five lines, in order: answered, booked, attended, recovered, unanswered. */
export function weeklyLines(report: WeeklyReport): string[] {
  const enough = report.attended >= report.minSample;
  return [
    WeeklyCopy.answered(report.answered),
    WeeklyCopy.booked(report.booked),
    WeeklyCopy.attended(report.attended),
    enough
      ? WeeklyCopy.recovered(report.valueCents)
      : WeeklyCopy.noData(report.attended, report.minSample),
    WeeklyCopy.unanswered(report.unanswered),
  ];
}

export function weeklyEmail({
  to,
  report,
  panelUrl,
}: {
  to: string;
  report: WeeklyReport;
  panelUrl: string;
}): EmailMessage {
  const lines = weeklyLines(report).map((line) => `- ${line}`);
  const text = [
    WeeklyCopy.greeting,
    '',
    ...lines,
    '',
    WeeklyCopy.footer(`${panelUrl}${RESULTS_PATH}`),
  ];
  return { to, subject: WeeklyCopy.subject(report), text: text.join('\n') };
}

export function weeklyNotice(report: WeeklyReport): Notice {
  return {
    title: WeeklyCopy.pushTitle,
    body: WeeklyCopy.pushBody(report),
    url: RESULTS_PATH,
    tag: TAG,
    urgent: false,
  };
}
