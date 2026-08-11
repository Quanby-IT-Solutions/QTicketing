import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, ticketAttachments, ticketComments, tickets } from "@/db/schema";
import { authenticateApiRequest } from "@/lib/api-auth";
import { attachmentSizeErrorMessage, getTicketAttachmentObject, maxAttachmentBytes, uploadTicketAttachment } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function response(body: unknown, status: number, headers?: HeadersInit) { return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } }); }

export async function POST(request: Request, { params }: { params: Promise<{ projectCode: string; ticketId: string; commentId: string }> }) {
  const user = await authenticateApiRequest(request);
  if (!user) return response({ error: { code: "UNAUTHORIZED", message: "A valid Bearer API key is required." } }, 401, { "WWW-Authenticate": "Bearer" });
  const { projectCode, ticketId, commentId } = await params;
  const [comment] = await db.select({ id: ticketComments.id, authorId: ticketComments.authorId, ticketId: ticketComments.ticketId, projectId: tickets.projectId }).from(ticketComments).innerJoin(tickets, eq(ticketComments.ticketId, tickets.id)).where(and(eq(ticketComments.id, commentId), eq(ticketComments.ticketId, ticketId))).limit(1);
  if (!comment) return response({ error: { code: "COMMENT_NOT_FOUND", message: "The comment was not found." } }, 404);
  const [project] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, comment.projectId), eq(projects.name, projectCode.trim().toUpperCase()), eq(projects.active, true))).limit(1);
  if (!project) return response({ error: { code: "COMMENT_NOT_FOUND", message: "The comment was not found in this active project." } }, 404);
  if (user.role !== "admin" && (!user.projectIds.includes(project.id) || comment.authorId !== user.id)) return response({ error: { code: "FORBIDDEN", message: "You can only upload files to your own comments." } }, 403);
  if (!request.headers.get("content-type")?.toLowerCase().includes("multipart/form-data")) return response({ error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Content-Type must be multipart/form-data." } }, 415);
  let formData: FormData;
  try { formData = await request.formData(); } catch { return response({ error: { code: "INVALID_MULTIPART", message: "The upload form is invalid." } }, 400); }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > maxAttachmentBytes) return response({ error: { code: "VALIDATION_ERROR", message: attachmentSizeErrorMessage } }, 400);
  try {
    const uploaded = await uploadTicketAttachment(comment.ticketId, file);
    const [attachment] = await db.insert(ticketAttachments).values({ ticketId: comment.ticketId, commentId: comment.id, uploaderId: user.id, ...uploaded }).returning({ id: ticketAttachments.id, filename: ticketAttachments.filename, mimeType: ticketAttachments.mimeType, size: ticketAttachments.size, createdAt: ticketAttachments.createdAt });
    await db.update(tickets).set({ updatedAt: new Date() }).where(eq(tickets.id, comment.ticketId));
    return response({ data: { attachment: { ...attachment, createdAt: attachment.createdAt.toISOString() } } }, 201);
  } catch (error) { console.error("API comment attachment upload failed.", error); return response({ error: { code: "UPLOAD_FAILED", message: "Unable to upload the attachment." } }, 502); }
}

export async function GET(request: Request, { params }: { params: Promise<{ projectCode: string; ticketId: string; commentId: string }> }) {
  const user = await authenticateApiRequest(request); if (!user) return response({ error: { code: "UNAUTHORIZED", message: "A valid Bearer API key is required." } }, 401, { "WWW-Authenticate": "Bearer" });
  const { projectCode, ticketId, commentId } = await params;
  const [comment] = await db.select({ id: ticketComments.id, projectId: tickets.projectId }).from(ticketComments).innerJoin(tickets, eq(ticketComments.ticketId, tickets.id)).where(and(eq(ticketComments.id, commentId), eq(ticketComments.ticketId, ticketId))).limit(1);
  if (!comment) return response({ error: { code: "COMMENT_NOT_FOUND", message: "The comment was not found." } }, 404);
  const [project] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, comment.projectId), eq(projects.name, projectCode.trim().toUpperCase()), eq(projects.active, true))).limit(1);
  if (!project || (user.role !== "admin" && !user.projectIds.includes(project.id))) return response({ error: { code: "FORBIDDEN", message: "This API key cannot view files for this project." } }, 403);
  const attachments = await db.select({ id: ticketAttachments.id, filename: ticketAttachments.filename, mimeType: ticketAttachments.mimeType, size: ticketAttachments.size, createdAt: ticketAttachments.createdAt }).from(ticketAttachments).where(eq(ticketAttachments.commentId, comment.id));
  return response({ data: { attachments: attachments.map((attachment) => ({ ...attachment, createdAt: attachment.createdAt.toISOString() })) } }, 200);
}
