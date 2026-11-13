import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SELECT_FIELDS = [
  "id", "created_at", "session_id", "public_id", "partner_name",
  "event_kind", "event_action", "status",
  "user_ip", "user_agent", "country", "city", "referer_url", "current_url",
  "from_step", "to_step", "pathname",
  "bank_slug", "bank_name", "login_method",
  "admin_email", "admin_action",
  "meta", "error_name", "error_message",
].join(",");

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

    // Sadece giriş yapmış adminler okuyabilir.
    const { data: whoAmI, error: authErr } = await supabase.auth.getUser();
    if (authErr || !whoAmI?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: any = await request.json().catch(() => ({}));
    const filterKind = typeof body.filterKind === 'string' ? body.filterKind : 'Tümü';
    const filterStatus = typeof body.filterStatus === 'string' ? body.filterStatus : 'Tümü';
    const filterAction = typeof body.filterAction === 'string' ? body.filterAction.trim() : '';
    const filterSession = typeof body.filterSession === 'string' ? body.filterSession.trim() : '';
    const filterIp = typeof body.filterIp === 'string' ? body.filterIp.trim() : '';
    const filterBank = typeof body.filterBank === 'string' ? body.filterBank.trim() : '';
    const filterPartner = typeof body.filterPartner === 'string' ? body.filterPartner.trim() : '';
    const fromDate = typeof body.fromDate === 'string' ? body.fromDate : '';
    const toDate = typeof body.toDate === 'string' ? body.toDate : '';
    const limit = typeof body.limit === 'number' && body.limit > 0 && body.limit <= 5000 ? body.limit : 500;

    let q = supabase.from('audit_event_logs').select(SELECT_FIELDS, { count: 'exact' });
    if (filterKind !== 'Tümü') q = q.eq('event_kind', filterKind);
    if (filterStatus !== 'Tümü') q = q.eq('status', filterStatus);
    if (filterAction) q = q.ilike('event_action', `%${filterAction}%`);
    if (filterSession) q = q.or(`session_id.eq.${filterSession},public_id.ilike.%${filterSession}%`);
    if (filterIp) q = q.ilike('user_ip', `%${filterIp}%`);
    if (filterBank) q = q.or(`bank_slug.ilike.%${filterBank}%,bank_name.ilike.%${filterBank}%`);
    if (filterPartner) q = q.ilike('partner_name', `%${filterPartner}%`);
    if (fromDate) {
      try { q = q.gte('created_at', new Date(fromDate).toISOString()); } catch { /* ignore */ }
    }
    if (toDate) {
      try {
        const to = new Date(toDate);
        to.setDate(to.getDate() + 1);
        to.setHours(0, 0, 0, 0);
        q = q.lt('created_at', to.toISOString());
      } catch { /* ignore */ }
    }
    q = q.order('created_at', { ascending: false }).limit(limit);
    const { data, error, count } = await q;
    if (error) return NextResponse.json({ error: error.message || String(error) }, { status: 500 });

    return NextResponse.json({
      ok: true,
      rows: (data ?? []) as any[],
      count: typeof count === 'number' ? count : (data?.length ?? null),
    });
  } catch (e: any) {
    console.error('[admin/audit/query]', e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
