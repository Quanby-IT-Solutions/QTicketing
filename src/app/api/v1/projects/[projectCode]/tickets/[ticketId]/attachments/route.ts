import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, ticketAttachments, tickets } from "@/db/schema";
import { authenticateApiRequest } from "@/lib/api-auth";
import { attachmentSizeErrorMessage, maxAttachmentBytes, uploadTicketAttachment } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(body: unknown, status: number, headers?: HeadersInit) { return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } }); }

export async function POST(request: Request, { params }: { params: Promise<{ projectCode: string; ticketId: string }> }) {
  const user = await authenticateApiRequest(request);
  if (!user) return response({ error: { code: "UNAUTHORIZED", message: "A valid Bearer API key is required." } }, 401, { "WWW-Authenticate": "Bearer" });
  const { projectCode, ticketId } = await params;
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);
  if (!ticket) return response({ error: { code: "TICKET_NOT_FOUND", message: "The ticket was not found." } }, 404);
  const [project] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, ticket.projectId), eq(projects.name, projectCode.trim().toUpperCase()), eq(projects.active, true))).limit(1);
  if (!project) return response({ error: { code: "TICKET_NOT_FOUND", message: "The ticket was not found in this active project." } }, 404);
  if (user.role !== "admin" && !user.projectIds.includes(project.id)) return response({ error: { code: "FORBIDDEN", message: "This API key cannot upload files to this project." } }, 403);
  if (!request.headers.get("content-type")?.toLowerCase().includes("multipart/form-data")) return response({ error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Content-Type must be multipart/form-data." } }, 415);
  let formData: FormData;
  try { formData = await request.formData(); } catch { return response({ error: { code: "INVALID_MULTIPART", message: "The upload form is invalid." } }, 400); }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > maxAttachmentBytes) return response({ error: { code: "VALIDATION_ERROR", message: attachmentSizeErrorMessage } }, 400);
  try {
    const uploaded = await uploadTicketAttachment(ticket.id, file);
    const [attachment] = await db.insert(ticketAttachments).values({ ticketId: ticket.id, uploaderId: user.id, ...uploaded }).returning({ id: ticketAttachments.id, filename: ticketAttachments.filename, mimeType: ticketAttachments.mimeType, size: ticketAttachments.size, createdAt: ticketAttachments.createdAt });
    await db.update(tickets).set({ updatedAt: new Date() }).where(eq(tickets.id, ticket.id));
    return response({ data: { attachment: { ...attachment, createdAt: attachment.createdAt.toISOString() } } }, 201);
  } catch (error) { console.error("API ticket attachment upload failed.", error); return response({ error: { code: "UPLOAD_FAILED", message: "Unable to upload the attachment." } }, 502); }
}

export async function GET(request: Request, { params }: { params: Promise<{ projectCode: string; ticketId: string }> }) {
  const user = await authenticateApiRequest(request);
  if (!user) return response({ error: { code: "UNAUTHORIZED", message: "A valid Bearer API key is required." } }, 401, { "WWW-Authenticate": "Bearer" });
  const { projectCode, ticketId } = await params;
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);
  if (!ticket) return response({ error: { code: "TICKET_NOT_FOUND", message: "The ticket was not found." } }, 404);
  const [project] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, ticket.projectId), eq(projects.name, projectCode.trim().toUpperCase()), eq(projects.active, true))).limit(1);
  if (!project) return response({ error: { code: "TICKET_NOT_FOUND", message: "The ticket was not found in this active project." } }, 404);
  if (user.role !== "admin" && !user.projectIds.includes(project.id)) return response({ error: { code: "FORBIDDEN", message: "This API key cannot view files for this project." } }, 403);
  const attachments = await db.select({ id: ticketAttachments.id, filename: ticketAttachments.filename, mimeType: ticketAttachments.mimeType, size: ticketAttachments.size, createdAt: ticketAttachments.createdAt }).from(ticketAttachments).where(and(eq(ticketAttachments.ticketId, ticket.id), isNull(ticketAttachments.commentId)));
  return response({ data: { attachments: attachments.map((attachment) => ({ ...attachment, createdAt: attachment.createdAt.toISOString() })) } }, 200);
}
