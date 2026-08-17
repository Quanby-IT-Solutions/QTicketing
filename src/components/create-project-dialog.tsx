"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FolderKanban, ImagePlus, LoaderCircle, Plus } from "lucide-react";
import { createProjectAction } from "@/app/actions/projects";
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

export function CreateProjectDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        await createProjectAction(formData);
        form.reset();
        setOpen(false);
        router.refresh();
        toast.add({
          title: "Project created",
          description: `"${formData.get("title")}" is ready for ticket routing.`,
          type: "success",
        });
      } catch (error) {
        toast.add({
          title: "Project not created",
          description:
            error instanceof Error && error.message
              ? error.message
              : "The project could not be created. Please try again.",
          type: "error",
          priority: "high",
        });
      }
    });
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <Button onClick={() => setOpen(true)} type="button">
        <Plus data-icon="inline-start" />
        Add project
      </Button>
      <DialogContent className="flex max-h-[calc(100svh-2rem)] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b p-4 pr-12 sm:p-5 sm:pr-12">
          <DialogTitle className="flex items-center gap-2">
            <FolderKanban className="size-4 text-primary" />
            Create project
          </DialogTitle>
          <DialogDescription>
            Configure a workspace for ticket routing and project access.
          </DialogDescription>
        </DialogHeader>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-4 sm:grid-cols-2 sm:p-5">
            <div className="space-y-2">
              <Label htmlFor="create-project-name">Project code</Label>
              <Input
                className="font-mono uppercase"
                id="create-project-name"
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
              <Label htmlFor="create-project-title">Display name</Label>
              <Input
                id="create-project-title"
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
              <Label htmlFor="create-project-classification">
                Project type
              </Label>
              <NativeSelect
                className="w-full"
                defaultValue="internal"
                id="create-project-classification"
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
              <Label htmlFor="create-project-logo">Project logo</Label>
              <div className="flex items-center gap-2">
                <ImagePlus className="size-4 text-muted-foreground" />
                <Input
                  accept="image/*"
                  id="create-project-logo"
                  name="logo"
                  type="file"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Optional image used to identify this project.
              </p>
            </div>
          </div>
          <DialogFooter className="mx-0 mb-0 rounded-none">
            <Button disabled={isPending} type="submit">
              {isPending ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" />
              ) : (
                <Plus data-icon="inline-start" />
              )}
              {isPending ? "Creating..." : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
