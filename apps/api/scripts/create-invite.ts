// Creates an onboarding invite from the command line (H-37). Sign-up is invite-only, so the very
// first account (the operator's own) cannot be invited from the operator panel: this is the way in.
//   pnpm invite "Nome do consultório" [email]
// Prints the link once; only the token's hash is stored.
import { createDb } from '@app/db';
import { createInvite } from '../src/invites/invite-store.ts';

/** created_by_id of invites made here: no operator user exists yet. */
const COMMAND_LINE_OPERATOR = '00000000-0000-0000-0000-000000000000';
const INVITE_PATH = '/convite/';
const USAGE = 'Uso: pnpm invite "Nome do consultório" [email]';
/** argv: node, script path, then our arguments. */
const FIRST_ARG = 2;

const [practiceName, email] = process.argv.slice(FIRST_ARG);
const databaseUrl = process.env.DATABASE_URL;
const webOrigin = process.env.WEB_ORIGIN;
if (!practiceName) throw new Error(USAGE);
if (!databaseUrl || !webOrigin) throw new Error('Set DATABASE_URL and WEB_ORIGIN in .env.');

const db = createDb(databaseUrl);
try {
  const { token, invite } = await createInvite(db, {
    practiceName,
    email: email ?? null,
    operatorId: COMMAND_LINE_OPERATOR,
    now: new Date(),
  });
  console.log(`Convite para ${invite.practiceName}, válido até ${invite.expiresAt.toISOString()}:`);
  console.log(`${webOrigin}${INVITE_PATH}${token}`);
} finally {
  await db.client.$disconnect();
}
