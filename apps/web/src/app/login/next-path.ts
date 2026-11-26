const NEXT_PARAM = 'next';
const SAME_ORIGIN_PATH = /^\/(?![/\\])/;

/** `?next=` as a path inside the panel, or null: never an address on another site. */
export function nextPath(search: string): string | null {
  const next = new URLSearchParams(search).get(NEXT_PARAM);
  return next && SAME_ORIGIN_PATH.test(next) ? next : null;
}

export const loginPathWithNext = (login: string, next: string) =>
  `${login}?${new URLSearchParams({ [NEXT_PARAM]: next }).toString()}`;
