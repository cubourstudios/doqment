"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  clients,
  documents,
  documentVersions,
  projects,
  templates,
} from "@/db/schema";
import { requireProfile } from "@/lib/auth";
import { track } from "@/lib/analytics";
import { canCreateDocument, getUserPlan } from "@/lib/billing/plans";
import { requiresDisclaimer } from "@/lib/disclaimers";
import { logDisclaimerAcceptance } from "@/lib/disclaimer-log";
import type { DocType } from "@/lib/guidance/types";
import { getCountryConfig } from "@/lib/regions";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import {
  formatCurrencyValues,
  missingRequired,
  renderBody,
  type FieldValues,
  type RenderContext,
} from "@/lib/templates/render";
import type { TemplateBody, TemplateSchema } from "@/lib/templates/types";

import type { DocumentState } from "./actions";

/**
 * Create any document that is not an invoice.
 *
 * Invoices have their own action because of the numbering transaction and the
 * tax maths. Everything else is the same shape — fill a template's fields,
 * render its body, store the result — so one action serves all five types
 * rather than five near-identical ones.
 */
export async function createTemplateDocument(
  /**
   * Null for Mode A — a document created without a project. The column is
   * nullable, so such a document is filed against the user alone and can be
   * attached to a project later without regenerating it.
   */
  projectId: string | null,
  docType: DocType,
  _prevState: DocumentState,
  formData: FormData,
): Promise<DocumentState> {
  const { userId, profile } = await requireProfile();

  const limited = rateLimit(
    `generate:${userId}`,
    LIMITS.generate.limit,
    LIMITS.generate.windowSeconds,
  );
  if (!limited.allowed) {
    return { error: "Too many documents just now. Try again in a few minutes." };
  }

  const plan = await getUserPlan(userId);
  const entitlement = await canCreateDocument(userId, plan);
  if (!entitlement.allowed) return { error: entitlement.reason };

  // With a project, the client comes from it. Without one, the form names the
  // client directly — Mode A must never require a project to exist first.
  let project: typeof projects.$inferSelect | null = null;
  let client: typeof clients.$inferSelect | null = null;

  if (projectId) {
    const [row] = await db
      .select({ project: projects, client: clients })
      .from(projects)
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .limit(1);

    if (!row) return { error: "That project no longer exists." };

    project = row.project;
    client = row.client;
  } else {
    const clientId = formData.get("clientId");

    if (typeof clientId === "string" && clientId) {
      // Filtered by user as well as id: this connection bypasses row level
      // security, so an id alone would read another account's client.
      [client] = await db
        .select()
        .from(clients)
        .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
        .limit(1);
    }
  }
  const region = getCountryConfig(profile.country).region;

  const [template] = await db
    .select()
    .from(templates)
    .where(
      and(
        eq(templates.docType, docType),
        eq(templates.region, region),
        eq(templates.isActive, true),
      ),
    )
    .limit(1);

  if (!template) {
    return { error: "That document type isn't available for your region yet." };
  }

  const schema = template.schemaJson as TemplateSchema;
  const body = template.bodyJson as TemplateBody;

  // Read the submitted values against the template's own field list rather
  // than iterating the form data: a field the template does not declare has no
  // business reaching the rendered document.
  const values: FieldValues = {};
  for (const field of schema.fields) {
    if (field.type === "checkbox") {
      values[field.name] = formData.get(field.name) !== null;
      continue;
    }
    const raw = formData.get(field.name);
    values[field.name] = typeof raw === "string" ? raw.trim() : "";
  }

  // Validated on the server even though the inputs are marked required in the
  // browser — required attributes are a convenience, not a guarantee.
  const missing = missingRequired(schema, values);
  if (missing.length > 0) {
    return {
      error:
        missing.length === 1
          ? `${missing[0].label} is needed.`
          : `Still needed: ${missing.map((f) => f.label).join(", ")}.`,
    };
  }

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
    project: project
      ? {
          title: project.title,
          startDate: project.startDate,
          endDate: project.endDate,
        }
      : null,
  };

  const country = getCountryConfig(profile.country);
  const blocks = renderBody(
    body,
    formatCurrencyValues(schema, values, profile.currency ?? country.currency),
    context,
  );

  // Falls back to the template's own name: a document with neither a client
  // nor a project still needs something readable in the documents list.
  const title = [template.name, client?.name ?? project?.title]
    .filter(Boolean)
    .join(" — ");

  const documentId = await db.transaction(async (tx) => {
    const [document] = await tx
      .insert(documents)
      .values({
        userId,
        projectId,
        templateId: template.id,
        docType,
        title,
        status: "draft",
      })
      .returning({ id: documents.id });

    // Both the answers and the rendered output are stored. The answers make a
    // later edit possible; the rendered blocks make the document reproducible
    // even if the template is revised afterwards.
    const [version] = await tx
      .insert(documentVersions)
      .values({
        documentId: document.id,
        versionNo: 1,
        templateVersion: template.version,
        dataJson: { kind: "contract", title, values, blocks },
      })
      .returning({ id: documentVersions.id });

    await tx
      .update(documents)
      .set({ currentVersionId: version.id })
      .where(eq(documents.id, document.id));

    return document.id;
  });

  if (requiresDisclaimer(docType)) {
    await logDisclaimerAcceptance({
      userId,
      documentId,
      templateVersion: template.version,
    });
  }

  await track(userId, "document_created", { docType });

  if (projectId) revalidatePath(`/projects/${projectId}`);
  revalidatePath("/documents");
  redirect(`/documents/${documentId}`);
}
