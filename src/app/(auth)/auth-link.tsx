import Link from "next/link";

/**
 * The secondary links around an auth form — "Create an account", "Back to sign
 * in", "Forgot?", the terms and privacy links under the signup button.
 *
 * They exist as a shared piece for one reason: as plain inline anchors they
 * were 15-17px tall tap targets, which on a phone is a coin-flip between the
 * link and the whitespace around it. Here every one of them is a 44px target
 * with its own hover surface and focus ring.
 *
 * The padding is real rather than pulled back with a negative margin: a
 * negative margin would let the 44px box bleed into the field below it, so two
 * targets that look 8px apart would in fact overlap.
 */
export function AuthLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`hover:bg-accent focus-visible:ring-ring/50 inline-flex min-h-11 items-center rounded-md px-3 text-base font-medium underline underline-offset-4 transition-colors focus-visible:ring-[3px] focus-visible:outline-none ${className ?? ""}`}
    >
      {children}
    </Link>
  );
}
