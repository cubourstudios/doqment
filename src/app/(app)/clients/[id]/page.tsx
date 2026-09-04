import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";
import { ChevronLeftIcon, PencilIcon } from "lucide-react";

import { db } from "@/db";
import { clients, documents, invoices, projects } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getCountryConfig } from "@/lib/regions";
import {
  INVOICE_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
} from "@/lib/labels";
import { formatDecimal, formatMinor, fromDecimalString } from "@/lib/invoice/money";
import type { invoiceStatusEnum } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { DeleteClientButton } from "./delete-client-button";

export const metadata: Metadata = { title: "Client" };

export default async function ClientPage({
  params,
}: PageProps<"/clients/[id]">) {
  const { id } = await params;
  const user = await requireUser();

  const [client] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.userId, user.id)))
    .limit(1);

  if (!client) notFound();

  const clientInvoices = await db
    .select({
      documentId: invoices.documentId,
      invoiceNumber: invoices.invoiceNumber,
      total: invoices.total,
      currency: invoices.currency,
      status: invoices.status,
      issueDate: invoices.issueDate,
    })
    .from(invoices)
    .innerJoin(documents, eq(invoices.documentId, documents.id))
    .innerJoin(projects, eq(documents.projectId, projects.id))
    .where(
      and(
        eq(invoices.userId, user.id),
        eq(projects.clientId, id),
        isNull(documents.deletedAt),
      ),
    )
    .orderBy(desc(invoices.issueDate));

  const clientProjects = await db
    .select()
    .from(projects)
    .where(and(eq(projects.clientId, id), eq(projects.userId, user.id)))
    .orderBy(desc(projects.createdAt));

  /*
   * What this client owes, counted the same way the dashboard counts it:
   * anything issued and not yet settled. Drafts are excluded because they have
   * not been sent, and cancelled ones because they never will be.
   *
   * Summed per currency rather than across all of them — adding rupees to
   * dollars would produce a confident wrong number, and a client billed in two
   * currencies is not unusual for the freelancers this is built for.
   */
  const outstandingByCurrency = new Map<string, bigint>();

  for (const invoice of clientInvoices) {
    if (["draft", "paid", "cancelled"].includes(invoice.status)) continue;

    outstandingByCurrency.set(
      invoice.currency,
      (outstandingByCurrency.get(invoice.currency) ?? 0n) +
        fromDecimalString(invoice.total, invoice.currency),
    );
  }

  const address = (client.addressJson as { lines?: string[] } | null)?.lines;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link
        href="/clients"
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm"
      >
        <ChevronLeftIcon className="size-4" />
        Clients
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {client.name}
          </h1>
          {client.company ? (
            <p className="text-muted-foreground truncate">{client.company}</p>
          ) : null}
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/clients/${client.id}/edit`}>
            <PencilIcon />
            Edit
          </Link>
        </Button>
      </div>

      {outstandingByCurrency.size > 0 ? (
        <Card className="mt-6">
          <CardContent className="px-4">
            <p className="text-muted-foreground text-sm">Owed by this client</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              {[...outstandingByCurrency].map(([currency, amount]) => (
                <p
                  key={currency}
                  className="text-2xl font-semibold tabular-nums"
                >
                  {formatMinor(amount, currency)}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <Detail label="Country" value={getCountryConfig(client.country).name} />
          {client.email ? <Detail label="Email" value={client.email} /> : null}
          {client.taxId ? <Detail label="Tax ID" value={client.taxId} /> : null}
          {address?.length ? (
            <Detail label="Address" value={address.join(", ")} />
          ) : null}
        </CardContent>
      </Card>

      <section className="mt-6">
        <h2 className="mb-3 font-semibold">
          Projects{clientProjects.length ? ` (${clientProjects.length})` : ""}
        </h2>

        {clientProjects.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
            No projects with this client yet.
          </p>
        ) : (
          <ul className="grid gap-2">
            {clientProjects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  className="hover:bg-accent flex min-h-16 items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {project.title}
                    </span>
                    <span className="text-muted-foreground block truncate text-sm">
                      {PROJECT_TYPE_LABELS[project.projectType]}
                    </span>
                  </span>
                  <Badge variant="secondary">
                    {PROJECT_STATUS_LABELS[project.status]}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {clientInvoices.length > 0 ? (
        <section className="mt-6">
          <h2 className="mb-3 font-semibold">
            Invoices ({clientInvoices.length})
          </h2>

          <ul className="grid gap-2">
            {clientInvoices.map((invoice) => (
              <li key={invoice.documentId}>
                <Link
                  href={`/documents/${invoice.documentId}`}
                  className="hover:bg-accent flex min-h-16 items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {invoice.invoiceNumber}
                    </span>
                    <span className="text-muted-foreground block truncate text-sm">
                      {invoice.issueDate}
                    </span>
                  </span>

                  <span className="flex shrink-0 items-center gap-3">
                    <span className="font-medium tabular-nums">
                      {formatDecimal(invoice.total, invoice.currency)}
                    </span>
                    <Badge
                      variant={
                        invoice.status === "paid"
                          ? "success"
                          : invoice.status === "overdue"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {
                        INVOICE_STATUS_LABELS[
                          invoice.status as (typeof invoiceStatusEnum.enumValues)[number]
                        ]
                      }
                    </Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-10">
        <DeleteClientButton
          clientId={client.id}
          clientName={client.name}
          projectCount={clientProjects.length}
        />
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
