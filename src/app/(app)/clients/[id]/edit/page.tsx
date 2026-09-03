import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ChevronLeftIcon } from "lucide-react";

import { db } from "@/db";
import { clients } from "@/db/schema";
import { requireUser } from "@/lib/auth";

import { ClientForm } from "../../client-form";
import { updateClient } from "../../actions";

export const metadata: Metadata = { title: "Edit client" };

export default async function EditClientPage({
  params,
}: PageProps<"/clients/[id]/edit">) {
  const { id } = await params;
  const user = await requireUser();

  const [client] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.userId, user.id)))
    .limit(1);

  if (!client) notFound();

  const address = (client.addressJson as { lines?: string[] } | null)?.lines;

  // Bind the id server-side rather than posting it in a hidden field — a form
  // field is user-controlled, and this decides which row gets written.
  const action = updateClient.bind(null, client.id);

  return (
    <div className="mx-auto w-full max-w-lg">
      <Link
        href={`/clients/${client.id}`}
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm"
      >
        <ChevronLeftIcon className="size-4" />
        {client.name}
      </Link>

      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        Edit client
      </h1>

      <ClientForm
        action={action}
        submitLabel="Save changes"
        defaults={{
          name: client.name,
          company: client.company,
          email: client.email,
          country: client.country,
          taxId: client.taxId,
          address: address?.join("\n") ?? "",
        }}
      />
    </div>
  );
}
