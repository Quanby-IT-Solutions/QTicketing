import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, ticketAttachments, ticketComments, tickets } from "@/db/schema";
import { authenticateApiRequest } from "@/lib/api-auth";
import { updateApiCommentSchema } from "@/lib/api-ticket-validation";
import { collectCommentSubtree } from "@/lib/comment-tree";
import { deleteTicketAttachments } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ projectCode: string; ticketId: string; commentId: string }> };
function response(body: unknown, status: number, headers?: HeadersInit) { return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } }); }

async function getAuthorizedComment(request: Request, { params }: Context) {
  const user = await authenticateApiRequest(request);
  if (!user) return { error: response({ error: { code: "UNAUTHORIZED", message: "A valid Bearer API key is required." } }, 401, { "WWW-Authenticate": "Bearer" }) };
  const { projectCode, ticketId, commentId } = await params;
  const [comment] = await db.select({ id: ticketComments.id, authorId: ticketComments.authorId, ticketId: ticketComments.ticketId, projectId: tickets.projectId }).from(ticketComments).innerJoin(tickets, eq(ticketComments.ticketId, tickets.id)).where(and(eq(ticketComments.id, commentId), eq(ticketComments.ticketId, ticketId))).limit(1);
  if (!comment) return { error: response({ error: { code: "COMMENT_NOT_FOUND", message: "The comment was not found." } }, 404) };
  const [project] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, comment.projectId), eq(projects.name, projectCode.trim().toUpperCase()), eq(projects.active, true))).limit(1);
  if (!project) return { error: response({ error: { code: "COMMENT_NOT_FOUND", message: "The comment was not found in this active project." } }, 404) };
  if (user.role !== "admin" && !user.projectIds.includes(project.id)) return { error: response({ error: { code: "FORBIDDEN", message: "This API key cannot access comments for this project." } }, 403) };
  if (user.role !== "admin" && comment.authorId !== user.id) return { error: response({ error: { code: "FORBIDDEN", message: "You can only change your own comments." } }, 403) };
  return { user, comment };
}

export async function PATCH(request: Request, context: Context) {
  const result = await getAuthorizedComment(request, context);
  if ("error" in result) return result.error;
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return response({ error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Content-Type must be application/json." } }, 415);
  let body: unknown;
  try { body = await request.json(); } catch { return response({ error: { code: "INVALID_JSON", message: "Request body must be valid JSON." } }, 400); }
  const parsed = updateApiCommentSchema.safeParse(body);
  if (!parsed.success) return response({ error: { code: "VALIDATION_ERROR", message: "The submitted comment is invalid.", fields: parsed.error.flatten().fieldErrors } }, 400);
  const [comment] = await db.transaction(async (tx) => {
    const updated = await tx.update(ticketComments).set({ body: parsed.data.body }).where(eq(ticketComments.id, result.comment.id)).returning();
    await tx.update(tickets).set({ updatedAt: new Date() }).where(eq(tickets.id, result.comment.ticketId));
    return updated;
  });
  return response({ data: { comment: { ...comment, createdAt: comment.createdAt.toISOString() } } }, 200);
}

export async function DELETE(request: Request, context: Context) {
  const result = await getAuthorizedComment(request, context);
  if ("error" in result) return result.error;
  const allComments = await db.select({ id: ticketComments.id, parentCommentId: ticketComments.parentCommentId }).from(ticketComments).where(eq(ticketComments.ticketId, result.comment.ticketId));
  const commentIds = collectCommentSubtree(result.comment.id, allComments);
  const attachments = commentIds.length ? await db.select({ objectKey: ticketAttachments.objectKey }).from(ticketAttachments).where(inArray(ticketAttachments.commentId, commentIds)) : [];
  await db.transaction(async (tx) => { await tx.delete(ticketComments).where(eq(ticketComments.id, result.comment.id)); await tx.update(tickets).set({ updatedAt: new Date() }).where(eq(tickets.id, result.comment.ticketId)); });
  if (attachments.length) await deleteTicketAttachments(attachments.map((attachment) => attachment.objectKey)).catch((error) => console.error("API comment attachment cleanup failed.", error));
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
