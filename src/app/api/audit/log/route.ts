import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notifyAuditEventsToTelegram, type ServerAuditRow } from '@/lib/telegram-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Gerekli izin: SUPABASE_SERVICE_ROLE_KEY tanımlı olmalı ki anon tarayıcı INSERT'inde
// RLS'den bağımsız olarak garanti şekilde yazalım.
export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const arr: unknown[] = Array.isArray(raw) ? raw : [raw];
    if (arr.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0 }, { status: 200 });
    }
    if (arr.length > 200) {
      return NextResponse.json({ error: 'batch too large (> 200)' }, { status: 413 });
    }

    let ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null;
    if (ip && ip.includes(',')) ip = ip.split(',')[0].trim();
    const userAgent = request.headers.get('user-agent') || null;
    const country = request.headers.get('cf-ipcountry') || null;
    const city = request.headers.get('cf-ipcity') || null;
    const referer = request.headers.get('referer') || null;

    const cookieStore = await cookies();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cs: any[]) {
          try { cs.forEach(({ name, value, options }: any) => cookieStore.set(name, value, options)); } catch { /* ignore */ }
        },
      },
    });

    const normalizeRow = (row: any) => {
      if (!row || typeof row !== 'object') return null;
      const src: Record<string, any> = { ...row };

      // 1) Postgres audit_event_logs tablosu expected kolon isimleri (HER İKİ ŞEMA)
      //    Standard (API route): event_type, severity, message, payload, metadata
      //    Legacy  (migration A): event_kind, event_action, status, from_step, to_step,
      //                            pathname, user_ip, user_agent, country, city, referer_url,
      //                            current_url, bank_name, login_method, admin_email,
      //                            admin_action, meta, error_name, error_message
      // Gelen payload 3 farkli sekilde geliyor olabilir:
      //   A) Standard AuditEventPayload:   event_kind + event_action  (logAuditEvent ile gonderilen)
      //   B) Wheel payload:                event = 'wheel_spin'/'wheel_win'  (logWheelEvent'ten gelirse)
      //   C) Diger / custom:               her turlu karisik

      const incomingEventAction = String(
        src.event_action ??
        src.event ??
        src.action ??
        src.type ??
        'generic',
      );

      const incomingEventKind = String(
        src.event_kind ??
        src.category ??
        (String(src.event || '').startsWith('wheel_') ? 'wheel' : 'custom'),
      );

      // severity: src.status / severity -> Postgres severity
      const incomingStatus = String(src.status ?? src.severity ?? 'info').toLowerCase();
      const severity = ['info','warn','warning','error','critical','debug'].includes(incomingStatus)
        ? (incomingStatus === 'warning' ? 'warn' : incomingStatus === 'critical' ? 'error' : incomingStatus)
        : 'info';
      // status (legacy schema A)
      const status = severity === 'warn' ? 'warn' : severity === 'error' ? 'error' : 'ok';

      // Postgres event_type = event_kind (hatali yoksa 'info')
      const event_type = incomingEventKind && incomingEventKind.length > 0 ? incomingEventKind.slice(0, 255) : 'info';
      const event_kind = event_type;
      const event_action = incomingEventAction.slice(0, 255) || 'generic';

      // Postgres message (NOT NULL)
      const rawMessage = String(src.message ?? (incomingEventAction || event_type || 'audit'));
      const message = rawMessage.length > 0 ? rawMessage.slice(0, 2000) : 'audit';

      // session_id / session_uuid / public_id (BOTH şema)
      let session_id: string | null = src.session_id ?? src.public_id ?? null;
      if (session_id !== null) session_id = String(session_id).slice(0, 255);
      let session_uuid: string | null = src.session_uuid ?? null;
      if (session_uuid !== null) session_uuid = String(session_uuid).slice(0, 255);
      const public_id: string | null = (src.public_id ?? src.session_id ?? null) !== null
        ? String(src.public_id ?? src.session_id ?? '').slice(0, 255)
        : null;

      // actor (admin_email ya da bank_slug ya da '-' )
      const actorRaw = src.admin_email ?? src.actor ?? src.bank_slug ?? null;
      const actor = actorRaw !== null ? String(actorRaw).slice(0, 255) : null;
      const admin_email = src.admin_email ?? (actor && /@/.test(actor) ? actor : null) ?? null;
      const admin_action = src.admin_action ?? null;

      // bank_slug / bank_name / login_method / partner_name
      let bank_slug: string | null = src.bank_slug ?? null;
      if (bank_slug !== null) bank_slug = String(bank_slug).slice(0, 255);
      const bank_name = src.bank_name ?? null;
      const login_method = src.login_method ?? null;
      const partner_name = src.partner_name ?? null;

      // Navigation fields (legacy schema A)
      const from_step = src.from_step ?? null;
      const to_step = src.to_step ?? null;
      const pathname = src.pathname ?? src.path ?? null;
      const current_url = src.current_url ?? src.url ?? null;

      // payload JSONB -> Standard AuditEventPayload formatini sakla (orijinal kaybi olmasin)
      const payloadObj: Record<string, any> = {};
      for (const k of Object.keys(src)) {
        if (k === 'payload' || k === 'metadata' || k === 'meta') continue;
        payloadObj[k] = src[k];
      }
      const payload = src.payload && typeof src.payload === 'object'
        ? src.payload
        : Object.keys(payloadObj).length > 0
          ? payloadObj
          : {};

      // metadata JSONB + meta JSONB (BOTH şema)
      const metadataRaw: Record<string, any> = {};
      if (src.meta && typeof src.meta === 'object') Object.assign(metadataRaw, src.meta);
      if (src.metadata && typeof src.metadata === 'object') Object.assign(metadataRaw, src.metadata);
      // Wheel icin ozellikle selectionIndex, prize, amount, rotationIndex, targetPrize, popup_open/close
      const wheelFields = ['selectionIndex','rotationIndex','targetPrize','prize','amount','popupName','from_step','to_step','pathname','bank_name','login_method','partner_name','error_name','error_message','public_id'];
      for (const k of wheelFields) {
        if (src[k] !== undefined && metadataRaw[k] === undefined) metadataRaw[k] = src[k];
      }

      // Kullanıcı/IP bilgileri: Hem metadata/meta içine, HEM DE AYRICA KOLONLAR olarak kaydet (BOTH şema)
      let user_ip: string | null = src.user_ip ?? null;
      let user_agent: string | null = src.user_agent ?? null;
      let country: string | null = src.country ?? null;
      let city: string | null = src.city ?? null;
      const referer_url: string | null = src.referer_url ?? null;

      // meta (legacy) JSONB objesi = metadata + meta raw
      const metaLegacy: Record<string, any> = { ...(src.meta && typeof src.meta === 'object' ? src.meta : {}) };
      if (src.metadata && typeof src.metadata === 'object') Object.assign(metaLegacy, src.metadata);
      if (Object.keys(metadataRaw).length > 0) Object.assign(metaLegacy, metadataRaw);

      // Hata alanları (legacy schema A)
      const error_name = src.error_name ?? null;
      const error_message = src.error_message ?? (src.error && typeof src.error === 'object' ? (src.error as any).message ?? null : null) ?? null;

      const metadataFinal: Record<string, any> = Object.keys(metadataRaw).length > 0 ? metadataRaw : {};

      // === OUTPUT: BOTH ŞEMA KOLOMLARI ===
      // Standard (şema B): event_type, severity, session_id, session_uuid, bank_slug, actor, message, payload, metadata
      // Legacy   (şema A): public_id, partner_name, event_kind, event_action, status, user_ip, user_agent,
      //                    country, city, referer_url, current_url, from_step, to_step, pathname, bank_name,
      //                    login_method, admin_email, admin_action, meta, error_name, error_message
      const out: Record<string, any> = {
        // Standard şema B
        event_type,
        severity,
        session_id,
        session_uuid,
        bank_slug,
        actor,
        message,
        payload,
        metadata: metadataFinal,
        // Legacy şema A
        public_id,
        partner_name,
        event_kind,
        event_action,
        status,
        user_ip,
        user_agent,
        country,
        city,
        referer_url,
        current_url,
        from_step,
        to_step,
        pathname,
        bank_name,
        login_method,
        admin_email,
        admin_action,
        meta: Object.keys(metaLegacy).length > 0 ? metaLegacy : {},
        error_name,
        error_message,
      };

      // Sunucu tarafından doğrulanan / overwrite edilen alanlar:
      // (Request IP/user-agent/client country/city/referer)
      if (ip && (!out.user_ip || String(out.user_ip || '').length < 5)) {
        out.user_ip = ip;
        metaLegacy.user_ip = ip;
        metadataFinal.user_ip = ip;
      }
      if (userAgent && (!out.user_agent || String(out.user_agent || '').length < 5)) {
        out.user_agent = userAgent;
        metaLegacy.user_agent = userAgent;
        metadataFinal.user_agent = userAgent;
      }
      if (country && !out.country) {
        out.country = country;
        metaLegacy.country = country;
        metadataFinal.country = country;
      }
      if (city && !out.city) {
        out.city = city;
        metaLegacy.city = city;
        metadataFinal.city = city;
      }
      if (referer && !out.referer_url) {
        out.referer_url = referer;
        metaLegacy.referer_url = referer;
        metadataFinal.referer_url = referer;
      }

      if (Object.keys(metadataFinal).length > 0) out.metadata = metadataFinal;
      if (Object.keys(metaLegacy).length > 0) out.meta = metaLegacy;

      // Uzunluk sinirlari (yedek)
      if (typeof out.event_type === 'string' && out.event_type.length > 255) out.event_type = out.event_type.slice(0,255);
      if (typeof out.event_kind === 'string' && out.event_kind.length > 255) out.event_kind = out.event_kind.slice(0,255);
      if (typeof out.event_action === 'string' && out.event_action.length > 255) out.event_action = out.event_action.slice(0,255);
      if (typeof out.message === 'string' && out.message.length > 5000) out.message = out.message.slice(0,5000);
      if (typeof out.severity === 'string' && out.severity.length > 63) out.severity = out.severity.slice(0,63);
      if (typeof out.status === 'string' && out.status.length > 63) out.status = out.status.slice(0,63);
      if (typeof out.actor === 'string' && out.actor.length > 255) out.actor = out.actor.slice(0,255);
      if (typeof out.admin_email === 'string' && out.admin_email.length > 255) out.admin_email = out.admin_email.slice(0,255);

      // meta old. fieldi normalizeRow'un disinda kullaniliyordu -> eski uyumluluk icin kaydet, ama Postgres kolonu degil
      (out as any)._meta_backward = src.meta ?? null;

      if (!out.created_at) delete out.created_at;
      return out;
    };

    const rows = arr.map(normalizeRow).filter(Boolean);
    if (rows.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0 }, { status: 200 });
    }

    // 2-STAGE INSERT FALLBACK (şema A ↔ B uyumluluğu)
    // HATA YUTMA STRATEJISI: 500 yerine 207 partial veya 200 OK don. Kullanıcı konsolunda 500 spam'ı BITER.
    let okCount = 0;
    let firstErr: any = null;
    const insertedRows: any[] = [];
    const tryInsertRow = async (r: any): Promise<boolean> => {
      try {
        // TRY 1: BOTH şema kolonları ile full insert (hepsini gönder)
        let { error } = await supabase.from('audit_event_logs').insert(r);
        if (error) {
          const msg = String(error.message || '');
          // Eğer "column X does not exist" ise - kolon eksik demek; sadece bilinen güvenli kolonları ile tekrar dene
          if (/column/i.test(msg) && /does not exist|not found/i.test(msg)) {
            const safe: Record<string, any> = {};
            // Guaranteed to exist on BOTH schemas: id(auto), created_at(auto) + minimal BOTH kolonlar
            const safeCols = [
              'event_type', 'event_kind', 'severity', 'status',
              'message', 'session_id', 'public_id', 'partner_name',
              'payload', 'metadata', 'meta', 'bank_slug', 'actor',
              'error_name', 'error_message',
            ];
            for (const k of safeCols) if (r[k] !== undefined) safe[k] = r[k];
            // session_uuid UUID olabilir; eğer kolon UUID ise hata verir - sil
            if (/session_uuid/i.test(msg)) delete safe.session_uuid;
            // login_method / referer_url / country / city / user_ip/user_agent eksikse sil
            const optionalTextCols = ['from_step','to_step','pathname','current_url','bank_name','login_method','admin_email','admin_action','user_ip','user_agent','country','city','referer_url'];
            for (const k of optionalTextCols) if (r[k] !== undefined) safe[k] = r[k];
            const r2 = await supabase.from('audit_event_logs').insert(safe as any);
            if (r2.error && /column/i.test(String(r2.error.message || '')) && /does not exist|not found/i.test(String(r2.error.message || ''))) {
              // TRY 3: en asiri minimal - sadece zorunlu kolonlar (event_type, severity, message, payload JSONB)
              const ultraMin: any = {
                event_type: r.event_type || r.event_kind || 'info',
                severity: r.severity || 'info',
                message: r.message || 'audit',
                payload: r.payload || r.meta || {},
              };
              const r3 = await supabase.from('audit_event_logs').insert(ultraMin);
              if (!r3.error) return true;
              if (!firstErr) firstErr = r3.error;
              return false;
            } else if (r2.error) {
              if (!firstErr) firstErr = r2.error;
              return false;
            }
            return true;
          } else {
            if (!firstErr) firstErr = error;
            return false;
          }
        }
        return true;
      } catch (e) {
        if (!firstErr) firstErr = e;
        return false;
      }
    };

    // Toplu insert dene (hızlı), başarısız olursa tek tek (esnek)
    try {
      const { error: batchErr } = await supabase.from('audit_event_logs').insert(rows as any[]);
      if (!batchErr) {
        // --- TELEGRAM: başarılı batch (arka planda, bekle — response yavaşlamasın ---
        void notifyAuditEventsToTelegram(rows as ServerAuditRow[]).catch(() => void 0);
        return NextResponse.json({ ok: true, inserted: rows.length, from_server: { ip, country, city } }, { status: 200 });
      }
      firstErr = batchErr;
    } catch (e: any) {
      firstErr = e;
    }

    // Tek tek ekle (fallback)
    for (const r of rows) {
      const ok = await tryInsertRow(r);
      if (ok) { okCount++; insertedRows.push(r); }
    }

    // --- TELEGRAM: başarılı olanları da gönder (arka planda, bekle) ---
    if (insertedRows.length > 0) {
      void notifyAuditEventsToTelegram(insertedRows as ServerAuditRow[]).catch(() => void 0);
    }

    // 500 DÖNME! Her koşulda 200 veya 207 (partial) - kullanıcı tarafında 500 console error spam'ı ölür
    if (okCount === 0) {
      // Sunucu tarafında logla ama client'a 202 Accepted dön (audit log önemsiz, kullanıcı akışını BOZMA)
      console.warn('[audit/log] 0 rows inserted, swallowing error:', firstErr?.message || firstErr);
      return NextResponse.json({ ok: true, inserted: 0, swallowed: true, firstError: firstErr?.message || null }, { status: 202 });
    }
    return NextResponse.json({ ok: true, inserted: okCount, partial: true, firstError: firstErr?.message || null }, { status: 207 });
  } catch (error: any) {
    console.warn('[audit/log] fatal swallowed', error?.message || error);
    // 500 YOK - her zaman 202
    return NextResponse.json({ ok: true, inserted: 0, swallowed: true, fatal: error?.message || 'Unexpected' }, { status: 202 });
  }
}
