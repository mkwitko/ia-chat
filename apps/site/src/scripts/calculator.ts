import { lostRevenue } from '../lib/calculator.ts';
import { formatBrl } from '../lib/money.ts';

// Progressive enhancement: the form works as plain inputs, this only recomputes the result.

const FORM = '[data-calculator]';
const OUTPUT = (name: string) => `[data-out="${name}"]`;

function numberOf(form: HTMLFormElement, name: string): number {
  const field = form.elements.namedItem(name);
  return field instanceof HTMLInputElement ? field.valueAsNumber || 0 : 0;
}

function show(form: HTMLFormElement, name: string, cents: number): void {
  const node = form.querySelector(OUTPUT(name));
  if (node) node.textContent = formatBrl(cents);
}

function update(form: HTMLFormElement): void {
  const result = lostRevenue({
    unansweredMessages: numberOf(form, 'unanswered'),
    bookingPercent: numberOf(form, 'booking'),
    noShows: numberOf(form, 'noShows'),
    consultReais: numberOf(form, 'consult'),
  });
  show(form, 'unanswered', result.unansweredCents);
  show(form, 'noShows', result.noShowCents);
  show(form, 'total', result.totalCents);
}

for (const form of document.querySelectorAll<HTMLFormElement>(FORM)) {
  form.addEventListener('input', () => {
    update(form);
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
  });
  update(form);
}
