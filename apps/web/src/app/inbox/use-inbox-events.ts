import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { LIST_KEY } from './inbox-api';

const EVENTS_URL = '/api/events';
const EVENT_NAME = 'inbox';
const CONVERSATION_KEY = 'conversation';

/**
 * Live updates (spec 10, "Tempo real"): each event only says which conversation changed, and
 * the screens refetch it. EventSource reconnects by itself; `connected` drives the quiet notice.
 */
export function useInboxEvents(): { connected: boolean } {
  const client = useQueryClient();
  const [connected, setConnected] = useState(true);
  useEffect(() => {
    const source = new EventSource(EVENTS_URL);
    source.onopen = () => {
      setConnected(true);
    };
    source.onerror = () => {
      setConnected(false);
    };
    source.addEventListener(EVENT_NAME, (event: MessageEvent<string>) => {
      const { conversationId } = JSON.parse(event.data) as { conversationId?: string };
      void client.invalidateQueries({ queryKey: LIST_KEY });
      if (conversationId)
        void client.invalidateQueries({ queryKey: [CONVERSATION_KEY, conversationId] });
    });
    return () => {
      source.close();
    };
  }, [client]);
  return { connected };
}
