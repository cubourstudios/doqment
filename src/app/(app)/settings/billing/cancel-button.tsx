"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cancelSubscription } from "./actions";

export function CancelButton() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive w-fit">
          Cancel subscription
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel your subscription?</DialogTitle>
          <DialogDescription>
            You keep Pro until the end of the period you have already paid for.
            Your documents and invoices stay exactly where they are either way —
            cancelling never deletes anything.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Keep Pro</Button>
          </DialogClose>
          <form action={cancelSubscription}>
            <Button type="submit" variant="destructive" className="w-full">
              Cancel at period end
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
