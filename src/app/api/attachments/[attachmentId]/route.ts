import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { ticketAttachments, tickets, userProjects } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getAttachmentDownloadFilename, getTicketAttachmentObject } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ attachmentId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { attachmentId } = await params;
  const [attachment] = await db
    .select({ id: ticketAttachments.id, ticketId: ticketAttachments.ticketId, objectKey: ticketAttachments.objectKey, filename: ticketAttachments.filename, mimeType: ticketAttachments.mimeType, size: ticketAttachments.size, projectId: tickets.projectId })
    .from(ticketAttachments)
    .innerJoin(tickets, eq(ticketAttachments.ticketId, tickets.id))
    .where(eq(ticketAttachments.id, attachmentId))
    .limit(1);
  if (!attachment) return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  if (user.role !== "admin") {
    const [membership] = await db.select({ projectId: userProjects.projectId }).from(userProjects).where(and(eq(userProjects.userId, user.id), eq(userProjects.projectId, attachment.projectId))).limit(1);
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const object = await getTicketAttachmentObject(attachment.objectKey);
    if (!object.Body) return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    const filename = getAttachmentDownloadFilename(attachment.filename);
    return new NextResponse(object.Body.transformToWebStream(), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Content-Length": String(attachment.size),
        "Content-Type": attachment.mimeType || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Attachment download failed.", error);
    return NextResponse.json({ error: "Unable to download attachment" }, { status: 502 });
  }
}
