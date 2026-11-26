import { describe, expect, it } from 'vitest';
import { Step } from './onboarding-api';
import { Page, PAGES, resumePage, settlesStep, stepOf } from './wizard-model';

const view = (current: Step | null, specialty: string | null = null) => ({
  current,
  specialty,
  documentSet: false,
});

describe('setup wizard', () => {
  it('splits the first step into area, where clients find you and the document', () => {
    expect(PAGES.slice(0, 3).map(stepOf)).toEqual([Step.account, Step.account, Step.account]);
    expect(settlesStep(Page.area)).toBe(false);
    expect(settlesStep(Page.find)).toBe(false);
    expect(settlesStep(Page.document)).toBe(true);
    expect(settlesStep(Page.services)).toBe(true);
  });

  it('resumes where the owner stopped', () => {
    expect(resumePage(view(Step.account))).toBe(Page.area);
    expect(resumePage(view(Step.account, 'chiropractic'))).toBe(Page.document);
    expect(resumePage(view(Step.hours))).toBe(Page.hours);
    expect(resumePage(view(null))).toBeNull();
    expect(resumePage({ current: Step.account, specialty: 'x', documentSet: true })).toBe(
      Page.document,
    );
    // The WhatsApp left for later: the next open step is where it resumes.
    expect(resumePage(view(Step.services, 'x'))).toBe(Page.services);
  });
});
