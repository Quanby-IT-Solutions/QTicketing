import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, ticketAttachments, ticketComments, tickets } from "@/db/schema";
import { authenticateApiRequest } from "@/lib/api-auth";
import { getTicketAttachmentObject } from "@/lib/storage";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
function response(body: unknown, status: number, headers?: HeadersInit) { return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } }); }
export async function GET(request: Request, { params }: { params: Promise<{ projectCode: string; ticketId: string; commentId: string; attachmentId: string }> }) {
  const user = await authenticateApiRequest(request); if (!user) return response({ error: { code: "UNAUTHORIZED", message: "A valid Bearer API key is required." } }, 401, { "WWW-Authenticate": "Bearer" });
  const { projectCode, ticketId, commentId, attachmentId } = await params;
  const [attachment] = await db.select({ objectKey: ticketAttachments.objectKey, filename: ticketAttachments.filename, mimeType: ticketAttachments.mimeType, size: ticketAttachments.size, projectId: tickets.projectId }).from(ticketAttachments).innerJoin(ticketComments, eq(ticketAttachments.commentId, ticketComments.id)).innerJoin(tickets, eq(ticketComments.ticketId, tickets.id)).where(and(eq(ticketAttachments.id, attachmentId), eq(ticketAttachments.commentId, commentId), eq(ticketComments.ticketId, ticketId))).limit(1);
  if (!attachment) return response({ error: { code: "ATTACHMENT_NOT_FOUND", message: "The attachment was not found." } }, 404);
  const [project] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, attachment.projectId), eq(projects.name, projectCode.trim().toUpperCase()), eq(projects.active, true))).limit(1);
  if (!project || (user.role !== "admin" && !user.projectIds.includes(project.id))) return response({ error: { code: "FORBIDDEN", message: "This API key cannot view this attachment." } }, 403);
  try { const object = await getTicketAttachmentObject(attachment.objectKey); if (!object.Body) return response({ error: { code: "ATTACHMENT_NOT_FOUND", message: "The attachment was not found." } }, 404); const filename = attachment.filename.replace(/["\\\r\n]/g, "_"); return new NextResponse(object.Body.transformToWebStream(), { headers: { "Cache-Control": "private, no-store", "Content-Disposition": `inline; filename="${filename}"`, "Content-Length": String(attachment.size), "Content-Type": attachment.mimeType || "application/octet-stream", "X-Content-Type-Options": "nosniff" } }); } catch (error) { console.error("API comment attachment download failed.", error); return response({ error: { code: "DOWNLOAD_FAILED", message: "Unable to download the attachment." } }, 502); }
}
