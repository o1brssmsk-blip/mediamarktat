export type VisitorPresencePayload = {
  sessionId?: string | null;
  pathname?: string;
  online_at?: string;
  role?: string;
};

export const VISITOR_PRESENCE_HEARTBEAT_MS = 4_000;
export const VISITOR_PRESENCE_STALE_MS = 10_000;
export const VISITOR_PRESENCE_TICK_MS = 1_000;

export type ParsedVisitorPresence = {
  liveVisitorCount: number;
  onlineSessionIds: Set<string>;
  sessionPaths: Record<string, string>;
  sessionLastSeenAt: Record<string, number>;
};

/** Supabase Realtime presence state → admin UI snapshot */
export function parseVisitorPresenceState(
  state: Record<string, VisitorPresencePayload[]>,
): ParsedVisitorPresence {
  let liveVisitorCount = 0;
  const onlineSessionIds = new Set<string>();
  const sessionPaths: Record<string, string> = {};
  const sessionLastSeenAt: Record<string, number> = {};
  const now = Date.now();

  for (const presences of Object.values(state)) {
    if (!presences?.length) continue;

    const visitorPresences = presences.filter(
      (p) => p.role !== "admin" && !p.pathname?.startsWith("/admin"),
    );
    if (visitorPresences.length === 0) continue;

    liveVisitorCount += 1;

    for (const p of visitorPresences) {
      if (!p.sessionId) continue;
      onlineSessionIds.add(p.sessionId);
      if (p.pathname) sessionPaths[p.sessionId] = p.pathname;
      if (p.online_at) {
        const ts = Date.parse(p.online_at);
        sessionLastSeenAt[p.sessionId] = Number.isNaN(ts) ? now : ts;
      } else {
        sessionLastSeenAt[p.sessionId] = now;
      }
    }
  }

  return {
    liveVisitorCount,
    onlineSessionIds,
    sessionPaths,
    sessionLastSeenAt,
  };
}

export function isSessionLive(
  sessionId: string,
  onlineSessionIds: Set<string>,
  rowStatus?: string,
  lastSeenAt?: number,
): boolean {
  if (onlineSessionIds.has(sessionId)) return true;
  if (rowStatus === "online") {
    if (lastSeenAt && Date.now() - lastSeenAt < VISITOR_PRESENCE_STALE_MS) return true;
    if (!lastSeenAt) return true;
  }
  return false;
}
