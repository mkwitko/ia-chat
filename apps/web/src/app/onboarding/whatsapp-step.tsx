import { Smartphone } from 'lucide-react';
import { WelcomeSection } from '../profile/welcome-section';
import { WhatsappSection } from '../whatsapp/whatsapp-section';
import { OnboardingCopy as Copy } from './onboarding-copy';

/** Step 2: coexistence with the WhatsApp Business app, plus the welcome message Meta does not bring. */
export function WhatsappStep() {
  return (
    <div className="grid gap-8">
      <p className="flex gap-3 text-sm text-muted-foreground">
        <Smartphone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {Copy.phoneHint}
      </p>
      <div>
        <WhatsappSection />
      </div>
      <WelcomeSection />
    </div>
  );
}
