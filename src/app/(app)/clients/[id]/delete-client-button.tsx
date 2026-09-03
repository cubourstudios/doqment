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
import { deleteClient } from "../actions";

/**
 * Deleting a client is confirmed rather than immediate, and the dialog says
 * plainly what happens to their projects: they survive, because a project's
 * documents and invoice history are records the user may need at tax time long
 * after the working relationship ended.
 */
export function DeleteClientButton({
  clientId,
  clientName,
  projectCount,
}: {
  clientId: string;
  clientName: string;
  projectCount: number;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive">
          <Trash2Icon />
          Delete client
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {clientName}?</DialogTitle>
          <DialogDescription>
            {projectCount > 0
              ? `Their ${projectCount} project${projectCount === 1 ? "" : "s"} and every document in ${projectCount === 1 ? "it" : "them"} will be kept — they just won't be linked to a client any more.`
              : "This can't be undone."}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <form action={deleteClient}>
            <input type="hidden" name="clientId" value={clientId} />
            <Button type="submit" variant="destructive" className="w-full">
              Delete client
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
