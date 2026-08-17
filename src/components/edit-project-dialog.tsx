"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  FolderKanban,
  ImagePlus,
  LoaderCircle,
  PencilIcon,
} from "lucide-react";
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
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { toast } from "@/components/ui/toast";

export type EditableProject = {
  id: string;
  name: string;
  title: string;
  logoObjectKey: string | null;
  classification: string;
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
  const [logoPreview, setLogoPreview] = React.useState<string | null>(project.logoObjectKey ? `/api/projects/${project.id}/logo` : null);

  React.useEffect(() => {
    setLogoPreview(project.logoObjectKey ? `/api/projects/${project.id}/logo` : null);
  }, [project.id, project.logoObjectKey]);

  React.useEffect(() => () => { if (logoPreview?.startsWith("blob:")) URL.revokeObjectURL(logoPreview); }, [logoPreview]);

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setLogoPreview(file ? URL.createObjectURL(file) : project.logoObjectKey ? `/api/projects/${project.id}/logo` : null);
  }

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
      <DialogContent className="flex max-h-[calc(100svh-2rem)] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b p-4 pr-12 sm:p-5 sm:pr-12">
          <DialogTitle className="flex items-center gap-2">
            <FolderKanban className="size-4 text-primary" />
            Edit project
          </DialogTitle>
          <DialogDescription>
            Update the workspace details, branding, and delivery type.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          key={project.id}
          onSubmit={handleSubmit}
        >
          <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-4 sm:grid-cols-2 sm:p-5">
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
            <div className="space-y-2">
              <Label htmlFor="edit-project-classification">Project type</Label>
              <NativeSelect
                className="w-full"
                defaultValue={project.classification}
                id="edit-project-classification"
                name="classification"
              >
                <NativeSelectOption value="white-label">
                  White Label
                </NativeSelectOption>
                <NativeSelectOption value="custom">
                  Custom / Bespoke
                </NativeSelectOption>
                <NativeSelectOption value="internal">
                  Internal
                </NativeSelectOption>
                <NativeSelectOption value="product">Product</NativeSelectOption>
              </NativeSelect>
              <p className="text-xs text-muted-foreground">
                How this system is delivered and branded.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-project-logo">Project logo</Label>
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground">
                  {logoPreview ? <img alt="Project logo preview" className="size-full object-cover" src={logoPreview} /> : <ImagePlus className="size-4" />}
                </span>
                <Input
                  accept="image/*"
                  id="edit-project-logo"
                  name="logo"
                  onChange={handleLogoChange}
                  type="file"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Optional. Choosing a new image replaces the current logo.
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
