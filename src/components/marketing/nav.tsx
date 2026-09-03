import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

// Primary nav per docs/design-system.md §9: 74px, white, sticky, logo-left,
// right-aligned Login (outline) + Sign Up (solid primary). Simplified for a
// single marketing page — no mega-menu, since there's nothing to hang one on.
export function Nav() {
  return (
    <header className="sticky top-0 z-40 h-[64px] w-full bg-surface md:h-[74px]">
      <Container className="flex h-full items-center justify-between">
        <Link href="/" className="font-body text-lg font-semibold text-heading">
          Doqment
        </Link>
        <div className="flex items-center gap-2 md:gap-3">
          <Link
            href="/login"
            className={buttonVariants({ variant: "text", size: "sm", className: "hidden sm:inline-flex" })}
          >
            Login
          </Link>
          <Link href="/signup" className={buttonVariants({ variant: "primary", size: "sm" })}>
            Sign up
          </Link>
        </div>
      </Container>
    </header>
  );
}
