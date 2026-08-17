import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, userProjects } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getTicketAttachmentObject } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const [project] = await db.select({ logoObjectKey: projects.logoObjectKey, logoMimeType: projects.logoMimeType }).from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project?.logoObjectKey) return NextResponse.json({ error: "Logo not found" }, { status: 404 });
  if (user.role !== "admin") {
    const [membership] = await db.select({ projectId: userProjects.projectId }).from(userProjects).where(and(eq(userProjects.userId, user.id), eq(userProjects.projectId, projectId))).limit(1);
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const object = await getTicketAttachmentObject(project.logoObjectKey);
    if (!object.Body) return NextResponse.json({ error: "Logo not found" }, { status: 404 });
    return new NextResponse(object.Body.transformToWebStream(), { headers: { "Cache-Control": "private, max-age=3600", "Content-Type": project.logoMimeType || "image/*", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    console.error("Project logo download failed.", error);
    return NextResponse.json({ error: "Unable to download logo" }, { status: 502 });
  }
}
