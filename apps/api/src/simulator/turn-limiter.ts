// Spec 10, "Simulador": a per-tenant cap on simulated turns, so the screen cannot run up the
// AI bill. ponytail: in-memory sliding window (one API process); move it to the database if
// the API ever runs on several instances.

export const SIMULATOR_TURNS_PER_HOUR = 30;
const HOUR_MS = 3_600_000;

export interface TurnLimiter {
  /** true and counted, or false when the tenant is over its limit. */
  take(tenantId: string): boolean;
}

export function createTurnLimiter(now: () => number = Date.now): TurnLimiter {
  const taken = new Map<string, number[]>();
  return {
    take(tenantId) {
      const since = now() - HOUR_MS;
      const recent = (taken.get(tenantId) ?? []).filter((at) => at > since);
      if (recent.length >= SIMULATOR_TURNS_PER_HOUR) {
        taken.set(tenantId, recent);
        return false;
      }
      taken.set(tenantId, [...recent, now()]);
      return true;
    },
  };
}
