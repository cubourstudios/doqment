import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ChevronLeftIcon, PencilIcon } from "lucide-react";

import { db } from "@/db";
import { clients, projects } from "@/db/schema";
import { requireProfile } from "@/lib/auth";
import { getCountryConfig } from "@/lib/regions";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
  valueBandLabel,
} from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { DeleteProjectButton } from "./delete-project-button";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectPage({
  params,
}: PageProps<"/projects/[id]">) {
  const { id } = await params;
  const { userId, profile } = await requireProfile();

  const [row] = await db
    .select({
      project: projects,
      client: clients,
    })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .limit(1);

  if (!row) notFound();

  const { project, client } = row;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link
        href="/projects"
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm"
      >
        <ChevronLeftIcon className="size-4" />
        Projects
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {project.title}
          </h1>
          {client ? (
            <Link
              href={`/clients/${client.id}`}
              className="text-muted-foreground hover:text-foreground truncate text-sm underline-offset-4 hover:underline"
            >
              {client.name}
            </Link>
          ) : (
            <p className="text-muted-foreground text-sm">No client linked</p>
          )}
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/projects/${project.id}/edit`}>
            <PencilIcon />
            Edit
          </Link>
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant={project.status === "active" ? "default" : "secondary"}>
          {PROJECT_STATUS_LABELS[project.status]}
        </Badge>
        <Badge variant="outline">
          {PROJECT_TYPE_LABELS[project.projectType]}
        </Badge>
        <Badge variant="outline">
          {valueBandLabel(project.valueBand, profile.currency ?? "USD")}
        </Badge>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          {client ? (
            <Detail
              label="Client country"
              value={getCountryConfig(client.country).name}
            />
          ) : null}
          {project.startDate ? (
            <Detail label="Starts" value={project.startDate} />
          ) : null}
          {project.endDate ? (
            <Detail label="Ends" value={project.endDate} />
          ) : null}
        </CardContent>
      </Card>

      <div className="mt-10">
        <DeleteProjectButton
          projectId={project.id}
          projectTitle={project.title}
        />
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
