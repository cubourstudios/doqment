"use client";

import { useState } from "react";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";
import { DownloadIcon, EyeIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { InvoiceDocument, type InvoicePdfData } from "./invoice-document";
import { ContractDocument, type ContractPdfData } from "./contract-document";

/**
 * PDF preview and download.
 *
 * This whole file is client-only and loaded through next/dynamic with
 * ssr: false — @react-pdf/renderer touches browser APIs at import time and
 * crashes the build if it is pulled into a server component.
 *
 * The preview is collapsed on first paint rather than shown. PDFViewer renders
 * into an iframe and costs a couple of megabytes of JavaScript plus the font;
 * on a phone that is a slow, hot, data-hungry thing to do to someone whose
 * actual intent is usually "download and send it".
 */
export type PreviewDocument =
  | { kind: "invoice"; data: InvoicePdfData }
  | { kind: "contract"; data: ContractPdfData };

export function InvoicePreview({
  document,
  fileName,
  watermark = false,
  logoUrl,
}: {
  document: PreviewDocument;
  fileName: string;
  watermark?: boolean;
  logoUrl?: string | null;
}) {
  const [showPreview, setShowPreview] = useState(false);

  // Built once per render and reused by both the download link and the viewer,
  // so the two can never disagree about what is being produced.
  const element =
    document.kind === "invoice" ? (
      <InvoiceDocument
        data={document.data}
        watermark={watermark}
        logoUrl={logoUrl}
      />
    ) : (
      <ContractDocument data={document.data} watermark={watermark} />
    );

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <PDFDownloadLink
          document={element}
          fileName={fileName}
          className="w-full sm:w-auto"
        >
          {({ loading }) => (
            <Button className="w-full" disabled={loading}>
              <DownloadIcon />
              {loading ? "Preparing…" : "Download PDF"}
            </Button>
          )}
        </PDFDownloadLink>

        {!showPreview ? (
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => setShowPreview(true)}
          >
            <EyeIcon />
            Preview
          </Button>
        ) : null}
      </div>

      {showPreview ? (
        <div className="h-[70vh] overflow-hidden rounded-lg border">
          <PDFViewer width="100%" height="100%" showToolbar={false}>
            {element}
          </PDFViewer>
        </div>
      ) : null}
    </div>
  );
}
