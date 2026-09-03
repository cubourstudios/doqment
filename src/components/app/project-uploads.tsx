"use client";

import { useActionState, useRef } from "react";
import { PaperclipIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/storage";
import {
  deleteUpload,
  uploadProjectFile,
  type UploadState,
} from "@/app/(app)/projects/[id]/uploads/actions";

export type UploadRow = {
  id: string;
  fileName: string;
  size: number;
  signedUrl: string | null;
};

/**
 * A project's own files — contracts signed elsewhere, a client's brief, a
 * scanned agreement.
 *
 * This is a retention feature (PRD §8.3) rather than a generation one: once a
 * freelancer's paperwork for a project lives here, the project is worth coming
 * back to even between invoices.
 */
export function ProjectUploads({
  projectId,
  uploads,
  maxUploadBytes,
}: {
  projectId: string;
  uploads: UploadRow[];
  maxUploadBytes: number;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction] = useActionState<UploadState, FormData>(
    uploadProjectFile.bind(null, projectId),
    {},
  );

  return (
    <div className="grid gap-3">
      {uploads.length > 0 ? (
        <ul className="grid gap-2">
          {uploads.map((upload) => (
            <li
              key={upload.id}
              className="flex min-h-14 items-center justify-between gap-3 rounded-lg border px-3 py-2"
            >
              <span className="flex min-w-0 items-center gap-2">
                <PaperclipIcon className="text-muted-foreground size-4 shrink-0" />
                <span className="min-w-0">
                  {upload.signedUrl ? (
                    <a
                      href={upload.signedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-sm font-medium underline-offset-4 hover:underline"
                    >
                      {upload.fileName}
                    </a>
                  ) : (
                    <span className="block truncate text-sm font-medium">
                      {upload.fileName}
                    </span>
                  )}
                  <span className="text-muted-foreground block text-xs">
                    {formatBytes(upload.size)}
                  </span>
                </span>
              </span>

              <form action={deleteUpload}>
                <input type="hidden" name="uploadId" value={upload.id} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive"
                  aria-label={`Delete ${upload.fileName}`}
                >
                  <Trash2Icon />
                </Button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}

      <form ref={formRef} action={formAction} className="grid gap-2">
        <input
          type="file"
          name="file"
          accept=".pdf,.doc,.docx,image/png,image/jpeg,image/webp"
          // Submitting on selection saves a tap. The file input is already an
          // explicit, deliberate choice — a second confirm button adds nothing.
          onChange={() => formRef.current?.requestSubmit()}
          className="file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/80 block w-full text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:px-3 file:py-2 file:text-sm file:font-medium"
        />

        {state.error ? (
          <p role="alert" className="text-destructive text-sm">
            {state.error}
          </p>
        ) : (
          <p className="text-muted-foreground text-xs">
            PDF, Word or image, up to {formatBytes(maxUploadBytes)}. Only you can
            see these.
          </p>
        )}
      </form>
    </div>
  );
}
