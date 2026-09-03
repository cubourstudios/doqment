import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ChevronLeftIcon } from "lucide-react";

import { db } from "@/db";
import { projects } from "@/db/schema";
import { requireProfile } from "@/lib/auth";

import { EditProjectForm } from "./edit-project-form";
import { updateProject } from "../../actions";

export const metadata: Metadata = { title: "Edit project" };

export default async function EditProjectPage({
  params,
}: PageProps<"/projects/[id]/edit">) {
  const { id } = await params;
  const { userId, profile } = await requireProfile();

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .limit(1);

  if (!project) notFound();

  const action = updateProject.bind(null, project.id);

  return (
    <div className="mx-auto w-full max-w-lg">
      <Link
        href={`/projects/${project.id}`}
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm"
      >
        <ChevronLeftIcon className="size-4" />
        {project.title}
      </Link>

      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        Edit project
      </h1>

      <EditProjectForm
        action={action}
        currency={profile.currency ?? "USD"}
        defaults={{
          title: project.title,
          projectType: project.projectType,
          valueBand: project.valueBand,
          status: project.status,
          startDate: project.startDate ?? "",
          endDate: project.endDate ?? "",
        }}
      />
    </div>
  );
}
