import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";

import { ClientForm } from "../client-form";
import { createClient } from "../actions";

export const metadata: Metadata = { title: "New client" };

export default function NewClientPage() {
  return (
    <div className="mx-auto w-full max-w-lg">
      <Link
        href="/clients"
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm"
      >
        <ChevronLeftIcon className="size-4" />
        Clients
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight">New client</h1>
      <p className="text-muted-foreground mt-1 mb-6 text-sm">
        Only the name and country are required. The rest you can fill in when
        you need it.
      </p>

      <ClientForm action={createClient} submitLabel="Save client" />
    </div>
  );
}
