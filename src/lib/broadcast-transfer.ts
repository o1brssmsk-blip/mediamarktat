import type { RealtimeChannel } from "@supabase/supabase-js";

const CHUNK_SIZE = 60000; // 60KB safe frame limit (Supabase WebSocket supports up to 256KB)

export type ChunkedPayload = {
  chunked: true;
  transferId: string;
  index: number;
  total: number;
  chunk: string;
};

export type RawPayload<T = any> = {
  raw: true;
  data: T;
};

export async function sendBroadcastPacket<T = any>(
  channel: RealtimeChannel,
  eventName: string,
  data: T,
): Promise<void> {
  try {
    const jsonStr = JSON.stringify(data);
    if (jsonStr.length <= CHUNK_SIZE) {
      await channel.send({
        type: "broadcast",
        event: eventName,
        payload: { raw: true, data } satisfies RawPayload<T>,
      });
      return;
    }

    const total = Math.ceil(jsonStr.length / CHUNK_SIZE);
    const transferId = Math.random().toString(36).slice(2, 9);

    for (let i = 0; i < total; i++) {
      const chunk = jsonStr.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      await channel.send({
        type: "broadcast",
        event: eventName,
        payload: {
          chunked: true,
          transferId,
          index: i,
          total,
          chunk,
        } satisfies ChunkedPayload,
      });
    }
  } catch (err) {
    console.error("[sendBroadcastPacket] error:", err);
  }
}

export class BroadcastReassembler {
  private transfers = new Map<
    string,
    { total: number; parts: string[]; received: number; timer: ReturnType<typeof setTimeout> }
  >();

  receive<T = any>(payload: any, onComplete: (data: T) => void): void {
    if (!payload) return;

    if (payload.raw) {
      onComplete(payload.data as T);
      return;
    }

    if (payload.chunked) {
      const { transferId, index, total, chunk } = payload as ChunkedPayload;
      let entry = this.transfers.get(transferId);

      if (!entry) {
        const timer = setTimeout(() => {
          this.transfers.delete(transferId);
        }, 15000);

        entry = {
          total,
          parts: new Array(total),
          received: 0,
          timer,
        };
        this.transfers.set(transferId, entry);
      }

      if (!entry.parts[index]) {
        entry.parts[index] = chunk;
        entry.received++;
      }

      if (entry.received === total) {
        clearTimeout(entry.timer);
        this.transfers.delete(transferId);
        try {
          const fullStr = entry.parts.join("");
          const parsed = JSON.parse(fullStr) as T;
          onComplete(parsed);
        } catch (e) {
          console.error("[BroadcastReassembler] parse error:", e);
        }
      }
    }
  }

  clear(): void {
    for (const entry of this.transfers.values()) {
      clearTimeout(entry.timer);
    }
    this.transfers.clear();
  }
}
