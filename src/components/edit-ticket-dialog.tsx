"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDaysIcon,
  FileUpIcon,
  LoaderCircleIcon,
  PencilIcon,
  SaveIcon,
} from "lucide-react";
import { updateTicketAction } from "@/app/actions/tickets";
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
import { DatePicker } from "@/components/ui/date-picker";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { TicketPriority, TicketStatus, UserRole } from "@/db/schema";

export type EditableTicket = {
  id: string;
  ticketNumber: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  assigneeId?: string | null;
  category: string;
  department?: string | null;
  location?: string | null;
  dueDate?: Date | string | null;
};

export type EditableTicketAssignee = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

type EditTicketDialogProps = {
  ticket: EditableTicket;
  assigneeOptions?: EditableTicketAssignee[];
  triggerLabel?: string;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
};

function formatDueDate(value: EditableTicket["dueDate"]) {
  if (!value) return "";

  if (typeof value === "string") {
    const dateOnly = value.match(/^(\d{4}-\d{2}-\d{2})(?:T|$)/)?.[1];
    if (dateOnly) return dateOnly;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "The ticket could not be updated. Please review the fields and try again.";
}

export function EditTicketDialog({
  ticket,
  assigneeOptions = [],
  triggerLabel = "Edit ticket",
  className,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: EditTicketDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const formRef = React.useRef<HTMLFormElement>(null);
  const fieldPrefix = React.useId().replace(/:/g, "");
  const fieldId = (field: string) => `${fieldPrefix}-${field}`;

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setError(null);
      formRef.current?.reset();
    }
    if (controlledOpen === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        await updateTicketAction(formData);
        handleOpenChange(false);
        router.refresh();
      } catch (submitError) {
        setError(errorMessage(submitError));
      }
    });
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      {!hideTrigger ? (
        <DialogTrigger
          render={
            <Button className={className} type="button" variant="outline" />
          }
        >
          <PencilIcon data-icon="inline-start" />
          {triggerLabel}
        </DialogTrigger>
      ) : null}

      <DialogContent className="flex max-h-[calc(100svh-1rem)] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-h-[calc(100svh-2rem)] sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b p-4 pr-12 sm:p-5 sm:pr-12">
          <DialogTitle>Edit ticket #{ticket.ticketNumber}</DialogTitle>
          <DialogDescription>
            Update the request details, classification, or supporting files.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          encType="multipart/form-data"
          onSubmit={handleSubmit}
          ref={formRef}
        >
          <input name="ticketId" type="hidden" value={ticket.id} />

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor={fieldId("title")}>Title</Label>
                <Input
                  autoFocus
                  defaultValue={ticket.title}
                  disabled={isPending}
                  id={fieldId("title")}
                  maxLength={160}
                  minLength={3}
                  name="title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={fieldId("description")}>Description</Label>
                <Textarea
                  className="min-h-32 resize-y"
                  defaultValue={ticket.description}
                  disabled={isPending}
                  id={fieldId("description")}
                  minLength={10}
                  name="description"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Include the impact, expected result, and any useful context.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={fieldId("status")}>Status</Label>
                  <NativeSelect
                    className="w-full"
                    defaultValue={ticket.status}
                    disabled={isPending}
                    id={fieldId("status")}
                    name="status"
                  >
                    <NativeSelectOption value="pending">Pending</NativeSelectOption>
                    <NativeSelectOption value="ongoing">Ongoing</NativeSelectOption>
                    <NativeSelectOption value="done">Done</NativeSelectOption>
                  </NativeSelect>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={fieldId("priority")}>Priority</Label>
                  <NativeSelect
                    className="w-full"
                    defaultValue={ticket.priority}
                    disabled={isPending}
                    id={fieldId("priority")}
                    name="priority"
                  >
                    <NativeSelectOption value="low">Low</NativeSelectOption>
                    <NativeSelectOption value="normal">Normal</NativeSelectOption>
                    <NativeSelectOption value="high">High</NativeSelectOption>
                  </NativeSelect>
                </div>
              </div>

              {assigneeOptions.length > 0 ? (
                <div className="space-y-2">
                  <Label htmlFor={fieldId("assigneeId")}>Assignee</Label>
                  <NativeSelect
                    className="w-full"
                    defaultValue={ticket.assigneeId ?? ""}
                    disabled={isPending}
                    id={fieldId("assigneeId")}
                    name="assigneeId"
                  >
                    <NativeSelectOption value="">Unassigned</NativeSelectOption>
                    {assigneeOptions.map((assignee) => (
                      <NativeSelectOption key={assignee.id} value={assignee.id}>
                        {assignee.name} ({assignee.role})
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <p className="text-xs text-muted-foreground">
                    Assign this ticket to an approved admin or agent with project access.
                  </p>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor={fieldId("category")}>Category</Label>
                <Input
                  defaultValue={ticket.category}
                  disabled={isPending}
                  id={fieldId("category")}
                  maxLength={80}
                  name="category"
                  placeholder="e.g. Access, Software, Hardware"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={fieldId("department")}>Department</Label>
                  <Input
                    defaultValue={ticket.department ?? ""}
                    disabled={isPending}
                    id={fieldId("department")}
                    maxLength={80}
                    name="department"
                    placeholder="e.g. Finance"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={fieldId("location")}>Location</Label>
                  <Input
                    defaultValue={ticket.location ?? ""}
                    disabled={isPending}
                    id={fieldId("location")}
                    maxLength={120}
                    name="location"
                    placeholder="Office, branch, or remote"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  className="flex items-center gap-1.5"
                  htmlFor={fieldId("dueDate")}
                >
                  <CalendarDaysIcon className="size-3.5 text-muted-foreground" />
                  Due date
                </Label>
                <DatePicker
                  defaultValue={formatDueDate(ticket.dueDate)}
                  disabled={isPending}
                  id={fieldId("dueDate")}
                  name="dueDate"
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank if the ticket has no target date.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor={fieldId("attachments")}>Add attachments</Label>
                <label
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-dashed bg-muted/20 p-4 transition-colors hover:bg-muted/50"
                  htmlFor={fieldId("attachments")}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground ring-1 ring-border">
                    <FileUpIcon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      Choose new files
                    </span>
                    <span className="mt-1 block text-xs font-normal text-muted-foreground">
                      Existing attachments remain unchanged. Images and documents
                      may be added with this update.
                    </span>
                  </span>
                </label>
                <Input
                  className="sr-only"
                  disabled={isPending}
                  id={fieldId("attachments")}
                  multiple
                  name="attachments"
                  type="file"
                />
              </div>

              {error ? (
                <div
                  className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter className="mx-0 mb-0 shrink-0 rounded-none">
            <Button
              disabled={isPending}
              onClick={() => handleOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isPending} type="submit">
              {isPending ? (
                <LoaderCircleIcon
                  aria-hidden="true"
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <SaveIcon data-icon="inline-start" />
              )}
              {isPending ? "Saving changes..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
