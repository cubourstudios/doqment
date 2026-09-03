import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ChevronLeftIcon } from "lucide-react";

import { db } from "@/db";
import { clients, projects } from "@/db/schema";
import { requireProfile } from "@/lib/auth";
import { getCountryConfig } from "@/lib/regions";
import { peekNextInvoiceNumber } from "@/lib/invoice/numbering";
import { stateCodeFromGstin } from "@/lib/invoice/tax";
import { DOC_TYPE_LABELS } from "@/lib/labels";
import type { DocType } from "@/lib/guidance/types";

import { InvoiceForm } from "./invoice-form";
import { createInvoice } from "../actions";

export const metadata: Metadata = { title: "New document" };

export default async function NewDocumentPage({
  params,
  searchParams,
}: PageProps<"/projects/[id]/documents/new">) {
  const { id } = await params;
  const { type } = await searchParams;
  const { userId, profile } = await requireProfile();

  const [row] = await db
    .select({ project: projects, client: clients })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .limit(1);

  if (!row) notFound();

  const { project, client } = row;
  const docType = (typeof type === "string" ? type : "invoice") as DocType;

  const country = getCountryConfig(profile.country);

  // Only the invoice is built so far; the other five document types share this
  // route and land in the next commit.
  if (docType !== "invoice") {
    return (
      <div className="mx-auto w-full max-w-lg">
        <BackLink projectId={project.id} title={project.title} />
        <h1 className="text-2xl font-semibold tracking-tight">
          {DOC_TYPE_LABELS[docType] ?? "Document"}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          This document type isn&apos;t ready yet. Invoices are available now.
        </p>
      </div>
    );
  }

  const nextInvoiceNumber = await peekNextInvoiceNumber(
    db,
    userId,
    profile.country,
    new Date(),
  );

  return (
    <div className="mx-auto w-full max-w-lg">
      <BackLink projectId={project.id} title={project.title} />

      <h1 className="text-2xl font-semibold tracking-tight">New invoice</h1>
      <p className="text-muted-foreground mt-1 mb-6 text-sm">
        For {client?.name ?? project.title}. Tax is worked out from where you
        and your client are based.
      </p>

      <InvoiceForm
        action={createInvoice.bind(null, project.id)}
        context={{
          currency: profile.currency ?? country.currency,
          supplierCountry: country.code,
          supplierStateCode: stateCodeFromGstin(profile.taxId),
          clientCountry: client?.country ?? null,
          clientStateCode: stateCodeFromGstin(client?.taxId ?? null),
          registered: Boolean(profile.taxId),
          nextInvoiceNumber,
          defaultDescription: project.title,
        }}
      />
    </div>
  );
}

function BackLink({ projectId, title }: { projectId: string; title: string }) {
  return (
    <Link
      href={`/projects/${projectId}`}
      className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm"
    >
      <ChevronLeftIcon className="size-4" />
      {title}
    </Link>
  );
}
