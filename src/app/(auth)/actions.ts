"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/schemas/auth";

export type AuthActionState = {
  error?: string;
  /** Set after signup so the page can switch to "check your email". */
  emailSent?: boolean;
};

/**
 * Where Supabase should send the user back to after email confirmation or
 * OAuth.
 *
 * The order here matters and is not obvious:
 *
 * 1. A Vercel preview deployment gets a unique hostname that cannot be known
 *    when the environment variable is set, so the configured production URL
 *    would bounce anyone testing a preview over to production — signing them
 *    in to the wrong environment.
 * 2. Otherwise the configured URL wins. It is set by whoever deploys the app
 *    and cannot be influenced by a request.
 * 3. The host header is the last resort, for local development. It is
 *    attacker-controlled, so trusting it ahead of configuration would let a
 *    forged Host redirect an auth code to another origin. Supabase checks
 *    redirect targets against its own allowlist as well, but defence in depth
 *    is cheap here.
 */
async function getAppUrl() {
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, "");

  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  return host ? `${protocol}://${host}` : "http://localhost:3000";
}

/**
 * Throttle by caller IP.
 *
 * Server actions have no Request to hand to clientKey(), so the forwarded
 * header is read from the request scope instead. Signup and password reset
 * both send mail on an anonymous caller's say-so, which is the spam vector
 * LIMITS.auth exists for.
 */
async function limitByIp(scope: string) {
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  return rateLimit(
    `${scope}:${ip}`,
    LIMITS.auth.limit,
    LIMITS.auth.windowSeconds,
  );
}

const TOO_MANY_ATTEMPTS = "Too many attempts just now. Try again in a few minutes.";

/**
 * Login and signup failures are reported in general terms on purpose: telling
 * an anonymous caller whether an address is registered turns the login form
 * into an account-enumeration oracle.
 */
const GENERIC_CREDENTIALS_ERROR =
  "That email and password combination didn't work.";

export async function signup(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  if (!(await limitByIp("signup")).allowed) {
    return { error: TOO_MANY_ATTEMPTS };
  }

  const supabase = await createClient();
  const appUrl = await getAppUrl();

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { name: parsed.data.name },
      emailRedirectTo: `${appUrl}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Email confirmation stays on as spam defence, so there is no session yet.
  return { emailSent: true };
}

export async function login(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: GENERIC_CREDENTIALS_ERROR };
  }

  const next = formData.get("next");
  const destination =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/dashboard";

  revalidatePath("/", "layout");
  redirect(destination);
}

export async function signInWithGoogle(formData: FormData) {
  const supabase = await createClient();
  const appUrl = await getAppUrl();

  const next = formData.get("next");
  const nextParam =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? `?next=${encodeURIComponent(next)}`
      : "";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${appUrl}/auth/callback${nextParam}` },
  });

  if (error || !data.url) {
    redirect(`/login?error=${encodeURIComponent("Google sign-in failed.")}`);
  }

  redirect(data.url);
}

export async function requestPasswordReset(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your email." };
  }

  // Reported as success below whether or not the address exists, so the
  // throttle is what stops this being a free mail cannon at any address.
  if (!(await limitByIp("password-reset")).allowed) {
    return { emailSent: true };
  }

  const supabase = await createClient();
  const appUrl = await getAppUrl();

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
  });

  // Always report success, whether or not the address is registered — same
  // enumeration concern as the login form.
  return { emailSent: true };
}

export async function resetPassword(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your password." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "That reset link has expired. Request a new one and try again.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
