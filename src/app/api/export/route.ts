import { NextResponse } from "next/server";
import { asc, eq, inArray } from "drizzle-orm";

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

  /*
   * Versions carry the actual document content. They have no user_id column of
   * their own, so the query is scoped by the ids of the user's own documents —
   * which were themselves read with a user filter above.
   *
   * One query for all of them, rather than one per document. The pool is
   * capped at a single connection, so a per-document query does not run in
   * parallel despite the Promise.all around it: it runs serially, and an
   * export by anyone with a few hundred documents is hundreds of sequential
   * round trips. That is how a data export ends in a function timeout — the
   * one feature whose whole purpose is that the user can always get their
   * work out.
   *
   * Ordered explicitly, because a single query returns rows in whatever order
   * the planner likes, and an export that shuffles between runs cannot be
   * diffed against an earlier one.
   */
  const documentIds = documentRows.map((document) => document.id);

  const allVersions = documentIds.length
    ? await db
        .select()
        .from(documentVersions)
        .where(inArray(documentVersions.documentId, documentIds))
        .orderBy(asc(documentVersions.documentId), asc(documentVersions.versionNo))
    : [];

  const versionRows = groupVersionsByDocument(documentIds, allVersions);

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

/**
 * Regroup one flat result set into per-document lists.
 *
 * Kept separate and pure so it can be tested: the risk in collapsing N queries
 * into one is not the SQL, it is the regrouping — a document silently losing
 * its versions, or being dropped from the export altogether because nothing
 * came back for it. Both would be invisible until someone needed the export.
 */
export function groupVersionsByDocument<T extends { documentId: string }>(
  documentIds: string[],
  versions: T[],
): { documentId: string; versions: T[] }[] {
  const byDocument = new Map<string, T[]>();

  // Seeded from the ids, so a document with no versions still appears, with an
  // empty list — the shape callers had when each document was queried alone.
  for (const id of documentIds) byDocument.set(id, []);

  for (const version of versions) {
    // A version whose document is not in the export belongs to someone else
    // and is dropped rather than added under a new key.
    byDocument.get(version.documentId)?.push(version);
  }

  return documentIds.map((documentId) => ({
    documentId,
    versions: byDocument.get(documentId) ?? [],
  }));
}
