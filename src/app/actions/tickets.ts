"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, ticketAttachments, ticketComments, tickets, ticketStatusHistory, userProjects, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { canEditTicket, canViewTicket } from "@/lib/permissions";
import { commentSchema, createTicketSchema, updateTicketInlineSchema, updateTicketSchema } from "@/lib/validation";
import { getAttachmentDownloadUrl, uploadTicketAttachment } from "@/lib/storage";

type CurrentUser = Awaited<ReturnType<typeof requireUser>>;
type UserWithRole = {
  id: string;
  role: "admin" | "agent" | "requester";
};

function getTicketFields(formData: FormData) {
  return {
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
    priority: formData.get("priority") ?? undefined,
    category: formData.get("category") ?? "",
    department: formData.get("department") ?? "",
    location: formData.get("location") ?? "",
    dueDate: formData.get("dueDate") ?? "",
  };
}

function getAttachmentFiles(formData: FormData) {
  return formData
    .getAll("attachments")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

async function requireProjectAccess(user: CurrentUser, projectId: string, message: string) {
  if (user.role === "admin") return;

  const access = await db
    .select({ projectId: userProjects.projectId })
    .from(userProjects)
    .where(and(eq(userProjects.userId, user.id), eq(userProjects.projectId, projectId)))
    .limit(1);

  if (access.length === 0) throw new Error(message);
}

async function hasProjectAccess(user: UserWithRole, projectId: string) {
  if (user.role === "admin") return true;

  const access = await db
    .select({ projectId: userProjects.projectId })
    .from(userProjects)
    .where(and(eq(userProjects.userId, user.id), eq(userProjects.projectId, projectId)))
    .limit(1);

  return access.length > 0;
}

async function canAssignUserToProject(userId: string, projectId: string) {
  const [assignee] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!assignee || !assignee.active || assignee.status !== "approved") return false;
  if (assignee.role === "requester") return false;
  if (assignee.role === "admin") return true;

  return hasProjectAccess(assignee, projectId);
}

async function getAssignableUsers(projectId: string) {
  const candidateUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(and(eq(users.active, true), eq(users.status, "approved")))
    .orderBy(asc(users.name));

  const options = [];
  for (const candidate of candidateUsers) {
    if (candidate.role === "requester") continue;
    if (candidate.role === "admin" || (await hasProjectAccess(candidate, projectId))) {
      options.push(candidate);
    }
  }

  return options;
}

async function addAttachments(ticketId: string, uploaderId: string, formData: FormData) {
  for (const file of getAttachmentFiles(formData)) {
    const uploaded = await uploadTicketAttachment(ticketId, file);
    await db.insert(ticketAttachments).values({
      ticketId,
      uploaderId,
      ...uploaded,
    });
  }
}

async function revalidateTicketPaths({
  ticketId,
  projectId,
  includeDetail = false,
}: {
  ticketId: string;
  projectId: string;
  includeDetail?: boolean;
}) {
  const [project] = await db.select({ name: projects.name }).from(projects).where(eq(projects.id, projectId)).limit(1);

  revalidatePath("/tickets");
  revalidatePath("/dashboard");
  if (project) revalidatePath(`/tickets/${project.name}`);
  if (includeDetail) revalidatePath(`/tickets/detail/${ticketId}`);
}

async function createTicketFromFormData(formData: FormData) {
  const user = await requireUser();
  const parsed = createTicketSchema.parse({
    ...getTicketFields(formData),
    projectId: formData.get("projectId"),
  });

  await requireProjectAccess(user, parsed.projectId, "You do not have access to create tickets for this project.");

  const [ticket] = await db
    .insert(tickets)
    .values({
      title: parsed.title,
      description: parsed.description,
      priority: parsed.priority,
      projectId: parsed.projectId,
      category: parsed.category,
      department: parsed.department || null,
      location: parsed.location || null,
      dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
      requesterId: user.id,
    })
    .returning({
      id: tickets.id,
      ticketNumber: tickets.ticketNumber,
      projectId: tickets.projectId,
    });

  if (!ticket) throw new Error("Ticket could not be created.");

  await addAttachments(ticket.id, user.id, formData);
  await db.insert(ticketStatusHistory).values({
    ticketId: ticket.id,
    changedById: user.id,
    fromStatus: null,
    toStatus: "pending",
  });

  await revalidateTicketPaths({ ticketId: ticket.id, projectId: ticket.projectId });

  return { ticketId: ticket.id, ticketNumber: ticket.ticketNumber };
}

export async function createTicketAction(formData: FormData) {
  const result = await createTicketFromFormData(formData);
  redirect(`/tickets/detail/${result.ticketId}`);
}

export async function createTicketModalAction(formData: FormData) {
  return createTicketFromFormData(formData);
}

export async function getTicketDetailsAction(ticketId: string) {
  const user = await requireUser();
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);

  if (!ticket || !canViewTicket(user, ticket)) {
    throw new Error("You do not have permission to view this ticket.");
  }

  if (!(await hasProjectAccess(user, ticket.projectId))) {
    throw new Error("You do not have access to this project ticket.");
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
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size,
      url: await getAttachmentDownloadUrl(attachment.objectKey),
    })),
  );

  return {
    ticket: {
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
      createdAt: ticket.createdAt.toISOString(),
      createdAtLabel: ticket.createdAt.toLocaleDateString(),
      requesterId: ticket.requesterId,
      assigneeId: ticket.assigneeId,
      canEdit: canEditTicket(user, ticket),
    },
    requester: requester ? { id: requester.id, name: requester.name, email: requester.email } : null,
    assignee: assignee ? { id: assignee.id, name: assignee.name, email: assignee.email } : null,
    project: project ? { id: project.id, name: project.name, title: project.title } : null,
    comments: comments.map((comment) => ({
      ...comment,
      createdAt: comment.createdAt.toISOString(),
      createdAtLabel: comment.createdAt.toLocaleString(),
    })),
    attachments: attachmentLinks,
    history: history.map((entry) => ({
      ...entry,
      createdAt: entry.createdAt.toISOString(),
      createdAtLabel: entry.createdAt.toLocaleString(),
    })),
    assigneeOptions: canEditTicket(user, ticket) ? await getAssignableUsers(ticket.projectId) : [],
  };
}

export async function updateTicketAction(formData: FormData) {
  const user = await requireUser();
  const parsed = updateTicketSchema.parse({
    ...getTicketFields(formData),
    ticketId: formData.get("ticketId"),
    status: formData.get("status"),
    assigneeId: formData.has("assigneeId") ? formData.get("assigneeId") : undefined,
  });

  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, parsed.ticketId)).limit(1);
  if (!ticket || !canEditTicket(user, ticket)) {
    throw new Error("You do not have permission to update this ticket.");
  }

  await requireProjectAccess(user, ticket.projectId, "You do not have access to update this project ticket.");

  const statusChanged = parsed.status !== ticket.status;
  const updatedAt = new Date();
  const updateValues: Partial<typeof tickets.$inferInsert> = {
    title: parsed.title,
    description: parsed.description,
    status: parsed.status,
    priority: parsed.priority,
    category: parsed.category,
    department: parsed.department || null,
    location: parsed.location || null,
    dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
    updatedAt,
  };

  if (statusChanged) {
    updateValues.resolvedAt = parsed.status === "done" ? updatedAt : null;
  }

  if (parsed.assigneeId !== undefined) {
    if (parsed.assigneeId && !(await canAssignUserToProject(parsed.assigneeId, ticket.projectId))) {
      throw new Error("The selected assignee cannot be assigned to this project.");
    }
    updateValues.assigneeId = parsed.assigneeId || null;
  }

  await db.transaction(async (tx) => {
    await tx.update(tickets).set(updateValues).where(eq(tickets.id, parsed.ticketId));

    if (statusChanged) {
      await tx.insert(ticketStatusHistory).values({
        ticketId: parsed.ticketId,
        changedById: user.id,
        fromStatus: ticket.status,
        toStatus: parsed.status,
      });
    }
  });

  await addAttachments(parsed.ticketId, user.id, formData);
  await revalidateTicketPaths({
    ticketId: parsed.ticketId,
    projectId: ticket.projectId,
    includeDetail: true,
  });

  return { ticketId: parsed.ticketId };
}

export async function updateTicketInlineAction(formData: FormData) {
  const user = await requireUser();
  const parsed = updateTicketInlineSchema.parse({
    ticketId: formData.get("ticketId"),
    status: formData.get("status") || undefined,
    priority: formData.get("priority") || undefined,
  });

  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, parsed.ticketId)).limit(1);
  if (!ticket || !canEditTicket(user, ticket)) {
    throw new Error("You do not have permission to update this ticket.");
  }
  if (user.role !== "admin") {
    const access = await db
      .select({ projectId: userProjects.projectId })
      .from(userProjects)
      .where(and(eq(userProjects.userId, user.id), eq(userProjects.projectId, ticket.projectId)))
      .limit(1);
    if (access.length === 0) throw new Error("You do not have access to update this project ticket.");
  }

  const updateValues: Partial<typeof tickets.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (parsed.status) {
    updateValues.status = parsed.status;
    updateValues.resolvedAt = parsed.status === "done" ? new Date() : null;
  }
  if (parsed.priority) updateValues.priority = parsed.priority;

  await db.update(tickets).set(updateValues).where(eq(tickets.id, parsed.ticketId));

  if (parsed.status && parsed.status !== ticket.status) {
    await db.insert(ticketStatusHistory).values({
      ticketId: parsed.ticketId,
      changedById: user.id,
      fromStatus: ticket.status,
      toStatus: parsed.status,
    });
  }

  revalidatePath("/tickets");
  const [project] = await db.select({ name: projects.name }).from(projects).where(eq(projects.id, ticket.projectId)).limit(1);
  if (project) revalidatePath(`/tickets/${project.name}`);
  revalidatePath(`/tickets/detail/${parsed.ticketId}`);
}

export async function addCommentAction(formData: FormData) {
  const user = await requireUser();
  const parsed = commentSchema.parse({
    ticketId: formData.get("ticketId"),
    parentCommentId: formData.get("parentCommentId") || undefined,
    body: formData.get("body"),
  });

  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, parsed.ticketId)).limit(1);
  if (!ticket || !canViewTicket(user, ticket)) {
    throw new Error("You do not have permission to comment on this ticket.");
  }
  if (user.role !== "admin") {
    const access = await db
      .select({ projectId: userProjects.projectId })
      .from(userProjects)
      .where(and(eq(userProjects.userId, user.id), eq(userProjects.projectId, ticket.projectId)))
      .limit(1);
    if (access.length === 0) throw new Error("You do not have access to comment on this project ticket.");
  }

  if (parsed.parentCommentId) {
    const [parentComment] = await db
      .select({ id: ticketComments.id })
      .from(ticketComments)
      .where(
        and(
          eq(ticketComments.id, parsed.parentCommentId),
          eq(ticketComments.ticketId, parsed.ticketId),
        ),
      )
      .limit(1);

    if (!parentComment) {
      throw new Error("The comment you are replying to does not belong to this ticket.");
    }
  }

  const [comment] = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(ticketComments)
      .values({
        ticketId: parsed.ticketId,
        authorId: user.id,
        parentCommentId: parsed.parentCommentId ?? null,
        body: parsed.body,
      })
      .returning({ id: ticketComments.id });

    await tx.update(tickets).set({ updatedAt: new Date() }).where(eq(tickets.id, parsed.ticketId));

    return inserted;
  });

  if (!comment) throw new Error("Comment could not be added.");

  await revalidateTicketPaths({
    ticketId: parsed.ticketId,
    projectId: ticket.projectId,
    includeDetail: true,
  });

  return { commentId: comment.id };
}
