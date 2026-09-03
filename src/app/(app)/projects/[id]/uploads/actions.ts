"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { projects, uploads } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import {
  ALLOWED_UPLOAD_TYPES,
  MAX_UPLOAD_BYTES,
  buildStoragePath,
  deleteFile,
  uploadFile,
} from "@/lib/storage";

export type UploadState = { error?: string; success?: boolean };

export async function uploadProjectFile(
  projectId: string,
  _prevState: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const user = await requireUser();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "That file is larger than 10 MB." };
  }

  // The browser's reported type is a hint, not proof — but rejecting on it
  // still stops the common accidents, and the bucket is private either way.
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
    return { error: "Upload a PDF, Word document or image." };
  }

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
    .limit(1);

  if (!project) return { error: "That project no longer exists." };

  const path = buildStoragePath(user.id, file.name);
  const { error } = await uploadFile("uploads", path, file);

  if (error) return { error: "The upload failed. Try again." };

  await db.insert(uploads).values({
    userId: user.id,
    projectId,
    filePath: path,
    fileName: file.name,
    mime: file.type,
    size: file.size,
  });

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

export async function deleteUpload(formData: FormData) {
  const user = await requireUser();
  const uploadId = formData.get("uploadId");

  if (typeof uploadId !== "string") return;

  // Delete the row first, then the object. If the storage call fails the file
  // is orphaned but unreachable, which is far better than a row pointing at
  // a file that no longer exists.
  const [removed] = await db
    .delete(uploads)
    .where(and(eq(uploads.id, uploadId), eq(uploads.userId, user.id)))
    .returning({ filePath: uploads.filePath, projectId: uploads.projectId });

  if (!removed) return;

  await deleteFile("uploads", removed.filePath);

  if (removed.projectId) revalidatePath(`/projects/${removed.projectId}`);
}
