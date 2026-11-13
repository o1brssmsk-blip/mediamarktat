const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

const env = fs.readFileSync(".env.local", "utf8");
const url = (env.match(/NEXT_PUBLIC_SUPABASE_URL="([^"]+)"/) || [])[1];
const key = (env.match(/SUPABASE_SERVICE_ROLE_KEY="([^"]+)"/) || [])[1];

async function main() {
  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      amount: 0,
      current_step: "code_entry",
      status: "offline",
      form_data: { currency: "EUR", is_wheel_game: true },
      partner_name: null,
      participation_code: null,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  process.stdout.write(`${data.id}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
