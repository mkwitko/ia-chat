import { AccountStep } from './account-step';
import { ActivationStep } from './activation-step';
import { HoursStep } from './hours-step';
import { Step, type OnboardingView } from './onboarding-api';
import { STEP_INFO } from './onboarding-copy';
import { ServicesStep } from './services-step';
import { TryChat } from './try-chat';
import { WhatsappStep } from './whatsapp-step';

export interface BodyProps {
  step: Step;
  view: OnboardingView;
  document: { value: string; onChange: (value: string) => void };
  /** For steps that confirm with their own button (hours). */
  onDone: () => void;
  onGoTo: (step: Step) => void;
}

/** The work of the step, done right here: no detour to another screen. */
export function StepBody({ step, view, document, onDone, onGoTo }: Readonly<BodyProps>) {
  return (
    <>
      <p className="text-base text-muted-foreground">{STEP_INFO[step].text}</p>
      <Work step={step} view={view} document={document} onDone={onDone} onGoTo={onGoTo} />
    </>
  );
}

function Work({ step, view, document, onDone, onGoTo }: Readonly<BodyProps>) {
  switch (step) {
    case Step.account:
      return <AccountStep view={view} document={document} onGoTo={onGoTo} />;
    case Step.whatsapp:
      return <WhatsappStep />;
    case Step.services:
      return <ServicesStep view={view} />;
    case Step.hours:
      return <HoursStep onDone={onDone} />;
    case Step.simulator:
      return <TryChat onGoTo={onGoTo} />;
    case Step.activation:
      return <ActivationStep view={view} />;
    default: {
      const never: never = step;
      return never;
    }
  }
}
