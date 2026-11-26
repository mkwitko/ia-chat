import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { notifySaveError } from '../setup/feedback';
import { AreaField, TextField } from '../setup/fields';
import type { PrefillSuggestion } from './onboarding-api';
import { useApplyPrefill } from './prefill-apply';
import { draftOf, hasContent, type ReviewDraft, type TextField as Field } from './prefill-model';
import { PrefillCopy as Copy } from './prefill-copy';
import { ReviewHours, ReviewPackages, ReviewServices } from './review-lists';

interface ReviewProps {
  found: PrefillSuggestion;
  onClose: () => void;
  /** After saving (the wizard moves on); defaults to closing. */
  onSaved?: () => void;
}

/** "Encontramos isto, confere?": one screen, every field editable, nothing saved before the tap. */
export function PrefillReview({ found, onClose, onSaved = onClose }: Readonly<ReviewProps>) {
  const [draft, setDraft] = useState<ReviewDraft>(() => draftOf(found));
  const apply = useApplyPrefill();
  const set = (field: Field) => (value: string) => {
    setDraft({ ...draft, [field]: value });
  };
  const save = () => {
    apply.mutate(draft, { onSuccess: onSaved, onError: notifySaveError });
  };
  return (
    <section aria-labelledby="review-title" className="grid gap-5 border-t pt-5">
      <ReviewHeader />
      <ReviewFields draft={draft} set={set} />
      <ReviewLists draft={draft} onChange={setDraft} />
      <div className="flex flex-wrap gap-2">
        <Button disabled={apply.isPending || !hasContent(draft)} onClick={save}>
          {apply.isPending ? Copy.saving : Copy.save}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          {Copy.discard}
        </Button>
      </div>
    </section>
  );
}

function ReviewLists({
  draft,
  onChange,
}: Readonly<{ draft: ReviewDraft; onChange: (draft: ReviewDraft) => void }>) {
  return (
    <>
      <ReviewServices
        services={draft.services}
        onChange={(services) => {
          onChange({ ...draft, services });
        }}
      />
      <ReviewPackages
        packages={draft.packages}
        onChange={(packages) => {
          onChange({ ...draft, packages });
        }}
      />
      <ReviewHours
        hours={draft.hours}
        keep={draft.keepHours}
        onKeep={(keepHours) => {
          onChange({ ...draft, keepHours });
        }}
      />
    </>
  );
}

function ReviewHeader() {
  return (
    <div className="grid gap-1">
      <h3 id="review-title" className="text-lg font-semibold">
        {Copy.reviewTitle}
      </h3>
      <p className="text-sm text-muted-foreground">{Copy.reviewIntro}</p>
    </div>
  );
}

interface FieldsProps {
  draft: ReviewDraft;
  set: (field: Field) => (value: string) => void;
}

const SHORT_FIELDS: readonly { field: Field; label: string; type?: string }[] = [
  { field: 'name', label: Copy.name },
  { field: 'phone', label: Copy.phone, type: 'tel' },
  { field: 'address', label: Copy.address },
  { field: 'website', label: Copy.website, type: 'url' },
  { field: 'social', label: Copy.social },
];

function ReviewFields({ draft, set }: Readonly<FieldsProps>) {
  return (
    <div className="grid gap-4">
      {SHORT_FIELDS.map(({ field, label, type }) => (
        <TextField
          key={field}
          id={`review-${field}`}
          label={label}
          value={draft[field]}
          onChange={set(field)}
          maxLength={300}
          placeholder={Copy.notFound}
          {...(type ? { type } : {})}
        />
      ))}
      <AreaField
        id="review-description"
        label={Copy.description}
        value={draft.description}
        onChange={set('description')}
        maxLength={600}
        placeholder={Copy.notFound}
      />
    </div>
  );
}
