import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();
    if (!sessionId) {
      return NextResponse.json({ error: 'No sessionId provided' }, { status: 400 });
    }

    let ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown';
    if (ip && ip.includes(',')) {
      ip = ip.split(',')[0].trim();
    }

    const userAgent = request.headers.get('user-agent') || 'Unknown';

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // ignore
            }
          },
        },
      }
    );

    await supabase
      .from('sessions')
      .update({ ip_address: ip, user_agent: userAgent })
      .eq('id', sessionId);

    return NextResponse.json({ success: true, ip, userAgent });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to track IP' }, { status: 500 });
  }
}