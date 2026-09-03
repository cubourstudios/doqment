import { and, count, eq, gte, isNull } from "drizzle-orm";

import { db } from "@/db";
import { documents, profiles, projects } from "@/db/schema";

/**
 * Plan entitlements.
 *
 * One helper answers "what may this user do", and every gate in the product
 * calls it. Scattering plan checks is how a paying customer ends up blocked by
 * a limit someone forgot to update — and how a free user quietly gets a paid
 * feature.
 */

export type Plan = "free" | "pro";

export type PlanLimits = {
  maxProjects: number | null;
  maxDocumentsPerMonth: number | null;
  watermark: boolean;
  maxUploadBytes: number;
};

const LIMITS: Record<Plan, PlanLimits> = {
  free: {
    maxProjects: 3,
    maxDocumentsPerMonth: 5,
    // The watermark is what makes Free genuinely usable but not quite
    // presentable to a client — the honest version of a trial.
    watermark: true,
    maxUploadBytes: 5 * 1024 * 1024,
  },
  pro: {
    maxProjects: null,
    maxDocumentsPerMonth: null,
    watermark: false,
    maxUploadBytes: 25 * 1024 * 1024,
  },
};

export function limitsFor(plan: Plan): PlanLimits {
  return LIMITS[plan];
}

/**
 * The user's effective plan.
 *
 * A lapsed `plan_expires_at` downgrades regardless of what the column says,
 * because webhooks are missed and provider APIs go down. Expiry is set to the
 * period end plus a three-day grace, so an in-flight renewal payment does not
 * lock someone out of their own invoices.
 */
export async function getUserPlan(userId: string): Promise<Plan> {
  const [profile] = await db
    .select({ plan: profiles.plan, expiresAt: profiles.planExpiresAt })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  if (!profile || profile.plan !== "pro") return "free";
  if (profile.expiresAt && profile.expiresAt < new Date()) return "free";

  return "pro";
}

export type Entitlement = {
  allowed: boolean;
  /** Shown to the user. Names the limit rather than saying "upgrade". */
  reason?: string;
};

export async function canCreateProject(
  userId: string,
  plan: Plan,
): Promise<Entitlement> {
  const { maxProjects } = limitsFor(plan);
  if (maxProjects === null) return { allowed: true };

  const [row] = await db
    .select({ value: count() })
    .from(projects)
    .where(eq(projects.userId, userId));

  const existing = row?.value ?? 0;

  return existing < maxProjects
    ? { allowed: true }
    : {
        allowed: false,
        reason: `The free plan covers ${maxProjects} projects. Archive one, or upgrade for unlimited.`,
      };
}

export async function canCreateDocument(
  userId: string,
  plan: Plan,
): Promise<Entitlement> {
  const { maxDocumentsPerMonth } = limitsFor(plan);
  if (maxDocumentsPerMonth === null) return { allowed: true };

  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  // Soft-deleted documents still count. Otherwise the limit is trivially
  // bypassed by deleting and recreating, and an invoice number was consumed
  // either way.
  const [row] = await db
    .select({ value: count() })
    .from(documents)
    .where(
      and(eq(documents.userId, userId), gte(documents.createdAt, startOfMonth)),
    );

  const used = row?.value ?? 0;

  return used < maxDocumentsPerMonth
    ? { allowed: true }
    : {
        allowed: false,
        reason: `You've created ${used} of ${maxDocumentsPerMonth} documents this month on the free plan. Upgrade for unlimited.`,
      };
}

/** Counts for the billing screen, so the user sees where they actually stand. */
export async function getUsage(userId: string) {
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const [projectRow, documentRow] = await Promise.all([
    db
      .select({ value: count() })
      .from(projects)
      .where(eq(projects.userId, userId)),
    db
      .select({ value: count() })
      .from(documents)
      .where(
        and(
          eq(documents.userId, userId),
          gte(documents.createdAt, startOfMonth),
          isNull(documents.deletedAt),
        ),
      ),
  ]);

  return {
    projects: projectRow[0]?.value ?? 0,
    documentsThisMonth: documentRow[0]?.value ?? 0,
  };
}
