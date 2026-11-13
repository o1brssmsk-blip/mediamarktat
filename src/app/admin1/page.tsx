import { Admin1Dashboard } from "./admin1-dashboard";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function Admin1Page() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    redirect("/admin/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/admin/login");
  }

  return <Admin1Dashboard user={user} />;
}