import type { Metadata } from "next";
import { FolderIcon } from "lucide-react";

import { PagePlaceholder } from "@/components/app/page-placeholder";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <PagePlaceholder
      title="Projects"
      description="Projects group a client, a brief and every document you create for it. Creating and listing them lands next."
      icon={FolderIcon}
    />
  );
}
