import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AdminPreview } from "./admin-preview";

export default async function AdminPreviewPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    redirect("/admin/login?next=/admin/preview");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/admin/login?next=/admin/preview");
  }

  return <AdminPreview />;
}
