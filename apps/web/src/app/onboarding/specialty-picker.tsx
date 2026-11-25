import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { notifySaveError } from '../setup/feedback';
import { useApplyTemplate, useChooseSpecialty, type OnboardingView } from './onboarding-api';
import { OnboardingCopy as Copy } from './onboarding-copy';

interface Applied {
  services: number;
  answers: number;
}

const CHIP =
  'flex min-h-12 cursor-pointer items-center rounded-lg border bg-card px-4 text-base font-medium transition-colors hover:border-line-strong has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring has-disabled:cursor-wait';

/** Specialty as large chips; a tap saves it and links the right policy (templates on request). */
export function SpecialtyPicker({ view }: Readonly<{ view: OnboardingView }>) {
  const choose = useChooseSpecialty();
  return (
    <div className="grid gap-4">
      <fieldset className="grid gap-3">
        <legend className="mb-3 text-sm font-semibold">{Copy.specialtyLabel}</legend>
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
      {view.specialty && <Templates pricesForbidden={view.pricesForbidden} />}
    </div>
  );
}

function Templates({ pricesForbidden }: Readonly<{ pricesForbidden: boolean }>) {
  return (
    <div className="grid justify-items-start gap-3 rounded-lg bg-muted p-4">
      {pricesForbidden && <p className="text-sm">{Copy.pricesForbidden}</p>}
      <p className="text-sm text-muted-foreground">{Copy.examplesNote}</p>
      <TemplateButton />
    </div>
  );
}

function TemplateButton() {
  const template = useApplyTemplate();
  const apply = () => {
    template.mutate(undefined, {
      onSuccess: (created) => {
        const { services, answers } = created as Applied;
        toast.success(
          services + answers === 0 ? Copy.templateNothingNew : Copy.templateDone(services, answers),
        );
      },
      onError: notifySaveError,
    });
  };
  return (
    <Button variant="outline" disabled={template.isPending} onClick={apply}>
      {Copy.useTemplate}
    </Button>
  );
}
