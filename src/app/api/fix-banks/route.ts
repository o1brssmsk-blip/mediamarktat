import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Missing Supabase environment variables." }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: banks } = await supabase.from("banks").select("*");
  
  if (banks) {
    for (const b of banks) {
      if (!b.country) {
        await supabase.from("banks").update({ country: "Hollanda" }).eq("slug", b.slug);
      }
    }
  }

  return NextResponse.json({ success: true, count: banks?.length });
}
