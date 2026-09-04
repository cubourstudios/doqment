"use client";

import { useFormStatus } from "react-dom";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Submit button that disables itself while its form is in flight. Worth having
 * as a shared piece: a double-tapped submit on a flaky mobile connection is the
 * easiest way to create two of something.
 *
 * Variant and size are forwarded so a secondary action can use this without
 * losing the in-flight guard — the alternative is a plain Button that can be
 * double-submitted, which defeats the point of having this at all.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className,
  variant,
  size = "lg",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className ?? "w-full"}
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2Icon className="animate-spin" />
          {pendingLabel ?? "Working…"}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
