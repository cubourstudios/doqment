import { NextResponse } from "next/server";

// Placeholder — Razorpay webhook signature verification is wired in the
// backend integration phase (CLAUDE.md §6, known constraint 5).
export async function POST() {
  return NextResponse.json({ received: false, reason: "not yet implemented" }, { status: 501 });
}
