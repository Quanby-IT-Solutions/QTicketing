import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { ArrowLeft, LockKeyhole, Wrench } from "lucide-react";
import { db } from "@/db";
import { projects, tickets, userProjects, users } from "@/db/schema";
import { CreateTicketButton } from "@/components/create-ticket-dialog";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TicketsTable } from "@/components/tickets-table";
import { requireUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

function ProjectUnderMaintenance({
  project,
}: {
  project: { name: string; title: string };
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100svh-12rem)] w-full max-w-4xl items-center justify-center px-4">
      <Card className="w-full border-blue-200 bg-blue-50/40">
        <CardContent className="flex flex-col items-center px-6 py-12 text-center">
          <span className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 ring-1 ring-blue-200">
            <Wrench className="size-7" />
          </span>
          <Badge className="mb-3 font-mono" variant="outline">
            {project.name}
          </Badge>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Currently updating project configuration
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            The project{" "}
            <span className="font-medium text-foreground">{project.title}</span>{" "}
            is temporarily unavailable while its configuration is being updated.
            Please check back shortly.
          </p>
          <Link
            className={cn(
              buttonVariants({ variant: "outline" }),
              "mt-6 justify-center",
            )}
            href="/tickets"
          >
            <ArrowLeft data-icon="inline-start" />
            Back to tickets
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function RestrictedProjectAccess({
  project,
}: {
  project: { name: string; title: string };
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100svh-12rem)] w-full max-w-4xl items-center justify-center px-4">
      <Card className="w-full border-amber-200 bg-amber-50/40">
        <CardContent className="flex flex-col items-center px-6 py-12 text-center">
          <span className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 ring-1 ring-amber-200">
            <LockKeyhole className="size-7" />
          </span>
          <Badge className="mb-3 font-mono" variant="outline">
            {project.name}
          </Badge>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Restricted project access
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Your account does not currently have permission to view tickets for{" "}
            <span className="font-medium text-foreground">{project.title}</span>
            . Ask an administrator to add this project to your account, or
            request access from Settings.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link
              className={cn(
                buttonVariants({ variant: "outline" }),
                "justify-center",
              )}
              href="/tickets"
            >
              <ArrowLeft data-icon="inline-start" />
              Back to tickets
            </Link>
            <Link
              className={cn(buttonVariants(), "justify-center")}
              href="/settings"
            >
              Request project access
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectCode: string }>;
}): Promise<Metadata> {
  const { projectCode } = await params;
  const code = decodeURIComponent(projectCode).toUpperCase();
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.name, code))
    .limit(1);
  return { title: project ? `${project.name}` : "Project" };
}

export default async function ProjectTicketsPage({
  params,
}: {
  params: Promise<{ projectCode: string }>;
}) {
  const { projectCode } = await params;
  const user = await requireUser();
  const code = decodeURIComponent(projectCode).toUpperCase();
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.name, code))
    .limit(1);

  if (!project) notFound();
  if (!project.active) return <ProjectUnderMaintenance project={project} />;

  if (user.role !== "admin") {
    const access = await db
      .select({ projectId: userProjects.projectId })
      .from(userProjects)
      .where(eq(userProjects.userId, user.id))
      .then((rows) => rows.some((row) => row.projectId === project.id));
    if (!access) return <RestrictedProjectAccess project={project} />;
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
    canEdit: true,
    canDelete: true,
  }));

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge className="font-mono" variant="outline">
              {project.name}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {rows.length} tickets
            </span>
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            {project.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the full support queue for this project.
          </p>
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
