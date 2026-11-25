// Mirrors the API (customers, home, attendance); the web does not import server code.

export const Stage = {
  newContact: 'new_contact',
  booked: 'booked',
  attended: 'attended',
  notBooked: 'not_booked',
  lost: 'lost',
} as const;
export type Stage = (typeof Stage)[keyof typeof Stage];

export const Origin = {
  whatsappDirect: 'whatsapp_direct',
  referral: 'referral',
  site: 'site',
  adClick: 'ad_click',
  imported: 'imported',
  manual: 'manual',
} as const;
export type Origin = (typeof Origin)[keyof typeof Origin];

export const LostReason = {
  price: 'price',
  distance: 'distance',
  chooseOther: 'chose_other',
  noLongerNeeded: 'no_longer_needed',
  wrongNumber: 'wrong_number',
  other: 'other',
} as const;
export type LostReason = (typeof LostReason)[keyof typeof LostReason];

export const ConsentKind = { optIn: 'opt_in', optOut: 'opt_out' } as const;
export type ConsentKind = (typeof ConsentKind)[keyof typeof ConsentKind];

export const ConsentSource = {
  patientMessage: 'patient_message',
  ownerPanel: 'owner_panel',
  backfill: 'backfill',
} as const;
export type ConsentSource = (typeof ConsentSource)[keyof typeof ConsentSource];

export const ConsentCategory = { service: 'service', marketing: 'marketing', all: 'all' } as const;
export type ConsentCategory = (typeof ConsentCategory)[keyof typeof ConsentCategory];

export const StageSource = { derived: 'derived', manual: 'manual' } as const;
export type StageSource = (typeof StageSource)[keyof typeof StageSource];

export const Outcome = { attended: 'attended', noShow: 'no_show' } as const;
export type Outcome = (typeof Outcome)[keyof typeof Outcome];

export interface CustomerSummary {
  id: string;
  name: string | null;
  phone: string | null;
  origin: Origin;
  originRef: string | null;
  stage: Stage;
  lostReason: LostReason | null;
  optedOut: boolean;
  lastContactAt: string | null;
  nextAppointmentAt: string | null;
  conversationId: string | null;
  attendedCount: number;
}

export interface CustomerAppointment {
  id: string;
  startsAt: string;
  status: string;
  serviceName: string;
}

export interface ConsentEntry {
  id: string;
  kind: ConsentKind;
  category: ConsentCategory;
  source: ConsentSource;
  actorType: string;
  at: string;
}

export interface StageEntry {
  id: string;
  from: Stage | null;
  to: Stage;
  source: StageSource;
  lostReason: LostReason | null;
  at: string;
}

export interface CustomerDetail extends CustomerSummary {
  createdAt: string;
  conversations: number;
  appointments: CustomerAppointment[];
  consent: ConsentEntry[];
  stages: StageEntry[];
}
