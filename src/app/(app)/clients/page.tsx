import type { Metadata } from "next";
import { UsersIcon } from "lucide-react";

import { PagePlaceholder } from "@/components/app/page-placeholder";

export const metadata: Metadata = { title: "Clients" };

export default function ClientsPage() {
  return (
    <PagePlaceholder
      title="Clients"
      description="Save a client once and their details fill themselves in on every document afterwards. Coming in the next phase."
      icon={UsersIcon}
    />
  );
}
