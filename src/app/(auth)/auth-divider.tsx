/**
 * The "or" rule between the Google button and the email form. Shared so the
 * two pages that use it cannot drift apart by a pixel of rule thickness.
 */
export function AuthDivider() {
  return (
    <div className="flex items-center gap-4" aria-hidden>
      <span className="bg-border h-px flex-1" />
      <span className="text-muted-foreground text-base">or</span>
      <span className="bg-border h-px flex-1" />
    </div>
  );
}
