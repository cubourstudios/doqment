import { NextResponse } from "next/server";

// Placeholder — OAuth + email-confirm exchange wiring happens in the backend
// integration phase (CLAUDE.md §7, D7 / known constraint §6).
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  return NextResponse.redirect(origin);
}
