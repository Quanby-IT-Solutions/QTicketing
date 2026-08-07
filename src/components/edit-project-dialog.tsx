"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FolderKanban, LoaderCircle, PencilIcon } from "lucide-react";
import { updateProjectAction } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";

export type EditableProject = {
  id: string;
  name: string;
  title: string;
};

type EditProjectDialogProps = {
  project: EditableProject;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditProjectDialog({
  project,
  open,
  onOpenChange,
}: EditProjectDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    const formData = new FormData(e.currentTarget);
    formData.set("projectId", project.id);

    startTransition(async () => {
      try {
        await updateProjectAction(formData);
        onOpenChange(false);
        router.refresh();
        toast.add({
          title: "Project updated",
          description: `"${formData.get("title")}" has been updated.`,
          type: "success",
        });
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "The project could not be updated. Please try again.";
        toast.add({
          title: "Update failed",
          description: message,
          type: "error",
          priority: "high",
        });
      }
    });
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[calc(100svh-2rem)] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b p-4 pr-12 sm:p-5 sm:pr-12">
          <DialogTitle className="flex items-center gap-2">
            <FolderKanban className="size-4 text-primary" />
            Edit project
          </DialogTitle>
          <DialogDescription>
            Update the project code or display name.
          </DialogDescription>
        </DialogHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 space-y-5 p-4 sm:p-5">
            <div className="space-y-2">
              <Label htmlFor="edit-project-name">Project code</Label>
              <Input
                className="font-mono uppercase"
                defaultValue={project.name}
                id="edit-project-name"
                maxLength={40}
                name="name"
                placeholder="FINANCE"
                required
              />
              <p className="text-xs text-muted-foreground">
                Uppercase letters, numbers, and hyphens.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-project-title">Display name</Label>
              <Input
                defaultValue={project.title}
                id="edit-project-title"
                maxLength={120}
                name="title"
                placeholder="Finance Management System"
                required
              />
              <p className="text-xs text-muted-foreground">
                Shown throughout ticket forms and tables.
              </p>
            </div>
          </div>

          <DialogFooter className="mx-0 mb-0 rounded-none">
            <Button disabled={isPending} type="submit">
              {isPending ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" />
              ) : (
                <PencilIcon data-icon="inline-start" />
              )}
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
