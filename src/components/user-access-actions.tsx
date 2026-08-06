"use client";

import * as React from "react";
import { Save, ShieldCheck, UserCog } from "lucide-react";

import { updateUserAccessAction } from "@/app/actions/users";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import type { UserRole, UserStatus } from "@/db/schema";

type ProjectOption = {
  id: string;
  name: string;
  title: string;
};

export type ManageableUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  active: boolean;
  projectIds: string[];
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function UserAccessActions({
  projects,
  user,
}: {
  projects: ProjectOption[];
  user: ManageableUser;
}) {
  const [open, setOpen] = React.useState(false);
  const userAccess = new Set(user.projectIds);
  const roleId = `role-${user.id}`;
  const statusId = `status-${user.id}`;

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        type="button"
        variant="outline"
      >
        <UserCog data-icon="inline-start" />
        View permissions
      </Button>

      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent className="flex max-h-[calc(100svh-2rem)] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
          <DialogHeader className="border-b p-4 pr-12 sm:p-5 sm:pr-12">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar>
                <AvatarFallback>{initials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <DialogTitle className="truncate">{user.name}</DialogTitle>
                <DialogDescription className="truncate">
                  {user.email}
                </DialogDescription>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <Badge variant="outline">
                  {user.active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          <form action={updateUserAccessAction} className="flex min-h-0 flex-1 flex-col">
            <input name="userId" type="hidden" value={user.id} />
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                <div className="space-y-2">
                  <Label htmlFor={roleId}>Role</Label>
                  <NativeSelect
                    className="w-full"
                    defaultValue={user.role}
                    id={roleId}
                    name="role"
                  >
                    <NativeSelectOption value="requester">Requester</NativeSelectOption>
                    <NativeSelectOption value="agent">Agent</NativeSelectOption>
                    <NativeSelectOption value="admin">Admin</NativeSelectOption>
                  </NativeSelect>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={statusId}>Approval status</Label>
                  <NativeSelect
                    className="w-full"
                    defaultValue={user.status}
                    id={statusId}
                    name="status"
                  >
                    <NativeSelectOption value="pending">Pending</NativeSelectOption>
                    <NativeSelectOption value="approved">Approved</NativeSelectOption>
                    <NativeSelectOption value="rejected">Rejected</NativeSelectOption>
                  </NativeSelect>
                </div>
                <label className="flex h-8 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm">
                  <input
                    className="size-4 accent-primary"
                    defaultChecked={user.active}
                    name="active"
                    type="checkbox"
                  />
                  Active account
                </label>
              </div>

              <fieldset className="space-y-3">
                <legend className="flex items-center gap-2 text-sm font-medium">
                  <ShieldCheck className="size-4 text-muted-foreground" />
                  Project access
                </legend>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {projects.map((project) => (
                    <label
                      className="flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50"
                      key={project.id}
                    >
                      <input
                        className="mt-0.5 size-4 accent-primary"
                        defaultChecked={userAccess.has(project.id)}
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
                <Save data-icon="inline-start" />
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
