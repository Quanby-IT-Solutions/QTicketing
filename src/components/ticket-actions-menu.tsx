"use client";

import * as React from "react";
import {
  EllipsisVerticalIcon,
  EyeIcon,
  MessageSquarePlusIcon,
  PencilIcon,
} from "lucide-react";
import {
  EditTicketDialog,
  type EditableTicket,
} from "@/components/edit-ticket-dialog";
import { TicketCommentDialog } from "@/components/ticket-comment-dialog";
import { TicketDetailsDialog } from "@/components/ticket-details-dialog";
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
};

export function TicketActionsMenu({ ticket }: { ticket: TicketActionsMenuTicket }) {
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [commentOpen, setCommentOpen] = React.useState(false);
  const canMutate = ticket.canEdit;
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
    </>
  );
}
