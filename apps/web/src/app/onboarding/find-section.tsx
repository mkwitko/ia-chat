import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { AreaField } from '../setup/fields';
import { usePrefill, type PrefillSuggestion } from './onboarding-api';
import { PrefillCopy as Copy } from './prefill-copy';
import { PrefillReview } from './prefill-review';

const MAX_SOURCE = 4_000;

const errorText = (error: Error) =>
  (error instanceof ApiError && error.code ? Copy.errors[error.code] : undefined) ??
  Copy.genericError;

/** Spec 09, "Onde te encontram": one field, then the review screen with what was found. */
export function FindSection({ onApplied }: Readonly<{ onApplied?: () => void }>) {
  const [found, setFound] = useState<PrefillSuggestion | null>(null);
  const prefill = usePrefill();
  if (found)
    return (
      <PrefillReview
        found={found}
        onClose={() => {
          setFound(null);
        }}
        {...(onApplied ? { onSaved: onApplied } : {})}
      />
    );
  return (
    <SourceForm
      pending={prefill.isPending}
      error={prefill.error ? errorText(prefill.error) : null}
      onSearch={(source) => {
        prefill.mutate(source, {
          onSuccess: ({ suggestion }) => {
            setFound(suggestion);
          },
        });
      }}
    />
  );
}

interface FormProps {
  pending: boolean;
  error: string | null;
  onSearch: (source: string) => void;
}

function SourceForm({ pending, error, onSearch }: Readonly<FormProps>) {
  const [source, setSource] = useState('');
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(source.trim());
      }}
    >
      <AreaField
        id="find-source"
        label={Copy.sourceLabel}
        hint={Copy.sourceHint}
        placeholder={Copy.sourcePlaceholder}
        value={source}
        onChange={setSource}
        rows={2}
        maxLength={MAX_SOURCE}
        autoCapitalize="off"
        spellCheck={false}
      />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" className="justify-self-start" disabled={pending || !source.trim()}>
        {pending ? Copy.searching : Copy.search}
      </Button>
    </form>
  );
}
