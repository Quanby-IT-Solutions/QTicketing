import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  Download,
  FileText,
  FolderKanban,
  MapPin,
  MessageSquareText,
  Paperclip,
  Tag,
  UserRound,
} from "lucide-react";
import { EditTicketDialog } from "@/components/edit-ticket-dialog";
import { TicketPriorityBadge, TicketStatusBadge } from "@/components/ticket-badge";
import { TicketConversation } from "@/components/ticket-conversation";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { projects, ticketAttachments, ticketComments, ticketStatusHistory, tickets, userProjects, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { canViewTicket } from "@/lib/permissions";
import { getAttachmentDownloadUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function DetailItem({ icon: Icon, label, children }: { icon: typeof Tag; label: string; children: React.ReactNode }) {
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

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
  return { title: ticket ? `TKT-${ticket.ticketNumber} — ${ticket.title}` : "Ticket" };
}

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);

  if (!ticket || !canViewTicket(user, ticket)) notFound();
  if (user.role !== "admin") {
    const access = await db
      .select({ projectId: userProjects.projectId })
      .from(userProjects)
      .where(eq(userProjects.userId, user.id))
      .then((rows) => rows.some((row) => row.projectId === ticket.projectId));
    if (!access) notFound();
  }

  const [requester] = await db.select().from(users).where(eq(users.id, ticket.requesterId)).limit(1);
  const [assignee] = ticket.assigneeId
    ? await db.select().from(users).where(eq(users.id, ticket.assigneeId)).limit(1)
    : [];
  const [project] = await db.select().from(projects).where(eq(projects.id, ticket.projectId)).limit(1);
  const comments = await db
    .select({
      id: ticketComments.id,
      parentCommentId: ticketComments.parentCommentId,
      authorId: ticketComments.authorId,
      body: ticketComments.body,
      createdAt: ticketComments.createdAt,
      authorName: users.name,
    })
    .from(ticketComments)
    .innerJoin(users, eq(ticketComments.authorId, users.id))
    .where(eq(ticketComments.ticketId, ticket.id))
    .orderBy(asc(ticketComments.createdAt));
  const attachments = await db.select().from(ticketAttachments).where(eq(ticketAttachments.ticketId, ticket.id));
  const history = await db
    .select({
      id: ticketStatusHistory.id,
      fromStatus: ticketStatusHistory.fromStatus,
      toStatus: ticketStatusHistory.toStatus,
      createdAt: ticketStatusHistory.createdAt,
      changedBy: users.name,
    })
    .from(ticketStatusHistory)
    .innerJoin(users, eq(ticketStatusHistory.changedById, users.id))
    .where(eq(ticketStatusHistory.ticketId, ticket.id))
    .orderBy(asc(ticketStatusHistory.createdAt));
  const attachmentLinks = await Promise.all(
    attachments.map(async (attachment) => ({
      id: attachment.id,
      commentId: attachment.commentId,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size,
      url: await getAttachmentDownloadUrl(attachment.objectKey),
    })),
  );
  const ticketAttachmentLinks = attachmentLinks.filter((link) => link.commentId === null);
  const commentAttachmentLinks = new Map<string, Array<(typeof attachmentLinks)[number]>>();
  for (const link of attachmentLinks) {
    if (!link.commentId) continue;
    const links = commentAttachmentLinks.get(link.commentId) ?? [];
    links.push(link);
    commentAttachmentLinks.set(link.commentId, links);
  }

  const projectHref = project ? `/tickets/${encodeURIComponent(project.name)}` : "/tickets";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="space-y-4">
        <Link
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 text-muted-foreground")}
          href={projectHref}
        >
          <ArrowLeft data-icon="inline-start" />
          Back to {project?.name ?? "tickets"}
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs font-medium">TKT-{ticket.ticketNumber}</span>
              <span>•</span>
              <span>Created {ticket.createdAt.toLocaleDateString()}</span>
            </div>
            <h1 className="max-w-4xl break-words font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              {ticket.title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">Requested by {requester?.name ?? "Unknown user"}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <TicketStatusBadge status={ticket.status} />
            <TicketPriorityBadge priority={ticket.priority} />
            <EditTicketDialog
              ticket={{
                id: ticket.id,
                ticketNumber: ticket.ticketNumber,
                title: ticket.title,
                description: ticket.description,
                status: ticket.status,
                priority: ticket.priority,
                category: ticket.category,
                department: ticket.department,
                location: ticket.location,
                dueDate: ticket.dueDate?.toISOString() ?? null,
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap break-words text-sm leading-7 text-foreground/85">{ticket.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="size-4 text-primary" />
                Attachments
                <span className="ml-1 text-xs font-normal text-muted-foreground">({ticketAttachmentLinks.length})</span>
              </CardTitle>
              <CardDescription>Supporting files provided with this request.</CardDescription>
            </CardHeader>
            <CardContent>
              {ticketAttachmentLinks.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {ticketAttachmentLinks.map((attachment) => (
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
                        <span className="block truncate text-sm font-medium">{attachment.filename}</span>
                        <span className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</span>
                      </span>
                      <Download className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10 text-center">
                  <Paperclip className="mb-3 size-7 text-muted-foreground/60" />
                  <p className="text-sm font-medium">No attachments</p>
                  <p className="mt-1 text-xs text-muted-foreground">No supporting files were added to this ticket.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <MessageSquareText className="size-4 text-primary" />
                Conversation
                <span className="ml-1 text-xs font-normal text-muted-foreground">({comments.length})</span>
              </CardTitle>
              <CardDescription>Keep updates and decisions together with the ticket.</CardDescription>
            </CardHeader>
            <CardContent>
              <TicketConversation
                comments={comments.map((comment) => ({
                  ...comment,
                  canManage: comment.authorId === user.id || user.role === "admin",
                  createdAt: comment.createdAt.toISOString(),
                  createdAtLabel: comment.createdAt.toLocaleString(),
                  attachments: commentAttachmentLinks.get(comment.id) ?? [],
                }))}
                ticket={{
                  id: ticket.id,
                  ticketNumber: ticket.ticketNumber,
                  title: ticket.title,
                }}
              />
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Ticket details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y">
                <DetailItem icon={FolderKanban} label="Project">
                  {project ? (
                    <Link className="text-primary hover:underline" href={projectHref}>{project.name} · {project.title}</Link>
                  ) : "—"}
                </DetailItem>
                <DetailItem icon={Tag} label="Category">{ticket.category}</DetailItem>
                <DetailItem icon={UserRound} label="Assignee">{assignee?.name ?? "Unassigned"}</DetailItem>
                <DetailItem icon={Building2} label="Department">{ticket.department || "—"}</DetailItem>
                <DetailItem icon={MapPin} label="Location">{ticket.location || "—"}</DetailItem>
                <DetailItem icon={CalendarClock} label="Due date">
                  {ticket.dueDate ? ticket.dueDate.toLocaleDateString() : "No due date"}
                </DetailItem>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Status history</CardTitle>
              <CardDescription>{history.length} recorded {history.length === 1 ? "event" : "events"}</CardDescription>
            </CardHeader>
            <CardContent className="max-h-80 overflow-y-auto overscroll-contain pr-3">
              {history.length > 0 ? (
                <ol className="space-y-0">
                  {history.map((entry, index) => (
                    <li className="relative flex gap-3 pb-5 last:pb-0" key={entry.id}>
                      {index < history.length - 1 ? (
                        <span className="absolute left-[5px] top-3 h-[calc(100%-0.25rem)] w-px bg-border" />
                      ) : null}
                      <span className="relative mt-1.5 size-3 shrink-0 rounded-full border-2 border-primary bg-background" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {entry.fromStatus ? `${entry.fromStatus} → ${entry.toStatus}` : `Created as ${entry.toStatus}`}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {entry.changedBy} · {entry.createdAt.toLocaleString()}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">No status changes recorded.</p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
