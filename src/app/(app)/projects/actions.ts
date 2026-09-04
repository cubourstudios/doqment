"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { clients, projects } from "@/db/schema";
import { requireProfile, requireUser } from "@/lib/auth";
import { projectSchema, projectUpdateSchema } from "@/lib/schemas/project";
import { canCreateProject, getUserPlan } from "@/lib/billing/plans";
import { track } from "@/lib/analytics";

export type ProjectState = { error?: string };

/**
 * Thrown inside the creation transaction, caught below.
 *
 * A sentinel rather than a bare string comparison, so the catch cannot start
 * swallowing an unrelated failure if the message is ever reworded.
 */
const CLIENT_NOT_FOUND = "client not found";

export async function createProject(
  _prevState: ProjectState,
  formData: FormData,
): Promise<ProjectState> {
  const { userId, profile } = await requireProfile();

  // Checked before doing any work, so a blocked user is told why rather than
  // watching a form fail after they filled it in.
  const plan = await getUserPlan(userId);
  const entitlement = await canCreateProject(userId, plan);
  if (!entitlement.allowed) return { error: entitlement.reason };

  const parsed = projectSchema.safeParse({
    title: formData.get("title"),
    clientId: formData.get("clientId") ?? "",
    newClientName: formData.get("newClientName") ?? "",
    newClientCountry: formData.get("newClientCountry") ?? "",
    projectType: formData.get("projectType"),
    valueBand: formData.get("valueBand"),
    startDate: formData.get("startDate") ?? "",
    endDate: formData.get("endDate") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the details." };
  }

  const {
    title,
    clientId,
    newClientName,
    newClientCountry,
    projectType,
    valueBand,
    startDate,
    endDate,
  } = parsed.data;

  let projectId: string;

  try {
    projectId = await db.transaction(async (tx) => {
      let resolvedClientId = clientId || null;

      // A name typed inline creates the client as part of the same transaction:
      // a project that references a client row which failed to insert would be
      // worse than failing outright.
      if (!resolvedClientId && newClientName) {
        const [created] = await tx
          .insert(clients)
          .values({
            userId,
            name: newClientName,
            // Default the client to the user's own country. Most freelance work
            // is domestic, and the guidance engine needs a country to compare.
            country: newClientCountry || profile.country,
          })
          .returning({ id: clients.id });

        resolvedClientId = created.id;
      } else if (resolvedClientId) {
        // Verify the client belongs to this user before linking it. Without RLS
        // on this connection, an id from a tampered form would otherwise attach
        // someone else's client to this project.
        const [owned] = await tx
          .select({ id: clients.id })
          .from(clients)
          .where(
            and(eq(clients.id, resolvedClientId), eq(clients.userId, userId)),
          )
          .limit(1);

        if (!owned) throw new Error(CLIENT_NOT_FOUND);
      }

      const [project] = await tx
        .insert(projects)
        .values({
          userId,
          clientId: resolvedClientId,
          title,
          projectType,
          valueBand,
          startDate: startDate || null,
          endDate: endDate || null,
        })
        .returning({ id: projects.id });

      return project.id;
    });
  } catch (error) {
    /*
     * A client that no longer belongs to the user is an ordinary thing for a
     * form to submit — deleted in another tab, or a page open since before it
     * was removed, with the select still listing it. Thrown out of a server
     * action it reached the user as Next's blank "a server error occurred"
     * page with nothing but an opaque digest on it, taking everything they had
     * typed with it. It is a message about one field, so it is returned as
     * one.
     */
    if (error instanceof Error && error.message === CLIENT_NOT_FOUND) {
      return {
        error: "That client no longer exists. Pick another, or type a new name.",
      };
    }

    throw error;
  }

  // Outside the try: redirect() and revalidatePath() work by throwing, and
  // catching those here would turn a successful creation into an error.
  await track(userId, "project_created", { projectType, valueBand });

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  redirect(`/projects/${projectId}`);
}

export async function updateProject(
  projectId: string,
  _prevState: ProjectState,
  formData: FormData,
): Promise<ProjectState> {
  const user = await requireUser();

  const parsed = projectUpdateSchema.safeParse({
    title: formData.get("title"),
    projectType: formData.get("projectType"),
    valueBand: formData.get("valueBand"),
    status: formData.get("status"),
    startDate: formData.get("startDate") ?? "",
    endDate: formData.get("endDate") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the details." };
  }

  const { title, projectType, valueBand, status, startDate, endDate } =
    parsed.data;

  const updated = await db
    .update(projects)
    .set({
      title,
      projectType,
      valueBand,
      status,
      startDate: startDate || null,
      endDate: endDate || null,
      updatedAt: new Date(),
    })
    .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
    .returning({ id: projects.id });

  if (updated.length === 0) {
    return { error: "That project no longer exists." };
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

export async function deleteProject(formData: FormData) {
  const user = await requireUser();
  const projectId = formData.get("projectId");

  if (typeof projectId !== "string") return;

  await db
    .delete(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)));

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  redirect("/projects");
}
