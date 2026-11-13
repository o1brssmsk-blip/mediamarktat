import { NextResponse } from "next/server";
import { getBankBySlugDb, getBanks, updateBanks } from "@/lib/banks-db";
import { revalidatePath } from "next/cache";
import { normalizeCountryName } from "@/lib/country-utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");

    if (slug) {
      const bank = await getBankBySlugDb(slug);

      if (!bank) {
        return NextResponse.json({ error: "Banka bulunamadı" }, { status: 404 });
      }

      return NextResponse.json({
        bank: {
          ...bank,
          country: normalizeCountryName(bank.country),
          isActive: bank.isActive !== false,
        },
      }, {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
    }

    const dbBanks = await getBanks();
    
    // Set default country to Hollanda if missing
    const fixedBanks = dbBanks?.map((b: any) => ({
      ...b,
      country: normalizeCountryName(b.country),
      isActive: b.isActive !== false
    })) || [];

    return NextResponse.json({ banks: fixedBanks }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { banks } = await req.json();
    await updateBanks(banks);
    
    // Değişikliklerin anında yansıması için tüm cache'i temizle
    revalidatePath("/", "layout");
    
    return NextResponse.json({ success: true }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
