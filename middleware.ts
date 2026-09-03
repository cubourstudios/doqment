import { NextResponse, type NextRequest } from "next/server";

// Session refresh + route protection — wired to Supabase Auth in the backend
// integration phase (CLAUDE.md §3, §7 D7).
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
