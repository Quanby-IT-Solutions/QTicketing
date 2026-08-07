import type { Metadata } from "next";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { projects, tickets, userProjects, users } from "@/db/schema";
import { CreateTicketButton } from "@/components/create-ticket-dialog";
import { TicketsTable } from "@/components/tickets-table";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth";
import { canDeleteTicket, canEditTicket } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Tickets",
};

export default async function TicketsPage() {
  const user = await requireUser();
  const allowedProjectIds =
    user.role === "admin"
      ? null
      : (
          await db
            .select({ projectId: userProjects.projectId })
            .from(userProjects)
            .where(eq(userProjects.userId, user.id))
        ).map((row) => row.projectId);

  const ticketRows = await db
    .select({
      id: tickets.id,
      ticketNumber: tickets.ticketNumber,
      title: tickets.title,
      description: tickets.description,
      status: tickets.status,
      priority: tickets.priority,
      category: tickets.category,
      department: tickets.department,
      location: tickets.location,
      dueDate: tickets.dueDate,
      requesterId: tickets.requesterId,
      assigneeId: tickets.assigneeId,
      requesterName: users.name,
      projectTitle: projects.title,
      createdAt: tickets.createdAt,
    })
    .from(tickets)
    .innerJoin(users, eq(tickets.requesterId, users.id))
    .innerJoin(projects, eq(tickets.projectId, projects.id))
    .where(
      allowedProjectIds === null
        ? undefined
        : allowedProjectIds.length > 0
          ? inArray(tickets.projectId, allowedProjectIds)
          : eq(tickets.id, "00000000-0000-0000-0000-000000000000"),
    )
    .orderBy(desc(tickets.createdAt));

  const rows = ticketRows.map((ticket) => ({
    ...ticket,
    canEdit: canEditTicket(user, ticket),
    canDelete: canDeleteTicket(user, ticket),
  }));

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-primary">Workspace</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Ticket queue
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review and manage tickets across every project you can access.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{rows.length} total</Badge>
          <CreateTicketButton label="New ticket" />
        </div>
      </div>
      <TicketsTable rows={rows} />
    </div>
  );
}
