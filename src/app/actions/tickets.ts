"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { projects, ticketAttachments, ticketComments, tickets, ticketStatusHistory, userProjects, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { canDeleteTicket, canEditTicket, canViewTicket } from "@/lib/permissions";
import {
  commentSchema,
  createTicketSchema,
  deleteCommentAttachmentSchema,
  deleteCommentSchema,
  deleteTicketSchema,
  updateCommentSchema,
  updateTicketInlineSchema,
  updateTicketSchema,
} from "@/lib/validation";
import { collectCommentSubtree } from "@/lib/comment-tree";
import { attachmentSizeErrorMessage, deleteTicketAttachments, getAttachmentDownloadUrl, maxAttachmentBytes, uploadTicketAttachment } from "@/lib/storage";

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
      canManage: comment.authorId === user.id || user.role === "admin",
      createdAt: comment.createdAt.toISOString(),
      createdAtLabel: comment.createdAt.toLocaleString(),
      attachments: commentAttachmentLinks.get(comment.id) ?? [],
    })),
    attachments: ticketAttachmentLinks,
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

export async function deleteTicketAction(formData: FormData) {
  const user = await requireUser();
  const parsed = deleteTicketSchema.parse({
    ticketId: formData.get("ticketId"),
  });

  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, parsed.ticketId)).limit(1);
  if (!ticket || !canDeleteTicket(user, ticket)) {
    throw new Error("You do not have permission to delete this ticket.");
  }

  await requireProjectAccess(user, ticket.projectId, "You do not have access to delete this project ticket.");

  const attachments = await db
    .select({ objectKey: ticketAttachments.objectKey })
    .from(ticketAttachments)
    .where(eq(ticketAttachments.ticketId, ticket.id));

  // Comments, attachments, and status history cascade on ticket deletion.
  await db.delete(tickets).where(eq(tickets.id, ticket.id));

  if (attachments.length > 0) {
    try {
      await deleteTicketAttachments(attachments.map((attachment) => attachment.objectKey));
    } catch (cleanupError) {
      // The database rows are the source of truth; S3 cleanup is best-effort.
      console.error("Failed to clean up S3 attachments for ticket", ticket.id, cleanupError);
    }
  }

  await revalidateTicketPaths({
    ticketId: ticket.id,
    projectId: ticket.projectId,
    includeDetail: true,
  });

  return { ticketId: ticket.id };
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

  const attachmentFiles = getAttachmentFiles(formData);
  for (const file of attachmentFiles) {
    if (file.size > maxAttachmentBytes) {
      throw new Error(attachmentSizeErrorMessage);
    }
  }

  // Upload to S3 before creating the comment so a failed upload never leaves a
  // persisted comment that the UI reported as failed.
  const uploadedAttachments: Awaited<ReturnType<typeof uploadTicketAttachment>>[] = [];
  try {
    for (const file of attachmentFiles) {
      uploadedAttachments.push(await uploadTicketAttachment(parsed.ticketId, file));
    }
  } catch (uploadError) {
    if (uploadedAttachments.length > 0) {
      await deleteTicketAttachments(uploadedAttachments.map((uploaded) => uploaded.objectKey)).catch(() => {});
    }
    throw uploadError;
  }

  let commentId: string | null = null;
  try {
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

      for (const uploaded of uploadedAttachments) {
        await tx.insert(ticketAttachments).values({
          ticketId: parsed.ticketId,
          commentId: inserted[0].id,
          uploaderId: user.id,
          ...uploaded,
        });
      }

      await tx.update(tickets).set({ updatedAt: new Date() }).where(eq(tickets.id, parsed.ticketId));

      return inserted;
    });
    commentId = comment?.id ?? null;
  } catch (dbError) {
    if (uploadedAttachments.length > 0) {
      await deleteTicketAttachments(uploadedAttachments.map((uploaded) => uploaded.objectKey)).catch(() => {});
    }
    throw dbError;
  }

  if (!commentId) throw new Error("Comment could not be added.");

  await revalidateTicketPaths({
    ticketId: parsed.ticketId,
    projectId: ticket.projectId,
    includeDetail: true,
  });

  return { commentId };
}

async function getManageableComment({
  commentId,
  ticketId,
  user,
}: {
  commentId: string;
  ticketId: string;
  user: CurrentUser;
}) {
  const [comment] = await db
    .select({
      id: ticketComments.id,
      authorId: ticketComments.authorId,
      ticketId: ticketComments.ticketId,
      projectId: tickets.projectId,
      requesterId: tickets.requesterId,
      assigneeId: tickets.assigneeId,
    })
    .from(ticketComments)
    .innerJoin(tickets, eq(ticketComments.ticketId, tickets.id))
    .where(and(eq(ticketComments.id, commentId), eq(ticketComments.ticketId, ticketId)))
    .limit(1);

  if (!comment || !canViewTicket(user, comment)) {
    throw new Error("Comment not found.");
  }

  if (comment.authorId !== user.id && user.role !== "admin") {
    throw new Error("You can only change your own comments.");
  }

  return comment;
}

export async function updateCommentAction(formData: FormData) {
  const user = await requireUser();
  const parsed = updateCommentSchema.parse({
    ticketId: formData.get("ticketId"),
    commentId: formData.get("commentId"),
    body: formData.get("body"),
  });
  const comment = await getManageableComment({
    commentId: parsed.commentId,
    ticketId: parsed.ticketId,
    user,
  });

  const attachmentFiles = getAttachmentFiles(formData);
  for (const file of attachmentFiles) {
    if (file.size > maxAttachmentBytes) {
      throw new Error(attachmentSizeErrorMessage);
    }
  }

  // Upload to S3 before touching the database so a failed upload never leaves
  // the comment in a half-updated state.
  const uploadedAttachments: Awaited<ReturnType<typeof uploadTicketAttachment>>[] = [];
  try {
    for (const file of attachmentFiles) {
      uploadedAttachments.push(await uploadTicketAttachment(parsed.ticketId, file));
    }
  } catch (uploadError) {
    if (uploadedAttachments.length > 0) {
      await deleteTicketAttachments(uploadedAttachments.map((uploaded) => uploaded.objectKey)).catch(() => {});
    }
    throw uploadError;
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(ticketComments)
        .set({ body: parsed.body })
        .where(eq(ticketComments.id, parsed.commentId));

      for (const uploaded of uploadedAttachments) {
        await tx.insert(ticketAttachments).values({
          ticketId: parsed.ticketId,
          commentId: parsed.commentId,
          uploaderId: user.id,
          ...uploaded,
        });
      }

      await tx.update(tickets).set({ updatedAt: new Date() }).where(eq(tickets.id, parsed.ticketId));
    });
  } catch (dbError) {
    if (uploadedAttachments.length > 0) {
      await deleteTicketAttachments(uploadedAttachments.map((uploaded) => uploaded.objectKey)).catch(() => {});
    }
    throw dbError;
  }

  await revalidateTicketPaths({
    ticketId: parsed.ticketId,
    projectId: comment.projectId,
    includeDetail: true,
  });
}

export async function deleteCommentAttachmentAction(formData: FormData) {
  const user = await requireUser();
  const parsed = deleteCommentAttachmentSchema.parse({
    ticketId: formData.get("ticketId"),
    commentId: formData.get("commentId"),
    attachmentId: formData.get("attachmentId"),
  });
  const comment = await getManageableComment({
    commentId: parsed.commentId,
    ticketId: parsed.ticketId,
    user,
  });

  const [attachment] = await db
    .select({ objectKey: ticketAttachments.objectKey })
    .from(ticketAttachments)
    .where(
      and(
        eq(ticketAttachments.id, parsed.attachmentId),
        eq(ticketAttachments.commentId, parsed.commentId),
      ),
    )
    .limit(1);

  if (!attachment) {
    throw new Error("Attachment not found on this comment.");
  }

  await db.delete(ticketAttachments).where(eq(ticketAttachments.id, parsed.attachmentId));
  await db.update(tickets).set({ updatedAt: new Date() }).where(eq(tickets.id, parsed.ticketId));

  // The database rows are the source of truth; S3 cleanup is best-effort.
  try {
    await deleteTicketAttachments([attachment.objectKey]);
  } catch (cleanupError) {
    console.error("Failed to clean up S3 attachment", parsed.attachmentId, cleanupError);
  }

  await revalidateTicketPaths({
    ticketId: parsed.ticketId,
    projectId: comment.projectId,
    includeDetail: true,
  });
}

export async function deleteCommentAction(formData: FormData) {
  const user = await requireUser();
  const parsed = deleteCommentSchema.parse({
    ticketId: formData.get("ticketId"),
    commentId: formData.get("commentId"),
  });
  const comment = await getManageableComment({
    commentId: parsed.commentId,
    ticketId: parsed.ticketId,
    user,
  });

  // Replies cascade on comment deletion, so clean up the S3 objects of the
  // whole reply subtree, not just the comment itself.
  const ticketCommentsForSubtree = await db
    .select({ id: ticketComments.id, parentCommentId: ticketComments.parentCommentId })
    .from(ticketComments)
    .where(eq(ticketComments.ticketId, comment.ticketId));
  const commentIds = collectCommentSubtree(parsed.commentId, ticketCommentsForSubtree);

  const attachments =
    commentIds.length > 0
      ? await db
          .select({ objectKey: ticketAttachments.objectKey })
          .from(ticketAttachments)
          .where(inArray(ticketAttachments.commentId, commentIds))
      : [];

  // Attachment rows cascade on comment deletion.
  await db.delete(ticketComments).where(eq(ticketComments.id, parsed.commentId));
  await db.update(tickets).set({ updatedAt: new Date() }).where(eq(tickets.id, parsed.ticketId));

  if (attachments.length > 0) {
    try {
      await deleteTicketAttachments(attachments.map((attachment) => attachment.objectKey));
    } catch (cleanupError) {
      // The database rows are the source of truth; S3 cleanup is best-effort.
      console.error("Failed to clean up S3 attachments for comment", parsed.commentId, cleanupError);
    }
  }

  await revalidateTicketPaths({
    ticketId: parsed.ticketId,
    projectId: comment.projectId,
    includeDetail: true,
  });
}
