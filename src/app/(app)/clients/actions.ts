"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { clients } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { clientSchema } from "@/lib/schemas/client";

export type ClientState = { error?: string };

function parse(formData: FormData) {
  return clientSchema.safeParse({
    name: formData.get("name"),
    company: formData.get("company") ?? "",
    email: formData.get("email") ?? "",
    country: formData.get("country"),
    taxId: formData.get("taxId") ?? "",
    address: formData.get("address") ?? "",
  });
}

export async function createClient(
  _prevState: ClientState,
  formData: FormData,
): Promise<ClientState> {
  const user = await requireUser();
  const parsed = parse(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the details." };
  }

  const { name, company, email, country, taxId, address } = parsed.data;

  const [created] = await db
    .insert(clients)
    .values({
      userId: user.id,
      name,
      company: company || null,
      email: email || null,
      country,
      taxId: taxId || null,
      addressJson: address ? { lines: address.split("\n") } : null,
    })
    .returning({ id: clients.id });

  revalidatePath("/clients");
  redirect(`/clients/${created.id}`);
}

export async function updateClient(
  clientId: string,
  _prevState: ClientState,
  formData: FormData,
): Promise<ClientState> {
  const user = await requireUser();
  const parsed = parse(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the details." };
  }

  const { name, company, email, country, taxId, address } = parsed.data;

  // The userId in the where clause is the authorisation check, not a filter:
  // this connection bypasses RLS, so without it any client id would be
  // editable by anyone who could guess it.
  const updated = await db
    .update(clients)
    .set({
      name,
      company: company || null,
      email: email || null,
      country,
      taxId: taxId || null,
      addressJson: address ? { lines: address.split("\n") } : null,
      updatedAt: new Date(),
    })
    .where(and(eq(clients.id, clientId), eq(clients.userId, user.id)))
    .returning({ id: clients.id });

  if (updated.length === 0) {
    return { error: "That client no longer exists." };
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}`);
}

export async function deleteClient(formData: FormData) {
  const user = await requireUser();
  const clientId = formData.get("clientId");

  if (typeof clientId !== "string") return;

  // Projects reference clients with ON DELETE SET NULL, so removing a client
  // never takes their project history with it.
  await db
    .delete(clients)
    .where(and(eq(clients.id, clientId), eq(clients.userId, user.id)));

  revalidatePath("/clients");
  redirect("/clients");
}
