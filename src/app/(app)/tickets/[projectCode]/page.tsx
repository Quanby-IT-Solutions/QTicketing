import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, tickets, userProjects, users } from "@/db/schema";
import { CreateTicketButton } from "@/components/create-ticket-dialog";
import { Badge } from "@/components/ui/badge";
import { TicketsTable } from "@/components/tickets-table";
import { requireUser } from "@/lib/auth";
import { canEditTicket } from "@/lib/permissions";

export default async function ProjectTicketsPage({ params }: { params: Promise<{ projectCode: string }> }) {
  const { projectCode } = await params;
  const user = await requireUser();
  const code = decodeURIComponent(projectCode).toUpperCase();
  const [project] = await db.select().from(projects).where(eq(projects.name, code)).limit(1);

  if (!project || !project.active) notFound();

  if (user.role !== "admin") {
    const access = await db
      .select({ projectId: userProjects.projectId })
      .from(userProjects)
      .where(eq(userProjects.userId, user.id))
      .then((rows) => rows.some((row) => row.projectId === project.id));
    if (!access) notFound();
  }

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
    .where(eq(tickets.projectId, project.id))
    .orderBy(desc(tickets.createdAt));

  const rows = ticketRows.map((ticket) => ({
    ...ticket,
    canEdit: canEditTicket(user, ticket),
  }));

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge className="font-mono" variant="outline">{project.name}</Badge>
            <span className="text-xs text-muted-foreground">{rows.length} tickets</span>
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">{project.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage the full support queue for this project.</p>
        </div>
        <CreateTicketButton
          label={`New ${project.name} ticket`}
          project={{ id: project.id, name: project.name, title: project.title }}
        />
      </div>
      <TicketsTable rows={rows} showProject={false} />
    </div>
  );
}
