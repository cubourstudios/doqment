import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import {
  clients,
  documents,
  documentVersions,
  invoices,
  profiles,
  projects,
  uploads,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";

/**
 * Export everything a user has.
 *
 * A product that holds someone's invoices and contracts should never be the
 * reason they cannot leave. This returns real, usable JSON — the full document
 * content, not a summary — so the export is worth something on its own rather
 * than being a compliance gesture.
 */
export async function GET() {
  const user = await requireUser();

  const [
    profileRows,
    clientRows,
    projectRows,
    documentRows,
    invoiceRows,
    uploadRows,
  ] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.userId, user.id)),
    db.select().from(clients).where(eq(clients.userId, user.id)),
    db.select().from(projects).where(eq(projects.userId, user.id)),
    db.select().from(documents).where(eq(documents.userId, user.id)),
    db.select().from(invoices).where(eq(invoices.userId, user.id)),
    db.select().from(uploads).where(eq(uploads.userId, user.id)),
  ]);

  // Versions carry the actual document content, joined through the user's own
  // documents so the query stays scoped without a user_id column of its own.
  const versionRows = await Promise.all(
    documentRows.map(async (document) => ({
      documentId: document.id,
      versions: await db
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.documentId, document.id)),
    })),
  );

  const payload = {
    exportedAt: new Date().toISOString(),
    profile: profileRows[0] ?? null,
    clients: clientRows,
    projects: projectRows,
    documents: documentRows,
    documentVersions: versionRows,
    invoices: invoiceRows,
    // File paths only. The files themselves live in private storage and are
    // fetched with signed URLs; embedding them would make this response
    // enormous and put private documents in a plain download.
    uploads: uploadRows.map((upload) => ({
      fileName: upload.fileName,
      size: upload.size,
      mime: upload.mime,
      createdAt: upload.createdAt,
    })),
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="doqment-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
