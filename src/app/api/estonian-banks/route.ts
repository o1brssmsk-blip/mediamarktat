import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bank = searchParams.get("bank");

  if (!bank) {
    return NextResponse.json({ error: "Bank parameter is required" }, { status: 400 });
  }

  const banksDir = path.join(process.cwd(), "public", "estonian-banks", bank);
  
  if (!fs.existsSync(banksDir)) {
    return NextResponse.json({ files: [] });
  }

  try {
    if (bank === "seb-pank") {
      const incomingDir = path.join(banksDir, "incoming");
      if (fs.existsSync(incomingDir) && fs.statSync(incomingDir).isDirectory()) {
        const incomingFiles = fs
          .readdirSync(incomingDir)
          .filter(f => f.endsWith(".html"))
          .sort((a, b) => a.localeCompare(b))
          .map(f => `incoming/${f}`);

        if (incomingFiles.length > 0) {
          return NextResponse.json({ files: incomingFiles });
        }
      }
    }

    const files = fs
      .readdirSync(banksDir)
      .filter(f => f.endsWith(".html"))
      .sort((a, b) => a.localeCompare(b));

    return NextResponse.json({ files });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
