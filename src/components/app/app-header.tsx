import Link from "next/link";
import {LogOutIcon, UserIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/app/(auth)/actions";
import { DoqmentMark } from "@/components/brand/logo";

/**
 * Sticky top bar. On mobile it carries the wordmark and the account menu; the
 * page title lives in the page itself, so it can scroll away and give the
 * content the full screen.
 */
export function AppHeader({
  name,
  email,
}: {
  name: string | null;
  email: string | undefined;
}) {
  return (
    <header className="bg-background/95 safe-top sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b px-4 backdrop-blur">
      <Link href="/dashboard" className="flex items-center gap-2 font-semibold md:hidden">
        <DoqmentMark className="text-primary size-5 shrink-0" />
        Doqment
      </Link>

      <div className="hidden md:block" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Account menu">
            <UserIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="grid gap-0.5">
            <span className="truncate font-medium">{name ?? "Your account"}</span>
            {email ? (
              <span className="text-muted-foreground truncate text-xs font-normal">
                {email}
              </span>
            ) : null}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings">Settings</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild variant="destructive">
            {/* A form, not a link: signing out is a mutation, and a GET that
                logs you out can be triggered by any image tag on the web. */}
            <form action={logout}>
              <button type="submit" className="flex w-full items-center gap-2">
                <LogOutIcon />
                Sign out
              </button>
            </form>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
