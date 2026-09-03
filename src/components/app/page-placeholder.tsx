import type { LucideIcon } from "lucide-react";

/**
 * Empty-state scaffold for sections whose features land in a later phase.
 *
 * These routes are reachable from the tab bar from day one, so they need to say
 * something truthful rather than 404. Each is replaced by the real screen as
 * its phase lands.
 */
export function PagePlaceholder({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-8 grid place-items-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center">
        <Icon className="text-muted-foreground size-8" />
        <p className="text-muted-foreground max-w-sm text-sm">{description}</p>
      </div>
    </div>
  );
}
