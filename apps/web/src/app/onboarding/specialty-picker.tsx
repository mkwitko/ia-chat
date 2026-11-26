import { cn } from '@/lib/utils';
import { notifySaveError } from '../setup/feedback';
import { useChooseSpecialty, type OnboardingView } from './onboarding-api';
import { OnboardingCopy as Copy } from './onboarding-copy';

const CHIP =
  'flex min-h-12 cursor-pointer items-center rounded-lg border bg-card px-4 text-base font-medium transition-colors hover:border-line-strong has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring has-disabled:cursor-wait';

/** The business area as large chips; a tap saves it and links the right policy (spec 11). */
export function SpecialtyPicker({ view }: Readonly<{ view: OnboardingView }>) {
  const choose = useChooseSpecialty();
  return (
    <fieldset className="grid gap-3">
      {/* The screen title asks the question; the legend names the group for screen readers. */}
      <legend className="sr-only">{Copy.specialtyLabel}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {view.specialties.map((option) => {
          const checked = view.specialty === option.specialty;
          return (
            <label
              key={option.specialty}
              className={cn(CHIP, checked && 'border-primary ring-1 ring-primary')}
            >
              <input
                type="radio"
                name="onboarding-specialty"
                className="sr-only"
                checked={checked}
                disabled={choose.isPending}
                onChange={() => {
                  choose.mutate(option.specialty, { onError: notifySaveError });
                }}
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
