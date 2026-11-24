import { createAuthClient } from 'better-auth/react';

/** Better Auth on the API (/api/auth), same origin through the Vite proxy in dev. */
export const authClient = createAuthClient({ basePath: '/api/auth' });
