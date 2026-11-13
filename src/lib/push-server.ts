import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// VAPID public key istemci tarafa da acik olabilir (tanim geregi public).
export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BJbDOEdrqlGB05nxWOuc-7AM72XU1ePZwaLBa78dEVxupeKqsL_pvsbeH1CJUTyTa0xwwchdK6SxEOaGLrgut7k";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let vapidReady = false;
function ensureVapid() {
  if (vapidReady) return true;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!priv) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@localhost",
    VAPID_PUBLIC_KEY,
    priv,
  );
  vapidReady = true;
  return true;
}

export type PushPayload = {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
};

// Kayitli tum admin cihazlarina push gonder. Sessiz fail (bildirim hic kritik degil).
export async function sendPushToAll(payload: PushPayload): Promise<number> {
  try {
    if (!ensureVapid()) return 0;
    const sb = getServiceClient();
    if (!sb) return 0;
    const { data: subs } = await sb
      .from("push_subscriptions")
      .select("endpoint, keys");
    if (!subs?.length) return 0;

    let sent = 0;
    const stale: string[] = [];
    await Promise.all(
      subs.map(async (row: any) => {
        try {
          await webpush.sendNotification(
            { endpoint: row.endpoint, keys: row.keys },
            JSON.stringify(payload),
            { TTL: 3600 },
          );
          sent += 1;
        } catch (e: any) {
          if (e?.statusCode === 404 || e?.statusCode === 410) stale.push(row.endpoint);
        }
      }),
    );
    if (stale.length) {
      await sb.from("push_subscriptions").delete().in("endpoint", stale);
    }
    return sent;
  } catch {
    return 0;
  }
}
