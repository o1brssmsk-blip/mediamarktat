import { cookies } from "next/headers";
import {
  ACTIVE_ROUTE_SESSION_COOKIE,
  ACTIVE_SESSION_COOKIE,
} from "@/lib/session-constants";
import {
  isNumericSessionIdentifier,
  isUuidSessionIdentifier,
  normalizeSessionIdentifier,
} from "@/lib/session-identifiers";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function resolveSessionIdentifier(identifier?: string | null) {
  const normalized = normalizeSessionIdentifier(identifier);
  if (!normalized) {
    return {
      sessionId: "",
      routeSessionId: "",
    };
  }

  if (isUuidSessionIdentifier(normalized)) {
    return {
      sessionId: normalized,
      routeSessionId: normalized,
    };
  }

  if (isNumericSessionIdentifier(normalized)) {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data } = await supabase
        .from("sessions")
        .select("id, public_id")
        .eq("public_id", Number(normalized))
        .maybeSingle();

      if (data?.id) {
        return {
          sessionId: data.id,
          routeSessionId: String(data.public_id ?? normalized),
        };
      }
    }
  }

  return {
    sessionId: normalized,
    routeSessionId: normalized,
  };
}

export async function resolveServerSessionIdentity(options?: {
  searchParams?: { session?: string | null };
  routeSessionId?: string | null;
}) {
  const fromRoute = await resolveSessionIdentifier(options?.routeSessionId);
  if (fromRoute.sessionId) {
    return fromRoute;
  }

  const fromQuery = await resolveSessionIdentifier(options?.searchParams?.session);
  if (fromQuery.sessionId) {
    return fromQuery;
  }

  const cookieStore = await cookies();
  const cookieSessionId = normalizeSessionIdentifier(
    cookieStore.get(ACTIVE_SESSION_COOKIE)?.value,
  );
  const cookieRouteSessionId = normalizeSessionIdentifier(
    cookieStore.get(ACTIVE_ROUTE_SESSION_COOKIE)?.value,
  );

  return {
    sessionId: cookieSessionId,
    routeSessionId: cookieRouteSessionId || cookieSessionId,
  };
}

export async function resolveServerSessionId(searchParams?: { session?: string | null }) {
  const { sessionId } = await resolveServerSessionIdentity({ searchParams });
  return sessionId;
}
