import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { ChevronLeftIcon, FolderPlusIcon } from "lucide-react";

import { db } from "@/db";
import { clients, docTypeEnum, projects } from "@/db/schema";
import { requireProfile } from "@/lib/auth";
import { DOC_TYPE_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import type { DocType } from "@/lib/guidance/types";

export const metadata: Metadata = { title: "Choose a project" };

/**
 * Mode A, step two — where the document is filed.
 *
 * The spec's Quick Document mode creates a document with no project at all.
 * That cannot be honoured yet: `documents.project_id` is NOT NULL, so a
 * project-less document has nowhere to go, and making it nullable is a
 * migration the current session was scoped out of. Rather than link the type
 * picker at a form that would fail on save, this step asks which project the
 * document belongs to and hands off to the existing, working generator.
 *
 * TODO(mode-a): once `documents.project_id` is nullable and the guidance
 * evaluation is skippable, replace this with the inline client step the spec
 * describes — name and country entered here, no project required — and offer
 * "attach to a project" after the fact instead of before.
 */
export default async function ChooseProjectPage({
  params,
}: PageProps<"/documents/new/[type]">) {
  const { type } = await params;

  if (!docTypeEnum.enumValues.includes(type as DocType)) notFound();
  const docType = type as DocType;

  const { userId } = await requireProfile();

  const rows = await db
    .select({
      id: projects.id,
      title: projects.title,
      clientName: clients.name,
    })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(and(eq(projects.userId, userId), eq(projects.status, "active")))
    .orderBy(desc(projects.createdAt));

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Link
        href="/documents/new"
        className="text-muted-foreground hover:text-foreground -my-2 mb-2 inline-flex min-h-11 items-center gap-1 text-sm"
      >
        <ChevronLeftIcon className="size-4" />
        Document type
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight">
        {DOC_TYPE_LABELS[docType]}
      </h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Which project is this for? Documents stay filed under a project so they
        are still findable when a payment is disputed a year from now.
      </p>

      {rows.length === 0 ? (
        <div className="mt-6 grid place-items-center gap-4 rounded-lg border border-dashed px-6 py-12 text-center">
          <FolderPlusIcon className="text-muted-foreground size-8" />
          <p className="text-muted-foreground max-w-sm text-sm">
            You have no active projects yet. Creating one takes a few seconds
            and tells us which documents this engagement needs.
          </p>
          <Button asChild>
            <Link href="/projects/new">New project</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-6 grid gap-2">
          {rows.map((project) => (
            <li key={project.id} className="min-w-0">
              <Link
                href={`/projects/${project.id}/documents/new?type=${docType}`}
                className="hover:bg-accent flex min-h-16 items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {project.title}
                  </span>
                  {project.clientName ? (
                    <span className="text-muted-foreground block truncate text-sm">
                      {project.clientName}
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}

          <li>
            <Button asChild variant="outline" className="mt-2 w-full">
              <Link href="/projects/new">New project instead</Link>
            </Button>
          </li>
        </ul>
      )}
    </div>
  );
}
