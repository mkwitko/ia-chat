import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { notifySaveError } from '../setup/feedback';
import { useApplyTemplate, useChooseSpecialty, type OnboardingView } from './onboarding-api';
import { OnboardingCopy as Copy } from './onboarding-copy';

interface Applied {
  services: number;
  answers: number;
}

/** Specialty choice links the right policy; templates are optional and applied on request. */
export function SpecialtyPicker({ view }: Readonly<{ view: OnboardingView }>) {
  const choose = useChooseSpecialty();
  return (
    <div className="grid gap-3">
      <label className="grid gap-1 text-sm font-semibold" htmlFor="onboarding-specialty">
        {Copy.specialtyLabel}
        <select
          id="onboarding-specialty"
          className="h-11 rounded-lg border bg-background px-3 font-normal"
          value={view.specialty ?? ''}
          disabled={choose.isPending}
          onChange={(event) => {
            choose.mutate(event.target.value, { onError: notifySaveError });
          }}
        >
          <option value="" disabled />
          {view.specialties.map((option) => (
            <option key={option.specialty} value={option.specialty}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <p className="text-sm text-muted-foreground">{Copy.specialtyHint}</p>
      {view.specialty && (
        <>
          {view.pricesForbidden && (
            <p className="rounded-lg bg-attention-soft px-3 py-2 text-sm">{Copy.pricesForbidden}</p>
          )}
          <p className="text-sm text-muted-foreground">{Copy.examplesNote}</p>
          <TemplateButton />
        </>
      )}
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
