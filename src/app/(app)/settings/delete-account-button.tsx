"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { deleteAccount } from "./danger-actions";

/**
 * Account deletion.
 *
 * Requires typing DELETE rather than a single confirming click. This removes
 * every invoice the user has ever issued — records they may legally need to
 * keep — and is not recoverable, so a mis-tap should not be able to do it.
 */
export function DeleteAccountButton() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive w-fit">
          Delete account
        </Button>
      </DialogTrigger>

      <DialogContent>
        <form action={deleteAccount}>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This removes every project, document, invoice and uploaded file
              permanently. It cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 grid gap-2">
            <p className="text-muted-foreground text-sm">
              Export your data first if you might need your invoice history —
              tax rules in most countries expect you to keep it.
            </p>
            <Label htmlFor="confirm">Type DELETE to confirm</Label>
            <Input
              id="confirm"
              name="confirm"
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="DELETE"
              required
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Keep my account
              </Button>
            </DialogClose>
            <Button type="submit" variant="destructive" className="w-full">
              Delete permanently
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
