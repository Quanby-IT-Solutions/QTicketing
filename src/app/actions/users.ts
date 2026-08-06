"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userProjects, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { canManageUsers } from "@/lib/permissions";
import { updateUserAccessSchema } from "@/lib/validation";

export async function createUserAction(formData: FormData) {
  const currentUser = await requireUser();
  if (!canManageUsers(currentUser)) throw new Error("Only admins can create users.");

  const [user] = await db
    .insert(users)
    .values({
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim().toLowerCase(),
      role: String(formData.get("role") ?? "requester") as "admin" | "agent" | "requester",
      status: "approved",
      active: true,
      passwordHash: await hashPassword(String(formData.get("password") ?? "")),
    })
    .returning({ id: users.id });

  const projectIds = formData.getAll("projectIds").map(String);
  if (projectIds.length > 0) {
    await db.insert(userProjects).values(projectIds.map((projectId) => ({ userId: user.id, projectId })));
  }

  revalidatePath("/admin/users");
}

export async function updateUserAccessAction(formData: FormData) {
  const currentUser = await requireUser();
  if (!canManageUsers(currentUser)) throw new Error("Only admins can update users.");

  const parsed = updateUserAccessSchema.parse({
    userId: formData.get("userId"),
    role: formData.get("role"),
    status: formData.get("status"),
    active: formData.get("active") === "on",
    projectIds: formData.getAll("projectIds"),
  });

  await db
    .update(users)
    .set({
      role: parsed.role,
      status: parsed.status,
      active: parsed.active,
      updatedAt: new Date(),
    })
    .where(eq(users.id, parsed.userId));

  await db.delete(userProjects).where(eq(userProjects.userId, parsed.userId));
  if (parsed.projectIds.length > 0) {
    await db.insert(userProjects).values(parsed.projectIds.map((projectId) => ({ userId: parsed.userId, projectId })));
  }

  revalidatePath("/admin/users");
}
