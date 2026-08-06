import Link from "next/link";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { ArrowRightIcon } from "lucide-react";
import { ChartAreaInteractive, type TicketTrendPoint } from "@/components/chart-area-interactive";
import { SectionCards } from "@/components/section-cards";
import { TicketsTable } from "@/components/tickets-table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/db";
import { projects, tickets, userProjects, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { canEditTicket } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const emptyId = "00000000-0000-0000-0000-000000000000";
const trendDays = 30;

function toUtcDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildTrendData(
  rows: { createdAt: Date; resolvedAt: Date | null }[],
): TicketTrendPoint[] {
  const today = new Date();
  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const points = Array.from({ length: trendDays }, (_, index) => {
    const date = new Date(todayUtc);
    date.setUTCDate(date.getUTCDate() - (trendDays - index - 1));
    return { date: toUtcDateKey(date), created: 0, resolved: 0 };
  });
  const pointsByDate = new Map(points.map((point) => [point.date, point]));

  for (const ticket of rows) {
    const createdPoint = pointsByDate.get(toUtcDateKey(ticket.createdAt));
    if (createdPoint) createdPoint.created += 1;

    if (ticket.resolvedAt) {
      const resolvedPoint = pointsByDate.get(toUtcDateKey(ticket.resolvedAt));
      if (resolvedPoint) resolvedPoint.resolved += 1;
    }
  }

  return points;
}

export default async function DashboardPage() {
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

  const ticketFilter =
    allowedProjectIds === null
      ? undefined
      : allowedProjectIds.length > 0
        ? inArray(tickets.projectId, allowedProjectIds)
        : eq(tickets.id, emptyId);

  const [projectRows, ticketRows] = await Promise.all([
    allowedProjectIds === null
      ? db
          .select()
          .from(projects)
          .where(eq(projects.active, true))
          .orderBy(asc(projects.name))
      : allowedProjectIds.length > 0
        ? db
            .select()
            .from(projects)
            .where(
              and(
                eq(projects.active, true),
                inArray(projects.id, allowedProjectIds),
              ),
            )
            .orderBy(asc(projects.name))
        : Promise.resolve([]),
    db
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
        projectId: tickets.projectId,
        projectName: projects.name,
        projectTitle: projects.title,
        createdAt: tickets.createdAt,
        resolvedAt: tickets.resolvedAt,
      })
      .from(tickets)
      .innerJoin(users, eq(tickets.requesterId, users.id))
      .innerJoin(projects, eq(tickets.projectId, projects.id))
      .where(ticketFilter)
      .orderBy(desc(tickets.createdAt)),
  ]);

  const metrics = ticketRows.reduce(
    (totals, ticket) => {
      totals.total += 1;
      totals[ticket.status] += 1;
      if (ticket.priority === "high") {
        totals.highPriority += 1;
        if (ticket.status !== "done") totals.highPriorityOpen += 1;
      }
      return totals;
    },
    {
      total: 0,
      pending: 0,
      ongoing: 0,
      done: 0,
      highPriority: 0,
      highPriorityOpen: 0,
    },
  );

  const projectWorkload = projectRows
    .map((project) => {
      const projectTickets = ticketRows.filter(
        (ticket) => ticket.projectId === project.id,
      );
      return {
        id: project.id,
        name: project.name,
        title: project.title,
        total: projectTickets.length,
        pending: projectTickets.filter((ticket) => ticket.status === "pending")
          .length,
        ongoing: projectTickets.filter((ticket) => ticket.status === "ongoing")
          .length,
        highPriority: projectTickets.filter(
          (ticket) =>
            ticket.priority === "high" && ticket.status !== "done",
        ).length,
      };
    })
    .sort((left, right) => right.total - left.total || left.name.localeCompare(right.name));
  const maxProjectTickets = Math.max(
    1,
    ...projectWorkload.map((project) => project.total),
  );

  const recentTickets = ticketRows.slice(0, 6).map((ticket) => ({
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
    requesterName: ticket.requesterName,
    projectTitle: ticket.projectTitle,
    createdAt: ticket.createdAt,
    canEdit: canEditTicket(user, ticket),
  }));

  return (
    <div className="@container/main flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Workspace overview</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Welcome back, {user.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ticket activity across the projects you are allowed to manage.
          </p>
        </div>
        <Link
          className={cn(buttonVariants({ variant: "outline" }), "w-fit")}
          href="/tickets"
        >
          View all tickets
          <ArrowRightIcon data-icon="inline-end" />
        </Link>
      </div>

      <SectionCards
        done={metrics.done}
        highPriority={metrics.highPriority}
        highPriorityOpen={metrics.highPriorityOpen}
        ongoing={metrics.ongoing}
        pending={metrics.pending}
        projectCount={projectRows.length}
        total={metrics.total}
      />

      <div className="grid gap-6 @5xl/main:grid-cols-[minmax(0,1.6fr)_minmax(19rem,1fr)]">
        <ChartAreaInteractive data={buildTrendData(ticketRows)} />

        <Card>
          <CardHeader>
            <CardTitle>Project workload</CardTitle>
            <CardDescription>
              Current ticket volume by accessible project.
            </CardDescription>
            <CardAction>
              <Badge variant="secondary">{projectRows.length} projects</Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            {projectWorkload.length > 0 ? (
              <div className="space-y-4">
                {projectWorkload.slice(0, 5).map((project) => (
                  <Link
                    className="group block rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    href={`/tickets/${encodeURIComponent(project.name)}`}
                    key={project.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{project.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {project.title}
                        </p>
                      </div>
                      <span className="font-mono text-lg font-semibold tabular-nums">
                        {project.total}
                      </span>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-[width]"
                        style={{
                          width: `${(project.total / maxProjectTickets) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{project.pending} pending</span>
                      <span>{project.ongoing} ongoing</span>
                      <span>{project.highPriority} high priority</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed px-6 text-center text-sm text-muted-foreground">
                No projects are assigned to this account yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-lg font-semibold">Recent tickets</h2>
            <p className="text-sm text-muted-foreground">
              The latest requests from your accessible projects.
            </p>
          </div>
          <Link
            className="hidden text-sm font-medium text-primary hover:underline sm:block"
            href="/tickets"
          >
            View all
          </Link>
        </div>
        <TicketsTable rows={recentTickets} />
      </section>
    </div>
  );
}
