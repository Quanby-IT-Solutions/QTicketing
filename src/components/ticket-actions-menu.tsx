"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  EllipsisVerticalIcon,
  EyeIcon,
  LoaderCircle,
  MessageSquarePlusIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { deleteTicketAction } from "@/app/actions/tickets";
import {
  EditTicketDialog,
  type EditableTicket,
} from "@/components/edit-ticket-dialog";
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
import { TicketCommentDialog } from "@/components/ticket-comment-dialog";
import { TicketDetailsDialog } from "@/components/ticket-details-dialog";
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
import type { TicketPriority, TicketStatus } from "@/db/schema";

export type TicketActionsMenuTicket = {
  id: string;
  ticketNumber: number;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  description: string;
  department: string | null;
  location: string | null;
  dueDate: Date | string | null;
  canEdit: boolean;
  canDelete: boolean;
};

export function TicketActionsMenu({ ticket }: { ticket: TicketActionsMenuTicket }) {
  const router = useRouter();
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [commentOpen, setCommentOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const canMutate = ticket.canEdit;

  function handleDelete() {
    if (isPending) return;

    const formData = new FormData();
    formData.set("ticketId", ticket.id);

    startTransition(async () => {
      try {
        await deleteTicketAction(formData);
        setDeleteOpen(false);
        router.refresh();
        toast.add({
          title: "Ticket deleted",
          description: `Ticket #${ticket.ticketNumber} was permanently deleted.`,
          type: "success",
        });
      } catch (submitError) {
        const message =
          submitError instanceof Error && submitError.message
            ? submitError.message
            : "The ticket could not be deleted. Please try again.";
        toast.add({
          title: "Ticket not deleted",
          description: message,
          type: "error",
          priority: "high",
        });
      }
    });
  }
  const editableTicket: EditableTicket | null =
    canMutate
      ? {
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          title: ticket.title,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          category: ticket.category,
          department: ticket.department,
          location: ticket.location,
          dueDate: ticket.dueDate,
        }
      : null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label={`Open actions for ticket #${ticket.ticketNumber}`}
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
            <DropdownMenuLabel>Ticket actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setDetailsOpen(true)}>
              <EyeIcon aria-hidden="true" />
              View details
            </DropdownMenuItem>
          </DropdownMenuGroup>

          {canMutate ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {editableTicket ? (
                  <DropdownMenuItem onClick={() => setEditOpen(true)}>
                    <PencilIcon aria-hidden="true" />
                    Edit ticket
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onClick={() => setCommentOpen(true)}>
                  <MessageSquarePlusIcon aria-hidden="true" />
                  Add comment
                </DropdownMenuItem>
              </DropdownMenuGroup>

              {ticket.canDelete ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => setDeleteOpen(true)} variant="destructive">
                      <Trash2Icon aria-hidden="true" />
                      Delete ticket
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </>
              ) : null}
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <TicketDetailsDialog
        onOpenChange={setDetailsOpen}
        open={detailsOpen}
        ticket={{
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          title: ticket.title,
          status: ticket.status,
          priority: ticket.priority,
        }}
      />

      {editableTicket ? (
        <EditTicketDialog
          hideTrigger
          onOpenChange={setEditOpen}
          open={editOpen}
          ticket={editableTicket}
        />
      ) : null}

      {canMutate ? (
        <TicketCommentDialog
          hideTrigger
          onOpenChange={setCommentOpen}
          open={commentOpen}
          ticket={{
            id: ticket.id,
            ticketNumber: ticket.ticketNumber,
            title: ticket.title,
          }}
        />
      ) : null}

      {ticket.canDelete ? (
        <AlertDialog onOpenChange={setDeleteOpen} open={deleteOpen}>
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogMedia className="bg-destructive/10 text-destructive">
                <Trash2Icon aria-hidden="true" />
              </AlertDialogMedia>
              <AlertDialogTitle>
                Delete ticket #{ticket.ticketNumber}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes the ticket, its comments, attachments,
                and history. This action cannot be undone.
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
                {isPending ? "Deleting..." : "Delete ticket"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </>
  );
}
