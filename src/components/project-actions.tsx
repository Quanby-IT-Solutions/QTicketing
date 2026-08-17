"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  LoaderCircle,
  PencilIcon,
  PowerIcon,
  Trash2Icon,
} from "lucide-react";
import {
  deleteProjectAction,
  toggleProjectActiveAction,
} from "@/app/actions/projects";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import {
  EditProjectDialog,
  type EditableProject,
} from "@/components/edit-project-dialog";
import { EllipsisVerticalIcon } from "lucide-react";

export type ProjectActionsProject = {
  id: string;
  name: string;
  title: string;
  logoObjectKey: string | null;
  active: boolean;
};

export function ProjectActions({ project }: { project: ProjectActionsProject }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  function handleToggleActive() {
    if (isPending) return;

    const formData = new FormData();
    formData.set("projectId", project.id);

    startTransition(async () => {
      try {
        await toggleProjectActiveAction(formData);
        router.refresh();
        toast.add({
          title: project.active ? "Project deactivated" : "Project activated",
          description: `"${project.title}" is now ${project.active ? "inactive" : "active"}.`,
          type: "success",
        });
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Could not update project status. Please try again.";
        toast.add({
          title: "Status update failed",
          description: message,
          type: "error",
          priority: "high",
        });
      }
    });
  }

  function handleDelete() {
    if (isPending) return;

    const formData = new FormData();
    formData.set("projectId", project.id);

    startTransition(async () => {
      try {
        await deleteProjectAction(formData);
        setDeleteOpen(false);
        router.refresh();
        toast.add({
          title: "Project deleted",
          description: `"${project.title}" has been permanently deleted.`,
          type: "success",
        });
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "The project could not be deleted. Please try again.";
        toast.add({
          title: "Deletion failed",
          description: message,
          type: "error",
          priority: "high",
        });
      }
    });
  }

  const editableProject: EditableProject = {
    id: project.id,
    name: project.name,
    title: project.title,
    logoObjectKey: project.logoObjectKey,
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label={`Open actions for project ${project.name}`}
              size="icon-sm"
              type="button"
              variant="ghost"
            />
          }
        >
          <EllipsisVerticalIcon aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Project actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <PencilIcon aria-hidden="true" />
              Edit project
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleToggleActive} disabled={isPending}>
              <PowerIcon aria-hidden="true" />
              {project.active ? "Deactivate" : "Activate"}
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setDeleteOpen(true)} variant="destructive">
              <Trash2Icon aria-hidden="true" />
              Delete project
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditProjectDialog
        onOpenChange={setEditOpen}
        open={editOpen}
        project={editableProject}
      />

      <AlertDialog onOpenChange={setDeleteOpen} open={deleteOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2Icon aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle>
              Delete &ldquo;{project.title}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the project and removes all associated
              user access. Tickets routed to this project will lose their project
              assignment. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={handleDelete}
              variant="destructive"
            >
              {isPending ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" />
              ) : (
                <Trash2Icon aria-hidden="true" />
              )}
              {isPending ? "Deleting..." : "Delete project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
