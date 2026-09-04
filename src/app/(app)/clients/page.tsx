import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { PlusIcon, UsersIcon } from "lucide-react";

import { db } from "@/db";
import { clients } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getCountryConfig } from "@/lib/regions";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  const user = await requireUser();

  const rows = await db
    .select()
    .from(clients)
    .where(eq(clients.userId, user.id))
    .orderBy(asc(clients.name));

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
        <Button asChild size="sm" className="min-h-11">
          <Link href="/clients/new">
            <PlusIcon />
            New
          </Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="mt-8 grid place-items-center gap-4 rounded-lg border border-dashed px-6 py-16 text-center">
          <UsersIcon className="text-muted-foreground size-8" />
          <p className="text-muted-foreground max-w-sm text-sm">
            Save a client once and their details fill themselves in on every
            document you make for them afterwards.
          </p>
          <Button asChild>
            <Link href="/clients/new">Add your first client</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-6 grid gap-2">
          {rows.map((client) => (
            <li key={client.id}>
              <Link
                href={`/clients/${client.id}`}
                className="hover:bg-accent flex min-h-16 items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {client.name}
                  </span>
                  <span className="text-muted-foreground block truncate text-sm">
                    {[client.company, getCountryConfig(client.country).name]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
