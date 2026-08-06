"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { projectAccessRequests, projects, userProjects } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { requestProjectAccessSchema, reviewProjectAccessSchema } from "@/lib/validation";

export async function requestProjectAccessAction(formData: FormData) {
  const currentUser = await requireUser();
  if (currentUser.role === "admin") {
    throw new Error("Admins already have access to every active project.");
  }

  const parsed = requestProjectAccessSchema.parse({
    projectIds: formData.getAll("projectIds"),
  });
  const requestedProjectIds = [...new Set(parsed.projectIds)];

  const requestedCount = await db.transaction(async (tx) => {
    const activeProjectRows = await tx
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.active, true), inArray(projects.id, requestedProjectIds)));

    if (activeProjectRows.length === 0) return 0;

    const activeProjectIds = activeProjectRows.map((project) => project.id);
    const assignedProjectRows = await tx
      .select({ projectId: userProjects.projectId })
      .from(userProjects)
      .where(and(eq(userProjects.userId, currentUser.id), inArray(userProjects.projectId, activeProjectIds)));
    const assignedProjectIds = new Set(assignedProjectRows.map((assignment) => assignment.projectId));
    const eligibleProjectIds = activeProjectIds.filter((projectId) => !assignedProjectIds.has(projectId));

    if (eligibleProjectIds.length === 0) return 0;

    const requestedAt = new Date();
    const changedRequests = await tx
      .insert(projectAccessRequests)
      .values(
        eligibleProjectIds.map((projectId) => ({
          userId: currentUser.id,
          projectId,
          status: "pending" as const,
          requestedAt,
          reviewedById: null,
          reviewedAt: null,
        })),
      )
      .onConflictDoUpdate({
        target: [projectAccessRequests.userId, projectAccessRequests.projectId],
        set: {
          status: "pending",
          requestedAt,
          reviewedById: null,
          reviewedAt: null,
        },
        setWhere: ne(projectAccessRequests.status, "pending"),
      })
      .returning({ id: projectAccessRequests.id });

    return changedRequests.length;
  });

  revalidatePath("/settings");
  revalidatePath("/admin/users");

  return { requestedCount };
}

export async function reviewProjectAccessAction(formData: FormData) {
  const currentUser = await requireUser();
  if (currentUser.role !== "admin") {
    throw new Error("Only admins can review project access requests.");
  }

  const parsed = reviewProjectAccessSchema.parse({
    requestId: formData.get("requestId"),
    decision: formData.get("decision"),
  });
  const nextStatus = parsed.decision === "approve" ? "approved" : "rejected";

  await db.transaction(async (tx) => {
    const [request] = await tx
      .select({
        id: projectAccessRequests.id,
        userId: projectAccessRequests.userId,
        projectId: projectAccessRequests.projectId,
        status: projectAccessRequests.status,
      })
      .from(projectAccessRequests)
      .where(eq(projectAccessRequests.id, parsed.requestId))
      .limit(1)
      .for("update");

    if (!request) throw new Error("Project access request not found.");

    if (request.status !== "pending") {
      if (request.status === nextStatus) return;
      throw new Error("This project access request has already been reviewed.");
    }

    if (nextStatus === "approved") {
      await tx
        .insert(userProjects)
        .values({ userId: request.userId, projectId: request.projectId })
        .onConflictDoNothing({ target: [userProjects.userId, userProjects.projectId] });
    }

    await tx
      .update(projectAccessRequests)
      .set({
        status: nextStatus,
        reviewedById: currentUser.id,
        reviewedAt: new Date(),
      })
      .where(and(eq(projectAccessRequests.id, request.id), eq(projectAccessRequests.status, "pending")));
  });

  revalidatePath("/admin/users");
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/tickets");
}
