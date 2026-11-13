const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

if (!urlMatch || !keyMatch) {
  console.log("Missing env vars");
  process.exit(1);
}

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const AT_BANKS = [
  { slug: "erste-bank", name: "Erste Bank", brandColor: "#003b7a", accentColor: "#e3000f", logo: "ER", domain: "sparkasse.at", logoFile: "/app-icons/erste-bank.png" },
  { slug: "raiffeisen", name: "Raiffeisen", brandColor: "#ffe500", accentColor: "#1f1f1f", logo: "RB", domain: "raiffeisen.at", logoFile: "/app-icons/raiffeisen.png" },
  { slug: "bank-austria", name: "Bank Austria", brandColor: "#d50032", accentColor: "#7a0026", logo: "BA", domain: "bankaustria.at", logoFile: "/app-icons/bank-austria.png" },
  { slug: "bawag", name: "BAWAG", brandColor: "#ffec00", accentColor: "#222222", logo: "BW", domain: "bawag.at", logoFile: "/app-icons/bawag.png" },
  { slug: "easybank", name: "easybank", brandColor: "#00a0df", accentColor: "#006388", logo: "easy", domain: "easybank.at", logoFile: "/app-icons/easybank.png" },
  { slug: "bank99", name: "bank99", brandColor: "#ffde00", accentColor: "#222222", logo: "99", domain: "bank99.at", logoFile: "/app-icons/bank99.png" },
  { slug: "volksbank", name: "Volksbank", brandColor: "#006b3f", accentColor: "#004b2c", logo: "VB", domain: "volksbank.at", logoFile: "/app-icons/volksbank.png" },
  { slug: "oberbank", name: "Oberbank", brandColor: "#d71920", accentColor: "#7a1015", logo: "OB", domain: "oberbank.at", logoFile: "/app-icons/oberbank.png" },
  { slug: "hypo-noe", name: "HYPO NOE", brandColor: "#006e8a", accentColor: "#004d62", logo: "HNOE", domain: "hyponoe.at", logoFile: "/app-icons/hypo-noe.png" },
  { slug: "hypo-tirol", name: "HYPO Tirol", brandColor: "#1d4f91", accentColor: "#11305c", logo: "HT", domain: "hypotirol.com", logoFile: "/app-icons/hypo-tirol.png" },
  { slug: "hypo-vorarlberg", name: "HYPO Vorarlberg", brandColor: "#1f7a3d", accentColor: "#145327", logo: "HV", domain: "hypovbg.at", logoFile: "/app-icons/hypo-vorarlberg.png" },
  { slug: "hypo-ooe", name: "HYPO OÖ", brandColor: "#1f7a3d", accentColor: "#145327", logo: "HYP", domain: "hypo.at", logoFile: "/app-icons/hypo-ooe.png" },
  { slug: "hypo-burgenland", name: "HYPO Burgenland", brandColor: "#a3322b", accentColor: "#64201b", logo: "HB", domain: "bank-bgld.at", logoFile: "/app-icons/hypo-burgenland.png" },
  { slug: "bks-bank", name: "BKS Bank", brandColor: "#365f8f", accentColor: "#203a58", logo: "BKS", domain: "bks.at", logoFile: "/app-icons/bks-bank.png" },
  { slug: "btv", name: "BTV", brandColor: "#d61f26", accentColor: "#7d1115", logo: "BTV", domain: "btv.at", logoFile: "/app-icons/btv.png" },
  { slug: "vkb", name: "VKB", brandColor: "#5b7f50", accentColor: "#3b5334", logo: "VK", domain: "vkb-bank.at", logoFile: "/app-icons/vkb.png" },
  { slug: "sparda-bank", name: "Sparda Bank", brandColor: "#2d9fa6", accentColor: "#1d676c", logo: "SP", domain: "sparda.at", logoFile: "/app-icons/sparda-bank.png" },
  { slug: "anadi-bank", name: "Anadi Bank", brandColor: "#355a8a", accentColor: "#1e3350", logo: "AA", domain: "anadibank.com", logoFile: "/app-icons/anadi-bank.png" },
  { slug: "schoellerbank", name: "Schoellerbank", brandColor: "#1c2e5b", accentColor: "#101a34", logo: "SB", domain: "schoellerbank.at", logoFile: "/app-icons/schoellerbank.png" },
  { slug: "spaengler", name: "Bankhaus Spängler", brandColor: "#5b4b3b", accentColor: "#3b2f23", logo: "SC", domain: "spaengler.at", logoFile: "/app-icons/spaengler.png" },
  { slug: "aerztebank", name: "Ärztebank", brandColor: "#2f6f95", accentColor: "#1f4861", logo: "AÄ", domain: "apothekerbank.at", logoFile: "/app-icons/aerztebank.png" },
  { slug: "schelhammer", name: "Schelhammer Capital", brandColor: "#35507b", accentColor: "#22344f", logo: "SC", domain: "schelhammer.at", logoFile: "/app-icons/schelhammer.png" },
  { slug: "marchfelder", name: "Marchfelder Bank", brandColor: "#3d7044", accentColor: "#294c2f", logo: "MB", domain: "marchfelderbank.at", logoFile: "/app-icons/marchfelder.png" },
  { slug: "dolomitenbank", name: "Dolomitenbank", brandColor: "#006b8f", accentColor: "#004861", logo: "DB", domain: "dolomitenbank.at", logoFile: "/app-icons/dolomitenbank.png" },
  { slug: "posojilnica", name: "Posojilnica Bank", brandColor: "#6f2c6b", accentColor: "#4a1d47", logo: "PB", domain: "posojilnica-bank.at", logoFile: "/app-icons/posojilnica.png" },
];

async function run() {
  for (const bank of AT_BANKS) {
    const payload = {
      slug: bank.slug,
      name: bank.name,
      brand_color: bank.brandColor,
      accent_color: bank.accentColor,
      domain: bank.domain,
      logo_file: bank.logoFile,
      country: "Avusturya",
      is_active: true,
      design_config: {
        layout: "centered",
        blocks: [],
        background: { type: "color", value: "#ffffff" },
        header: { show: false, backgroundColor: "", height: "", logoAlignment: "left", padding: "" },
        formBox: { backgroundColor: "", textColor: "", borderRadius: "", boxShadow: "none", padding: "", width: "", alignment: "center" },
        button: { backgroundColor: "", hoverColor: "", textColor: "", borderRadius: "", padding: "", fontWeight: "" },
        typography: { fontFamily: "", headerColor: "", bodyColor: "", linkColor: "" },
        texts: { title: "", subtitle: "", footerLinks: [] }
      }
    };
    
    const { data: existing } = await supabase.from("banks").select("id").eq("slug", bank.slug).maybeSingle();
    if (!existing) {
      console.log(`Inserting ${bank.name}...`);
      const { error } = await supabase.from("banks").insert(payload);
      if (error) console.error("Insert error for", bank.name, error);
    } else {
      console.log(`Updating ${bank.name}...`);
      const { error } = await supabase.from("banks").update(payload).eq("slug", bank.slug);
      if (error) console.error("Update error for", bank.name, error);
    }
  }
  console.log("Done!");
}

run().catch(console.error);