import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Route } from '@/routes';
import { useConfirmReview, useDiscardReview, type ReviewSelection } from './review-api';
import { ReviewCopy as Copy } from './review-copy';

interface ActionProps {
  summary: string;
  selections: ReviewSelection[];
}

/** The two decisions and what follows each: a toast and back to Conexões. */
function useDecisions(selections: ReviewSelection[]) {
  const navigate = useNavigate();
  const confirm = useConfirmReview();
  const discard = useDiscardReview();
  const done = (message: string) => {
    toast(message);
    void navigate(Route.clinicWhatsapp);
  };
  const fail = () => toast.error(Copy.failed);
  return {
    busy: confirm.isPending || discard.isPending,
    confirming: confirm.isPending,
    confirm: () => {
      confirm.mutate(selections, {
        onSuccess: (result) => {
          done(Copy.imported(result.clients, result.messages));
        },
        onError: fail,
      });
    },
    discard: () => {
      discard.mutate(undefined, {
        onSuccess: () => {
          done(Copy.discarded);
        },
        onError: fail,
      });
    },
  };
}

/** Confirm imports only what is ticked; "Descartar tudo" asks once, then deletes everything staged. */
export function ReviewActions({ summary, selections }: Readonly<ActionProps>) {
  const decisions = useDecisions(selections);
  const [asking, setAsking] = useState(false);
  return (
    <div className="sticky bottom-0 mt-4 grid gap-3 border-t bg-background px-4 py-3 md:px-0">
      <p role="status" className="text-sm font-medium tabular-nums">
        {summary}
      </p>
      {asking ? (
        <DiscardAsk
          busy={decisions.busy}
          onYes={decisions.discard}
          onNo={() => {
            setAsking(false);
          }}
        />
      ) : (
        <Choices
          busy={decisions.busy}
          confirming={decisions.confirming}
          count={selections.length}
          onConfirm={decisions.confirm}
          onDiscard={() => {
            setAsking(true);
          }}
        />
      )}
    </div>
  );
}

interface AskProps {
  busy: boolean;
  onYes: () => void;
  onNo: () => void;
}

function DiscardAsk({ busy, onYes, onNo }: Readonly<AskProps>) {
  return (
    <div role="alertdialog" aria-label={Copy.discardAsk} className="grid gap-2">
      <p className="text-sm">{Copy.discardAsk}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="destructive" disabled={busy} onClick={onYes}>
          {Copy.discardYes}
        </Button>
        <Button variant="outline" onClick={onNo}>
          {Copy.discardNo}
        </Button>
      </div>
    </div>
  );
}

interface ChoicesProps {
  busy: boolean;
  confirming: boolean;
  count: number;
  onConfirm: () => void;
  onDiscard: () => void;
}

function Choices({ busy, confirming, count, onConfirm, onDiscard }: Readonly<ChoicesProps>) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button disabled={busy || count === 0} onClick={onConfirm}>
        {confirming ? Copy.confirming : Copy.confirm(count)}
      </Button>
      <Button variant="outline" disabled={busy} onClick={onDiscard}>
        {Copy.discard}
      </Button>
    </div>
  );
}
