"use client";

import { useFormStatus } from "react-dom";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Submit button that disables itself while its form is in flight. Worth having
 * as a shared piece: a double-tapped submit on a flaky mobile connection is the
 * easiest way to create two of something.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="lg"
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
