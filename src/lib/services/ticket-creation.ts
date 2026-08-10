import "server-only";

import { db } from "@/db";
import { tickets, ticketStatusHistory } from "@/db/schema";
import type { CreateTicketInput } from "@/lib/validation";

export type CreateTicketCommand = CreateTicketInput & {
  requesterId: string;
};

/**
 * Creates a ticket and its initial status event as one database operation.
 * Authentication and project authorization belong to the calling transport.
 */
export async function createTicket(command: CreateTicketCommand) {
  return db.transaction(async (tx) => {
    const [ticket] = await tx
      .insert(tickets)
      .values({
        title: command.title,
        description: command.description,
        priority: command.priority,
        projectId: command.projectId,
        category: command.category,
        department: command.department || null,
        location: command.location || null,
        dueDate: command.dueDate ? new Date(command.dueDate) : null,
        requesterId: command.requesterId,
      })
      .returning({
        id: tickets.id,
        ticketNumber: tickets.ticketNumber,
        projectId: tickets.projectId,
        status: tickets.status,
        priority: tickets.priority,
        createdAt: tickets.createdAt,
      });

    if (!ticket) throw new Error("Ticket could not be created.");

    await tx.insert(ticketStatusHistory).values({
      ticketId: ticket.id,
      changedById: command.requesterId,
      fromStatus: null,
      toStatus: "pending",
    });

    return ticket;
  });
}
