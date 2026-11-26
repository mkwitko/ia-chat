import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { notifySaveError } from '../setup/feedback';
import { useApplyTemplate } from './onboarding-api';
import { OnboardingCopy as Copy } from './onboarding-copy';

interface Applied {
  services: number;
  answers: number;
}

/** The area's example services and answers, on request; never duplicated (E-24). */
export function Templates({ pricesForbidden }: Readonly<{ pricesForbidden: boolean }>) {
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
    <Button
      variant="outline"
      className="h-auto min-h-11 py-2 whitespace-normal"
      disabled={template.isPending}
      onClick={apply}
    >
      {Copy.useTemplate}
    </Button>
  );
}
