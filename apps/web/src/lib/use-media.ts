import { useSyncExternalStore } from 'react';

const CHANGE = 'change';
/** Tailwind's lg breakpoint: from here the panel uses the width (DESIGN.md, "Layout"). */
export const WIDE_QUERY = '(min-width: 1024px)';

/** Whether a media query matches, following changes (window resize, rotation). */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (listener) => {
      const media = matchMedia(query);
      media.addEventListener(CHANGE, listener);
      return () => {
        media.removeEventListener(CHANGE, listener);
      };
    },
    () => matchMedia(query).matches,
  );
}
