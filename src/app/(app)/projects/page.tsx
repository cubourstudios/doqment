import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { FolderIcon, PlusIcon } from "lucide-react";

import { db } from "@/db";
import { clients, projects } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { PROJECT_STATUS_LABELS, PROJECT_TYPE_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const user = await requireUser();

  const rows = await db
    .select({
      id: projects.id,
      title: projects.title,
      projectType: projects.projectType,
      status: projects.status,
      clientName: clients.name,
    })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(eq(projects.userId, user.id))
    .orderBy(desc(projects.createdAt));

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <Button asChild size="sm" className="min-h-11">
          <Link href="/projects/new">
            <PlusIcon />
            New
          </Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="mt-8 grid place-items-center gap-4 rounded-lg border border-dashed px-6 py-16 text-center">
          <FolderIcon className="text-muted-foreground size-8" />
          <p className="text-muted-foreground max-w-sm text-sm">
            A project is a client, a brief, and the documents that go with it.
            Create one and we&apos;ll work out what it needs.
          </p>
          <Button asChild>
            <Link href="/projects/new">Create your first project</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-6 grid gap-2">
          {rows.map((project) => (
            // min-w-0: a grid item's automatic minimum is its content width,
            // so a long project title beside a shrink-0 status badge pushed the
            // row 31px past its container and scrolled the page at 360.
            <li key={project.id} className="min-w-0">
              <Link
                href={`/projects/${project.id}`}
                className="hover:bg-accent flex min-h-16 items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {project.title}
                  </span>
                  <span className="text-muted-foreground block truncate text-sm">
                    {[project.clientName, PROJECT_TYPE_LABELS[project.projectType]]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <Badge variant={project.status === "active" ? "default" : "secondary"}>
                  {PROJECT_STATUS_LABELS[project.status]}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
