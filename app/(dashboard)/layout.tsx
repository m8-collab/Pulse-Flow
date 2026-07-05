import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  return (
    <div className="flex">
      <Sidebar role={profile?.role ?? "member"} email={user.email ?? ""} />
      <div className="min-h-screen flex-1 overflow-x-hidden bg-background">{children}</div>
    </div>
  );
}
