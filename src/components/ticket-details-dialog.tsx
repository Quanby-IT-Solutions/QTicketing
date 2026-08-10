"use client";

import * as React from "react";
import {
  Building2,
  CalendarClock,
  Download,
  FileText,
  FolderKanban,
  LoaderCircle,
  MapPin,
  MessageSquarePlus,
  MessageSquareText,
  Paperclip,
  PencilIcon,
  Tag,
  UserRound,
} from "lucide-react";

import { getTicketDetailsAction } from "@/app/actions/tickets";
import {
  EditTicketDialog,
  type EditableTicket,
} from "@/components/edit-ticket-dialog";
import {
  TicketPriorityBadge,
  TicketStatusBadge,
} from "@/components/ticket-badge";
import { TicketConversation } from "@/components/ticket-conversation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TicketPriority, TicketStatus } from "@/db/schema";

type TicketDetails = Awaited<ReturnType<typeof getTicketDetailsAction>>;

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function DetailItem({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Tag;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 py-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 break-words text-sm font-medium">{children}</dd>
      </div>
    </div>
  );
}

function TicketDetailsSkeleton() {
  return (
    <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-4">
        <div className="h-36 rounded-xl bg-muted/60" />
        <div className="h-44 rounded-xl bg-muted/60" />
        <div className="h-52 rounded-xl bg-muted/60" />
      </div>
      <div className="space-y-4">
        <div className="h-56 rounded-xl bg-muted/60" />
        <div className="h-40 rounded-xl bg-muted/60" />
      </div>
    </div>
  );
}

function editableTicket(ticket: TicketDetails["ticket"]): EditableTicket {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    assigneeId: ticket.assigneeId,
    category: ticket.category,
    department: ticket.department,
    location: ticket.location,
    dueDate: ticket.dueDate,
  };
}

function TicketDetailsContent({
  commentOpen,
  details,
  onCommentOpenChange,
  onRefresh,
}: {
  commentOpen: boolean;
  details: TicketDetails;
  onCommentOpenChange: (open: boolean) => void;
  onRefresh: () => Promise<void>;
}) {
  const {
    assignee,
    attachments,
    comments,
    history,
    project,
    requester,
    ticket,
  } = details;

  return (
    <div className="min-h-0 overflow-y-auto px-4 py-5 sm:px-6">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap break-words text-sm leading-7 text-foreground/85">
                {ticket.description}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="size-4 text-primary" />
                Attachments
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  ({attachments.length})
                </span>
              </CardTitle>
              <CardDescription>
                Supporting files provided with this request.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attachments.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {attachments.map((attachment) => (
                    <a
                      className="group flex min-w-0 items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/50"
                      href={attachment.url}
                      key={attachment.id}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileText className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {attachment.filename}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(attachment.size)}
                        </span>
                      </span>
                      <Download className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10 text-center">
                  <Paperclip className="mb-3 size-7 text-muted-foreground/60" />
                  <p className="text-sm font-medium">No attachments</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    No supporting files were added to this ticket.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <MessageSquareText className="size-4 text-primary" />
                Conversation
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  ({comments.length})
                </span>
              </CardTitle>
              <CardDescription>
                Keep updates and decisions together with the ticket.
              </CardDescription>
              <CardAction>
                <Button onClick={() => onCommentOpenChange(true)} type="button">
                  <MessageSquarePlus data-icon="inline-start" />
                  Add comment
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <TicketConversation
                commentOpen={commentOpen}
                comments={comments}
                onCommentOpenChange={onCommentOpenChange}
                onRefresh={onRefresh}
                showAddCommentButton={false}
                ticket={{
                  id: ticket.id,
                  ticketNumber: ticket.ticketNumber,
                  title: ticket.title,
                }}
              />
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Ticket details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y">
                <DetailItem icon={FolderKanban} label="Project">
                  {project ? `${project.name} - ${project.title}` : "-"}
                </DetailItem>
                <DetailItem icon={Tag} label="Category">
                  {ticket.category}
                </DetailItem>
                <DetailItem icon={UserRound} label="Requester">
                  {requester?.name ?? "Unknown user"}
                </DetailItem>
                <DetailItem icon={UserRound} label="Assignee">
                  {assignee?.name ?? "Unassigned"}
                </DetailItem>
                <DetailItem icon={Building2} label="Department">
                  {ticket.department || "-"}
                </DetailItem>
                <DetailItem icon={MapPin} label="Location">
                  {ticket.location || "-"}
                </DetailItem>
                <DetailItem icon={CalendarClock} label="Due date">
                  {ticket.dueDate
                    ? new Date(ticket.dueDate).toLocaleDateString()
                    : "No due date"}
                </DetailItem>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Status history</CardTitle>
              <CardDescription>
                {history.length} recorded{" "}
                {history.length === 1 ? "event" : "events"}
              </CardDescription>
            </CardHeader>
            <CardContent className="max-h-80 overflow-y-auto overscroll-contain pr-3">
              {history.length > 0 ? (
                <ol className="space-y-0">
                  {history.map((entry, index) => (
                    <li
                      className="relative flex gap-3 pb-5 last:pb-0"
                      key={entry.id}
                    >
                      {index < history.length - 1 ? (
                        <span className="absolute left-[5px] top-3 h-[calc(100%-0.25rem)] w-px bg-border" />
                      ) : null}
                      <span className="relative mt-1.5 size-3 shrink-0 rounded-full border-2 border-primary bg-background" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {entry.fromStatus
                            ? `${entry.fromStatus} to ${entry.toStatus}`
                            : `Created as ${entry.toStatus}`}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {entry.changedBy} - {entry.createdAtLabel}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No status changes recorded.
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

type TicketDetailsDialogProps = {
  ticket: {
    id: string;
    ticketNumber: number;
    title: string;
    status: TicketStatus;
    priority: TicketPriority;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TicketDetailsDialog({
  ticket,
  open,
  onOpenChange,
}: TicketDetailsDialogProps) {
  const [details, setDetails] = React.useState<TicketDetails | null>(null);
  const [error, setError] = React.useState<{
    ticketId: string;
    message: string;
  } | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [commentOpen, setCommentOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const currentDetails = details?.ticket.id === ticket.id ? details : null;
  const currentError = error?.ticketId === ticket.id ? error.message : null;
  const refreshDetails = React.useCallback(async () => {
    try {
      setDetails(await getTicketDetailsAction(ticket.id));
      setError(null);
    } catch (loadError) {
      setError({
        ticketId: ticket.id,
        message:
          loadError instanceof Error
            ? loadError.message
            : "Ticket details could not be loaded.",
      });
    }
  }, [ticket.id]);

  React.useEffect(() => {
    if (!open || details?.ticket.id === ticket.id) return;

    startTransition(async () => {
      await refreshDetails();
    });
  }, [details?.ticket.id, open, refreshDetails, ticket.id]);

  return (
    <>
      <Dialog onOpenChange={onOpenChange} open={open}>
        <DialogContent className="flex max-h-[calc(100svh-1rem)] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-h-[calc(100svh-2rem)] sm:max-w-6xl">
          <DialogHeader className="shrink-0 border-b px-4 py-4 pr-12 sm:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs font-medium">
                    TKT-{ticket.ticketNumber}
                  </span>
                  {currentDetails ? (
                    <span>Created {currentDetails.ticket.createdAtLabel}</span>
                  ) : null}
                </div>
                <DialogTitle className="max-w-3xl break-words text-lg sm:text-xl">
                  {ticket.title}
                </DialogTitle>
                <DialogDescription>
                  {currentDetails?.requester
                    ? `Requested by ${currentDetails.requester.name}`
                    : "Loading ticket details..."}
                </DialogDescription>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <TicketStatusBadge
                  status={currentDetails?.ticket.status ?? ticket.status}
                />
                <TicketPriorityBadge
                  priority={currentDetails?.ticket.priority ?? ticket.priority}
                />
                {/* {currentDetails?.ticket.canEdit ? (
                  <Button
                    onClick={() => {
                      onOpenChange(false);
                      setEditOpen(true);
                    }}
                    type="button"
                    variant="outline"
                  >
                    <PencilIcon data-icon="inline-start" />
                    Edit ticket
                  </Button>
                ) : null} */}
              </div>
            </div>
          </DialogHeader>

          {currentError ? (
            <div className="p-5">
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {currentError}
              </div>
            </div>
          ) : currentDetails ? (
            <TicketDetailsContent
              commentOpen={commentOpen}
              details={currentDetails}
              onCommentOpenChange={setCommentOpen}
              onRefresh={refreshDetails}
            />
          ) : (
            <div className="flex min-h-96 flex-col">
              <div className="flex items-center gap-2 border-b px-5 py-3 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Loading details
              </div>
              {isPending ? <TicketDetailsSkeleton /> : null}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {currentDetails?.ticket.canEdit ? (
        <EditTicketDialog
          assigneeOptions={currentDetails.assigneeOptions}
          hideTrigger
          onOpenChange={(nextOpen) => {
            setEditOpen(nextOpen);
            if (!nextOpen) setDetails(null);
          }}
          open={editOpen}
          ticket={editableTicket(currentDetails.ticket)}
        />
      ) : null}
    </>
  );
}

export function TicketDetailsButton({
  ticket,
  className,
  children,
}: {
  ticket: TicketDetailsDialogProps["ticket"];
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button className={className} onClick={() => setOpen(true)} type="button">
        {children}
      </button>
      <TicketDetailsDialog onOpenChange={setOpen} open={open} ticket={ticket} />
    </>
  );
}
