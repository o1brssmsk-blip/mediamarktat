import { AdminDashboardClean } from "./admin-dashboard-clean";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AdminHomePage() {
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

  return <AdminDashboardClean />;
}
