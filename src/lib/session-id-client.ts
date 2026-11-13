"use client";

import {
  ACTIVE_ROUTE_SESSION_COOKIE,
  ACTIVE_ROUTE_SESSION_STORAGE_KEY,
  ACTIVE_SESSION_COOKIE,
  ACTIVE_SESSION_STORAGE_KEY,
} from "@/lib/session-constants";

const ACTIVE_SESSION_MAX_AGE = 60 * 60 * 24;

export const ACTIVE_SESSION_EVENT = "active-session-changed";

export function getStoredActiveSessionId(): string | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const value = window.localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY)?.trim();
    return value || undefined;
  } catch {
    return undefined;
  }
}

export function getStoredActiveRouteSessionId(sessionId?: string): string | undefined {
  if (typeof window === "undefined") return undefined;

  const currentSessionId = getStoredActiveSessionId();
  if (sessionId && currentSessionId && currentSessionId !== sessionId) {
    return undefined;
  }

  try {
    const value = window.localStorage.getItem(ACTIVE_ROUTE_SESSION_STORAGE_KEY)?.trim();
    return value || undefined;
  } catch {
    return undefined;
  }
}

export function getPreferredRouteSessionId(sessionId: string, routeSessionId?: string) {
  return routeSessionId?.trim() || getStoredActiveRouteSessionId(sessionId) || sessionId;
}

export function persistActiveSession(sessionId: string, routeSessionId?: string) {
  if (typeof window === "undefined" || !sessionId) return;

  const preservedRouteSessionId =
    getStoredActiveSessionId() === sessionId ? getStoredActiveRouteSessionId(sessionId) : undefined;
  const nextRouteSessionId = routeSessionId?.trim() || preservedRouteSessionId || sessionId;

  try {
    window.localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, sessionId);
    window.localStorage.setItem(ACTIVE_ROUTE_SESSION_STORAGE_KEY, nextRouteSessionId);
  } catch {
    /* ignore */
  }

  document.cookie = `${ACTIVE_SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Path=/; Max-Age=${ACTIVE_SESSION_MAX_AGE}; SameSite=Lax`;
  document.cookie = `${ACTIVE_ROUTE_SESSION_COOKIE}=${encodeURIComponent(nextRouteSessionId)}; Path=/; Max-Age=${ACTIVE_SESSION_MAX_AGE}; SameSite=Lax`;

  try {
    window.dispatchEvent(
      new CustomEvent(ACTIVE_SESSION_EVENT, {
        detail: { sessionId, routeSessionId: nextRouteSessionId },
      }),
    );
  } catch {
    /* ignore */
  }
}
