import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ChevronLeftIcon, PencilIcon } from "lucide-react";

import { db } from "@/db";
import { clients, projects, uploads } from "@/db/schema";
import { requireProfile } from "@/lib/auth";
import { getUserPlan, limitsFor } from "@/lib/billing/plans";
import { getCountryConfig } from "@/lib/regions";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
  valueBandLabel,
} from "@/lib/labels";
import { getProjectChecklist } from "@/lib/guidance/service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DocumentChecklist } from "@/components/app/document-checklist";
import { ProjectUploads } from "@/components/app/project-uploads";
import { createSignedUrl } from "@/lib/storage";

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

  const [checklist, uploadRows] = await Promise.all([
    getProjectChecklist(userId, profile.country, project, client?.country ?? null),
    db
      .select()
      .from(uploads)
      .where(and(eq(uploads.projectId, project.id), eq(uploads.userId, userId))),
  ]);

  // Signed URLs are minted per request and expire in an hour, so a link copied
  // out of the page stops working rather than becoming a permanent public
  // handle on someone's contract.
  const uploadsWithUrls = await Promise.all(
    uploadRows.map(async (upload) => ({
      id: upload.id,
      fileName: upload.fileName,
      size: upload.size,
      signedUrl: await createSignedUrl("uploads", upload.filePath),
    })),
  );

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

      {/* The checklist comes before the project's own details on purpose: it
          is what the user came here for, and on a phone whatever sits at the
          top of the page is what gets read. */}
      <section className="mt-6">
        <h2 className="mb-1 font-semibold">Documents you need</h2>
        <p className="text-muted-foreground mb-4 text-sm">
          Based on {checklist.input.clientRelationship === "new" ? "a new" : "a repeat"}{" "}
          client and the size of this project.
        </p>
        <DocumentChecklist projectId={project.id} checklist={checklist} />
      </section>

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

      <section className="mt-8">
        <h2 className="mb-1 font-semibold">Your own files</h2>
        <p className="text-muted-foreground mb-3 text-sm">
          Anything already signed or sent elsewhere — keep it with the project.
        </p>
        <ProjectUploads
          projectId={project.id}
          uploads={uploadsWithUrls}
          maxUploadBytes={limitsFor(await getUserPlan(userId)).maxUploadBytes}
        />
      </section>

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
