import type { Metadata } from "next";
import { FileTextIcon } from "lucide-react";

import { PagePlaceholder } from "@/components/app/page-placeholder";

export const metadata: Metadata = { title: "Documents" };

export default function DocumentsPage() {
  return (
    <PagePlaceholder
      title="Documents"
      description="Every proposal, agreement and invoice you generate will be listed here, searchable by client."
      icon={FileTextIcon}
    />
  );
}
