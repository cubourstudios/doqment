import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ChevronLeftIcon } from "lucide-react";

import { db } from "@/db";
import { clients, projects, templates } from "@/db/schema";
import { requireProfile } from "@/lib/auth";
import { getCountryConfig } from "@/lib/regions";
import { peekNextInvoiceNumber } from "@/lib/invoice/numbering";
import { stateCodeFromGstin } from "@/lib/invoice/tax";
import { DOC_TYPE_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { requiresDisclaimer } from "@/lib/disclaimers";
import { buildPrefill, type RenderContext } from "@/lib/templates/render";
import type { TemplateSchema } from "@/lib/templates/types";
import { docTypeEnum } from "@/db/schema";
import type { DocType } from "@/lib/guidance/types";

import { InvoiceForm } from "./invoice-form";
import { TemplateForm } from "./template-form";
import { createInvoice } from "../actions";
import { createTemplateDocument } from "../create-document";

export const metadata: Metadata = { title: "New document" };

function parseDocType(value: unknown): DocType {
  return docTypeEnum.enumValues.includes(value as DocType)
    ? (value as DocType)
    : "invoice";
}

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
  const docType = parseDocType(type);
  const country = getCountryConfig(profile.country);

  if (docType === "invoice") {
    const nextInvoiceNumber = await peekNextInvoiceNumber(
      db,
      userId,
      profile.country,
      new Date(),
    );

    return (
      <Shell projectId={project.id} projectTitle={project.title}>
        <h1 className="text-2xl font-semibold tracking-tight">New invoice</h1>
        <p className="text-muted-foreground mt-1 mb-6 text-sm">
          For {client?.name ?? project.title}. Tax is worked out from where you
          and your client are based.
        </p>

        {/*
          Raised here rather than blocked at onboarding.

          A tax invoice without the supplier's address is not valid under GST
          and most equivalent regimes, but demanding an address during signup
          would slow the one screen that must stay fast — and someone filling
          in onboarding has no idea yet why it matters. Here they do, and the
          fix is one tap away. It is a warning rather than a block because a
          draft invoice is still useful, and being unable to proceed at all
          would be worse than an invoice they can correct.
        */}
        {!hasAddress(profile.addressJson) ? (
          <div className="border-recommended/60 bg-recommended/10 mb-6 rounded-lg border px-4 py-3 text-sm">
            <p className="font-medium">Add your business address first</p>
            <p className="text-muted-foreground mt-1">
              A tax invoice needs it to be valid
              {country.code === "IN" ? " under GST" : ""}. It takes a moment and
              applies to every invoice from now on.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href="/settings">Add it in settings</Link>
            </Button>
          </div>
        ) : null}

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
      </Shell>
    );
  }

  const [template] = await db
    .select({
      name: templates.name,
      schemaJson: templates.schemaJson,
    })
    .from(templates)
    .where(
      and(
        eq(templates.docType, docType),
        eq(templates.region, country.region),
        eq(templates.isActive, true),
      ),
    )
    .limit(1);

  if (!template) {
    return (
      <Shell projectId={project.id} projectTitle={project.title}>
        <h1 className="text-2xl font-semibold tracking-tight">
          {DOC_TYPE_LABELS[docType]}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          This document type isn&apos;t available for your region yet.
        </p>
      </Shell>
    );
  }

  const schema = template.schemaJson as TemplateSchema;

  const context: RenderContext = {
    profile: {
      businessName: profile.businessName,
      name: profile.name,
      addressJson: profile.addressJson,
      taxId: profile.taxId,
      country: profile.country,
    },
    client: client
      ? {
          name: client.name,
          company: client.company,
          addressJson: client.addressJson,
          country: client.country,
          taxId: client.taxId,
        }
      : null,
    project: {
      title: project.title,
      startDate: project.startDate,
      endDate: project.endDate,
    },
  };

  return (
    <Shell projectId={project.id} projectTitle={project.title}>
      <h1 className="text-2xl font-semibold tracking-tight">
        New {DOC_TYPE_LABELS[docType].toLowerCase()}
      </h1>
      <p className="text-muted-foreground mt-1 mb-6 text-sm">
        For {client?.name ?? project.title}. Anything we already know is filled
        in — change whatever isn&apos;t right.
      </p>

      <TemplateForm
        action={createTemplateDocument.bind(null, project.id, docType)}
        schema={schema}
        initialValues={buildPrefill(schema, context)}
        submitLabel={`Create ${DOC_TYPE_LABELS[docType].toLowerCase()}`}
        showDisclaimer={requiresDisclaimer(docType)}
      />
    </Shell>
  );
}

function Shell({
  projectId,
  projectTitle,
  children,
}: {
  projectId: string;
  projectTitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-lg">
      <Link
        href={`/projects/${projectId}`}
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm"
      >
        <ChevronLeftIcon className="size-4" />
        {projectTitle}
      </Link>
      {children}
    </div>
  );
}

/**
 * An address counts as present only if it has a non-empty line.
 *
 * The column stores `{ lines: [...] }`, and a saved-then-cleared field leaves
 * an empty array behind — which is not an address, however truthy the object is.
 */
function hasAddress(addressJson: unknown): boolean {
  if (!addressJson || typeof addressJson !== "object") return false;

  const lines = (addressJson as { lines?: unknown }).lines;

  return (
    Array.isArray(lines) &&
    lines.some((line) => typeof line === "string" && line.trim() !== "")
  );
}
