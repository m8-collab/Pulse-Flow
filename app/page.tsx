import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PulseMark } from "@/components/brand/pulse-mark";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <PulseMark className="scale-125" />
      <div className="max-w-xl space-y-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Campaigns, budgets, and ops — one live system.
        </h1>
        <p className="text-muted-foreground">
          Stop reconciling spreadsheets against three tools. PulseFlow tracks spend, ROI, and
          execution in real time, for every campaign, in one place.
        </p>
      </div>
      <Button asChild size="lg">
        <Link href="/login">Sign in</Link>
      </Button>
    </main>
  );
}
