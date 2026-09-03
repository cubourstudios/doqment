/**
 * A failed sign-in message.
 *
 * Given a tinted box rather than a line of red text: on a form of four
 * identical-looking fields, an unboxed sentence in the flow is easy to scroll
 * straight past, and the one thing a user who just failed to sign in needs is
 * to see why.
 */
export function AuthError({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-base"
    >
      {children}
    </p>
  );
}
