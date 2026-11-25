import type { Db } from '@app/db';

/** Same value as the API's `Role.owner`; the worker does not import API code. */
const OWNER_ROLE = 'owner';

/** The tenant owner's address, or null when nobody owns it (never an error: the sweep goes on). */
export async function ownerEmail(db: Db, tenantId: string): Promise<string | null> {
  const owner = await db.withTenant(tenantId, (tx) =>
    tx.membership.findFirst({
      where: { tenantId, role: OWNER_ROLE },
      orderBy: { createdAt: 'asc' },
      select: { userId: true },
    }),
  );
  if (!owner) return null;
  const user = await db.client.user.findUnique({
    where: { id: owner.userId },
    select: { email: true },
  });
  return user?.email ?? null;
}
