"use client";

import { Trash2Icon } from "lucide-react";

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
import { deleteDocument } from "../actions";

/**
 * Deleting a document.
 *
 * The dialog says plainly that an invoice number is not released, because the
 * expectation people bring from every other tool is that deleting frees the
 * name up. Discovering afterwards that a number is permanently spent — from an
 * accountant, months later — is far worse than reading one sentence now.
 */
export function DeleteDocumentButton({
  documentId,
  title,
  isDraftInvoice,
}: {
  documentId: string;
  title: string;
  isDraftInvoice: boolean;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive">
          <Trash2Icon />
          Delete
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {title}?</DialogTitle>
          <DialogDescription>
            {isDraftInvoice
              ? "This removes it from your documents. The invoice number stays used — numbers are never reissued, so the next invoice takes the following one."
              : "This removes it from your documents and can't be undone."}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Keep it</Button>
          </DialogClose>
          <form action={deleteDocument}>
            <input type="hidden" name="documentId" value={documentId} />
            <Button type="submit" variant="destructive" className="w-full">
              Delete
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
