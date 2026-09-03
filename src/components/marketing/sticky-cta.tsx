import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

// Primary CTA pattern per CLAUDE.md §2.3: fixed full-width button in the thumb
// zone on mobile; on desktop the CTAs are already inline in Hero/FinalCTA, so
// this bar disappears entirely at md:.
export function StickyCta() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-heading/10 bg-surface p-3 shadow-sticky-bar md:hidden">
      <Link href="/onboarding" className={buttonVariants({ variant: "primary", className: "w-full" })}>
        Check what my project needs, free
      </Link>
    </div>
  );
}
