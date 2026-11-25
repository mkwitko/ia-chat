import { Specialty } from './steps.ts';
import {
  SPECIALTY_TEMPLATES,
  type TemplateAnswer,
  type TemplateService,
} from './templates-data.ts';

/** Marks every template item so the professional knows it is an example to edit. */
export const EXAMPLE_SUFFIX = ' (exemplo)';
export const EXAMPLE_PREFIX = '[Exemplo, edite] ';

export interface TemplateOptions {
  specialty: Specialty;
  pricesForbidden: boolean;
}

export interface ResolvedTemplate {
  services: TemplateService[];
  answers: TemplateAnswer[];
}

/** The template for a specialty, shaped by its policy: no prices when the policy forbids them. */
export function resolveTemplate({ specialty, pricesForbidden }: TemplateOptions): ResolvedTemplate {
  const template = SPECIALTY_TEMPLATES[specialty];
  return {
    services: template.services.map((service) => ({
      ...service,
      name: service.name + EXAMPLE_SUFFIX,
      priceCents: pricesForbidden ? 0 : service.priceCents,
    })),
    answers: template.answers
      .filter((item) => !(pricesForbidden && item.mentionsPrice))
      .map((item) => ({ ...item, answer: EXAMPLE_PREFIX + item.answer })),
  };
}

export const SPECIALTY_OPTIONS = Object.values(Specialty).map((specialty) => ({
  specialty,
  label: SPECIALTY_TEMPLATES[specialty].label,
}));
