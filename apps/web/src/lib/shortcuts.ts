import { useEffect, useRef } from 'react';

// Keyboard shortcuts for the computer (Nielsen 7). One letter, no modifier, ignored while the
// person is typing, so they never get in the way of writing a message.

const KEYDOWN = 'keydown';
const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export const Shortcut = {
  help: '?',
  search: '/',
  newBooking: 'n',
  next: 'j',
  previous: 'k',
  takeOver: 'a',
} as const;
export type Shortcut = (typeof Shortcut)[keyof typeof Shortcut];

/** The search field a "/" focuses (Clientes). */
export const SEARCH_FIELD = 'search';
export const SHORTCUT_ATTR = 'data-shortcut';

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return TYPING_TAGS.has(target.tagName) || target.isContentEditable;
}

function isOpenDialog(): boolean {
  return document.querySelector('[role="dialog"],[role="alertdialog"]') !== null;
}

/** Runs `handler` when `key` is pressed outside a text field and outside an open dialog. */
export function useShortcut(key: Shortcut, handler: () => void, enabled = true) {
  const latest = useRef(handler);
  latest.current = handler;
  useEffect(() => {
    if (!enabled) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== key || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTyping(event.target) || isOpenDialog()) return;
      event.preventDefault();
      latest.current();
    };
    window.addEventListener(KEYDOWN, onKey);
    return () => {
      window.removeEventListener(KEYDOWN, onKey);
    };
  }, [key, enabled]);
}
