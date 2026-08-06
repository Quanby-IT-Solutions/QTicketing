"use client";

import { UserPlus } from "lucide-react";

import { createUserAction } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

type CreateUserDialogProject = {
  id: string;
  name: string;
  title: string;
};

export function CreateUserDialog({
  projects,
}: {
  projects: CreateUserDialogProject[];
}) {
  return (
    <Dialog>
      <DialogTrigger render={<Button type="button" />}>
        <UserPlus data-icon="inline-start" />
        Create user
      </DialogTrigger>
      <DialogContent className="flex max-h-[calc(100svh-2rem)] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b p-4 pr-12 sm:p-5 sm:pr-12">
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-4 text-primary" />
            Create approved user
          </DialogTitle>
          <DialogDescription>
            Add an account immediately without the registration approval step.
          </DialogDescription>
        </DialogHeader>

        <form action={createUserAction} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-name">Full name</Label>
                <Input
                  autoFocus
                  id="create-name"
                  name="name"
                  placeholder="Juan Dela Cruz"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-email">Email address</Label>
                <Input
                  id="create-email"
                  name="email"
                  placeholder="juan@company.com"
                  required
                  type="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-password">Temporary password</Label>
                <Input
                  id="create-password"
                  minLength={8}
                  name="password"
                  required
                  type="password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-role">Role</Label>
                <NativeSelect
                  className="w-full"
                  defaultValue="requester"
                  id="create-role"
                  name="role"
                >
                  <NativeSelectOption value="requester">
                    Requester
                  </NativeSelectOption>
                  <NativeSelectOption value="agent">Agent</NativeSelectOption>
                  <NativeSelectOption value="admin">Admin</NativeSelectOption>
                </NativeSelect>
              </div>
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">Project access</legend>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <label
                    className="flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50"
                    key={project.id}
                  >
                    <input
                      className="mt-0.5 size-4 accent-primary"
                      name="projectIds"
                      type="checkbox"
                      value={project.id}
                    />
                    <span className="min-w-0">
                      <span className="block font-mono text-xs font-semibold">
                        {project.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {project.title}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <DialogFooter className="mx-0 mb-0 rounded-none">
            <Button type="submit">
              <UserPlus data-icon="inline-start" />
              Create user
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
