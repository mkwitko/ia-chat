import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { HELP_URL } from '@/lib/config';
import { QrCopy as Copy } from './qr-copy';

const TERMS_PATH = '/termo-conexao-qr';
/** The full term published on the site from docs/legal; empty when the site URL is unknown. */
const TERMS_URL = HELP_URL ? new URL(TERMS_PATH, HELP_URL).toString() : '';
const CHECK_ID = 'qr-terms-accept';

/** RF-27: the risks in plain words, an explicit check, then the accept. */
export function QrTerms({
  pending,
  onAccept,
  onCancel,
}: Readonly<{ pending: boolean; onAccept: () => void; onCancel: () => void }>) {
  const [accepted, setAccepted] = useState(false);
  return (
    <div className="grid gap-3 rounded-lg border border-danger bg-danger-soft p-4">
      <h3 className="font-semibold">{Copy.termsTitle}</h3>
      <Risks />
      <label htmlFor={CHECK_ID} className="flex min-h-11 items-center gap-3 text-sm font-medium">
        <input
          id={CHECK_ID}
          type="checkbox"
          className="size-5 shrink-0 accent-primary"
          checked={accepted}
          onChange={(event) => {
            setAccepted(event.target.checked);
          }}
        />
        {Copy.accept}
      </label>
      <div className="flex flex-wrap gap-2">
        <Button disabled={!accepted || pending} onClick={onAccept}>
          {pending ? Copy.connecting : Copy.confirm}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {Copy.cancel}
        </Button>
      </div>
    </div>
  );
}

function Risks() {
  return (
    <>
      <ul className="grid list-disc gap-2 pl-5 text-sm">
        {Copy.risks.map((risk) => (
          <li key={risk}>{risk}</li>
        ))}
      </ul>
      {TERMS_URL && (
        <a
          className="justify-self-start text-sm font-semibold underline"
          href={TERMS_URL}
          target="_blank"
          rel="noreferrer"
        >
          {Copy.readFull}
        </a>
      )}
    </>
  );
}
