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
import { deleteProject } from "../actions";

export function DeleteProjectButton({
  projectId,
  projectTitle,
}: {
  projectId: string;
  projectTitle: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive">
          <Trash2Icon />
          Delete project
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {projectTitle}?</DialogTitle>
          <DialogDescription>
            Every document created under this project goes with it. Invoices
            you have already sent are better marked cancelled than deleted —
            their numbers are part of your records.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <form action={deleteProject}>
            <input type="hidden" name="projectId" value={projectId} />
            <Button type="submit" variant="destructive" className="w-full">
              Delete project
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
