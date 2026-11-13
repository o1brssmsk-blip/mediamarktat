import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAllAuBankSeedEntries } from "@/lib/au-bank-page-map";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase connection failed" }, { status: 500 });
  }

  const auBanks = getAllAuBankSeedEntries().map((e) => ({
    ...e,
    country: "Avustralya",
  }));

  const { error } = await supabase.from("banks").upsert(auBanks, { onConflict: "slug" });

  if (error) {
    console.error("Supabase upsert error (Australian banks):", error);
    return NextResponse.json({ error: error.message, details: error }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: "Australian (Avustralya) banks seeded successfully",
    count: auBanks.length,
    banks: auBanks.map((b) => ({ slug: b.slug, name: b.name, pages: b.slug === "bendigo-bank" ? 2 : b.slug === "suncorp-bank" ? 3 : 1 })),
  });
}
