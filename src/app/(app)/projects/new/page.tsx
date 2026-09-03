import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { ChevronLeftIcon } from "lucide-react";

import { db } from "@/db";
import { clients } from "@/db/schema";
import { requireProfile } from "@/lib/auth";

import { ProjectForm } from "./project-form";

export const metadata: Metadata = { title: "New project" };

export default async function NewProjectPage() {
  const { userId, profile } = await requireProfile();

  const savedClients = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(eq(clients.userId, userId))
    .orderBy(asc(clients.name));

  return (
    <div className="mx-auto w-full max-w-lg">
      <Link
        href="/projects"
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm"
      >
        <ChevronLeftIcon className="size-4" />
        Projects
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight">New project</h1>
      <p className="text-muted-foreground mt-1 mb-6 text-sm">
        Five questions. Then we&apos;ll tell you which documents this project
        needs.
      </p>

      <ProjectForm
        clients={savedClients}
        currency={profile.currency ?? "USD"}
        defaultCountry={profile.country ?? ""}
      />
    </div>
  );
}
