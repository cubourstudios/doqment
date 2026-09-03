"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import type { PreviewDocument } from "@/components/pdf/invoice-preview";

/**
 * @react-pdf/renderer must never reach a server component — it touches browser
 * APIs at import time and crashes the Vercel build. ssr: false is what keeps it
 * out of the server bundle, and this wrapper is where that boundary lives.
 */
const InvoicePreview = dynamic(
  () => import("@/components/pdf/invoice-preview").then((m) => m.InvoicePreview),
  {
    ssr: false,
    loading: () => <Skeleton className="h-11 w-full" />,
  },
);

export function DocumentActions({
  document,
  fileName,
  watermark,
}: {
  document: PreviewDocument;
  fileName: string;
  watermark: boolean;
}) {
  return (
    <InvoicePreview
      document={document}
      fileName={fileName}
      watermark={watermark}
    />
  );
}
