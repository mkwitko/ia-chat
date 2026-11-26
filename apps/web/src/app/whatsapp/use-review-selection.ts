import { useState } from 'react';
import type { ReviewSelection } from './review-api';
import type { RowState } from './review-row';

const NOT_SELECTED: RowState = { client: false, messages: false };

/** What the owner ticked: who becomes a client, and for whom the messages come too. Nothing starts ticked. */
export function useReviewSelection() {
  const [chosen, setChosen] = useState<ReadonlyMap<string, RowState>>(new Map());
  const stateOf = (id: string): RowState => chosen.get(id) ?? NOT_SELECTED;
  const change = (id: string, next: (current: RowState) => RowState) => {
    setChosen((previous) => new Map(previous).set(id, next(previous.get(id) ?? NOT_SELECTED)));
  };
  const selections = (): ReviewSelection[] =>
    [...chosen].flatMap(([id, state]) => (state.client ? [{ id, messages: state.messages }] : []));
  return {
    stateOf,
    toggleClient: (id: string) => {
      change(id, (current) => ({ client: !current.client, messages: false }));
    },
    toggleMessages: (id: string) => {
      change(id, (current) => ({ ...current, messages: !current.messages }));
    },
    selectAll: (ids: readonly string[]) => {
      setChosen((previous) => {
        const next = new Map(previous);
        for (const id of ids) next.set(id, { ...(previous.get(id) ?? NOT_SELECTED), client: true });
        return next;
      });
    },
    clear: () => {
      setChosen(new Map());
    },
    selections,
  };
}
