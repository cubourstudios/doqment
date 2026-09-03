import { NextResponse } from "next/server";

// Placeholder — Stripe webhook handler must read `await req.text()` before
// signature verification once wired (CLAUDE.md §6, known constraint 6).
export async function POST() {
  return NextResponse.json({ received: false, reason: "not yet implemented" }, { status: 501 });
}
