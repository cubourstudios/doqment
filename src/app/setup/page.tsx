import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangleIcon, CheckCircle2Icon, InfoIcon } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { readSupabaseConfig } from "@/lib/supabase/env";
import { runDiagnostics, type Check } from "@/lib/diagnostics/checks";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Setup check" };

/*
 * Never cached. The whole point is to report the state of this deployment at
 * the moment it is asked, and a cached answer would say "broken" for an hour
 * after the setting was fixed.
 */
export const dynamic = "force-dynamic";

/**
 * What is wrong with this deployment, in plain language.
 *
 * Deliberately outside the (app) route group. That group's layout calls
 * requireProfile(), which reads the database — so a diagnostics page inside it
 * would fail for precisely the reason it exists to explain.
 *
 * Gated on being signed in, which needs Supabase but not the database, so it
 * stays reachable in the failure it most often has to report: login works,
 * every signed-in page is a blank error. It reveals which settings are
 * present, never what any of them contains.
 */
export default async function SetupPage() {
  /*
   * Signed in normally — but not when Supabase itself is unconfigured.
   *
   * requireUser() needs Supabase to answer at all, so demanding it there would
   * make this page throw in the one case where its first check is the answer:
   * "sign-in is not configured". Nobody can hold a session on such a
   * deployment, so there is no session to require, and the page reports which
   * setting is absent — never what any setting contains.
   */
  if (readSupabaseConfig()) {
    await requireUser();
  }

  const checks = await runDiagnostics();
  const broken = checks.filter((check) => check.status === "broken");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Setup check</h1>

      <p className="text-muted-foreground mt-2 text-sm">
        {broken.length === 0
          ? "Everything this app needs is configured."
          : broken.length === 1
            ? "One thing needs fixing. It's described below."
            : `${broken.length} things need fixing. They're described below.`}
      </p>

      <div className="mt-8 grid gap-4">
        {checks.map((check) => (
          <CheckCard key={check.name} check={check} />
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
        {/* A full reload rather than a router push: these values are read on
            the server at request time, and a client-side navigation could be
            served from the router cache. */}
        <Button asChild variant="ghost">
          <a href="/setup">Check again</a>
        </Button>
      </div>

      <p className="text-muted-foreground mt-8 text-xs">
        This page shows which settings exist, never what they contain. Change
        them where your app is hosted, then deploy again — settings are read
        when the app is built, so a change without a new deployment has no
        effect.
      </p>
    </div>
  );
}

function CheckCard({ check }: { check: Check }) {
  const tone =
    check.status === "ok"
      ? { border: "border-border", Icon: CheckCircle2Icon, colour: "text-muted-foreground" }
      : check.status === "optional"
        ? { border: "border-recommended/60", Icon: InfoIcon, colour: "text-foreground" }
        : { border: "border-destructive/60", Icon: AlertTriangleIcon, colour: "text-destructive" };

  return (
    <section className={`rounded-lg border ${tone.border} p-4`}>
      <div className="flex items-start gap-3">
        <tone.Icon className={`mt-0.5 size-5 shrink-0 ${tone.colour}`} />
        <div className="min-w-0 flex-1">
          <h2 className="font-medium">{check.name}</h2>
          <p className="text-muted-foreground mt-1 text-sm">{check.detail}</p>

          {check.impact ? (
            <p className="mt-2 text-sm">{check.impact}</p>
          ) : null}

          {check.fix ? (
            <>
              <p className="mt-4 text-sm font-medium">How to fix it</p>
              <ol className="text-muted-foreground mt-2 grid gap-1.5 text-sm">
                {check.fix.map((step, index) => (
                  <li key={step} className="flex gap-2">
                    <span className="tabular-nums">{index + 1}.</span>
                    <span className="min-w-0 break-words">{step}</span>
                  </li>
                ))}
              </ol>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
