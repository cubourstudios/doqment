"use client";

import Link from "next/link";
import { AlertTriangleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * What a crashed page shows.
 *
 * Without this, Next renders its own screen: "This page couldn't load", plus a
 * correlation id that means something to a hosting dashboard and nothing to
 * the person reading it. The real message is in a server log they may have no
 * idea how to reach — and the cause is usually one absent setting.
 *
 * So the offer here is a page that can name that setting. It cannot be
 * diagnosed from the browser: production deliberately withholds the error from
 * the client, and rightly, since exceptions leak table names and connection
 * details. But pointing at /setup costs nothing and answers the common case
 * outright.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center px-4 text-center">
      <AlertTriangleIcon className="text-destructive size-8" />

      <h1 className="mt-4 text-xl font-semibold tracking-tight">
        This page couldn&apos;t load
      </h1>

      <p className="text-muted-foreground mt-2 text-sm">
        Nothing you&apos;ve created has been lost. This is almost always a
        setting that hasn&apos;t been filled in yet, rather than a fault with
        your data.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/setup">Check the setup</Link>
        </Button>
      </div>

      {/* Next's digest is a hash of the server-side error. Useless on its own,
          but it is what a hosting provider's log search matches on, so it is
          worth keeping where someone can copy it. */}
      {error.digest ? (
        <p className="text-muted-foreground mt-8 font-mono text-xs">
          Reference: {error.digest}
        </p>
      ) : null}
    </div>
  );
}
