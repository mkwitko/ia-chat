import { templateParams } from '@app/core';

// M-09: what the client reads. Written by code from the database (never by the model), so the
// time and the service are facts. Kind wording, no judgment after a no-show (research 09, #8).

interface Slot {
  serviceName: string;
  startsAt: Date;
  timezone: string;
}

function when(slot: Slot): { service: string; date: string; time: string } {
  const [service = '', date = '', time = ''] = templateParams(slot);
  return { service, date, time };
}

export const WaitlistCopy = {
  offer: (slot: Slot & { minutes: number }): string => {
    const { service, date, time } = when(slot);
    return `Abriu um horário que você pediu: ${service} em ${date} às ${time}. Quer ficar com ele? Responda SIM em até ${String(slot.minutes)} minutos. Ele fica com quem confirmar primeiro.`;
  },
  noShow: (slot: Slot): string => {
    const { date, time } = when(slot);
    return `Oi! Sentimos sua falta no horário de ${date} às ${time}. Quer remarcar? Me diga um dia e um período que fiquem bons para você.`;
  },
} as const;
