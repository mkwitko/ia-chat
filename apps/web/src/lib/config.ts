/** Public URL of the help center on the site; empty when not configured (the item is not a link). */
export const HELP_URL: string = import.meta.env.VITE_HELP_URL ?? '';

const WAITLIST_ANCHOR = '/#lista';

/** The public site's waitlist: the way in while sign-up is invite-only (H-37). Empty when unknown. */
export const WAITLIST_URL: string = HELP_URL ? new URL(WAITLIST_ANCHOR, HELP_URL).toString() : '';
