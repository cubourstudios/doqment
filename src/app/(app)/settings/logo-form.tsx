"use client";

import { useActionState, useRef } from "react";
import Image from "next/image";
import { Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { removeLogo, uploadLogo, type LogoState } from "./logo-actions";

/**
 * Business logo.
 *
 * Shown as a preview rather than a filename, because the only question anyone
 * has here is "is that the right image, and does it look right small" — which
 * a filename cannot answer.
 */
export function LogoForm({ signedUrl }: { signedUrl: string | null }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState<LogoState, FormData>(
    uploadLogo,
    {},
  );

  return (
    <div className="grid gap-3">
      {signedUrl ? (
        <div className="flex items-center gap-4">
          {/* Bounded rather than natural size: this is roughly how large it
              prints on an A4 invoice, so an image that turns to mush here will
              turn to mush there. */}
          <Image
            src={signedUrl}
            alt="Your business logo"
            width={160}
            height={64}
            unoptimized
            className="h-16 w-auto max-w-40 rounded border object-contain p-1"
          />

          <form action={removeLogo}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="text-destructive"
            >
              <Trash2Icon />
              Remove
            </Button>
          </form>
        </div>
      ) : null}

      <form ref={formRef} action={formAction} className="grid gap-2">
        <input
          type="file"
          name="logo"
          accept="image/png,image/jpeg,image/webp"
          onChange={() => formRef.current?.requestSubmit()}
          className="file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/80 block w-full text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:px-3 file:py-2 file:text-sm file:font-medium"
        />

        {state.error ? (
          <p role="alert" className="text-destructive text-sm">
            {state.error}
          </p>
        ) : (
          <p className="text-muted-foreground text-xs">
            PNG, JPEG or WebP, up to 2 MB. Appears on your invoices.
          </p>
        )}
      </form>
    </div>
  );
}
