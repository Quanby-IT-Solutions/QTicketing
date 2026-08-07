"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, userProjects } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { canManageUsers } from "@/lib/permissions";
import {
  createProjectSchema,
  updateProjectSchema,
  toggleProjectActiveSchema,
  deleteProjectSchema,
} from "@/lib/validation";

export async function createProjectAction(formData: FormData) {
  const currentUser = await requireUser();
  if (!canManageUsers(currentUser)) throw new Error("Only admins can create projects.");

  const parsed = createProjectSchema.parse({
    name: formData.get("name"),
    title: formData.get("title"),
  });

  const [inserted] = await db
    .insert(projects)
    .values({ name: parsed.name, title: parsed.title, active: true })
    .returning({ id: projects.id });

  await db.insert(userProjects).values({
    userId: currentUser.id,
    projectId: inserted.id,
  });

  revalidatePath("/admin/projects");
  revalidatePath("/admin/users");
  revalidatePath("/register");
}

export async function updateProjectAction(formData: FormData) {
  const currentUser = await requireUser();
  if (!canManageUsers(currentUser)) throw new Error("Only admins can update projects.");

  const parsed = updateProjectSchema.parse({
    projectId: formData.get("projectId"),
    name: formData.get("name"),
    title: formData.get("title"),
  });

  await db
    .update(projects)
    .set({ name: parsed.name, title: parsed.title })
    .where(eq(projects.id, parsed.projectId));

  revalidatePath("/admin/projects");
  revalidatePath("/admin/users");
  revalidatePath("/register");
}

export async function toggleProjectActiveAction(formData: FormData) {
  const currentUser = await requireUser();
  if (!canManageUsers(currentUser)) throw new Error("Only admins can update projects.");

  const parsed = toggleProjectActiveSchema.parse({
    projectId: formData.get("projectId"),
  });

  const [current] = await db
    .select({ active: projects.active })
    .from(projects)
    .where(eq(projects.id, parsed.projectId))
    .limit(1);

  if (!current) throw new Error("Project not found.");

  await db
    .update(projects)
    .set({ active: !current.active })
    .where(eq(projects.id, parsed.projectId));

  revalidatePath("/admin/projects");
  revalidatePath("/admin/users");
}

export async function deleteProjectAction(formData: FormData) {
  const currentUser = await requireUser();
  if (!canManageUsers(currentUser)) throw new Error("Only admins can delete projects.");

  const parsed = deleteProjectSchema.parse({
    projectId: formData.get("projectId"),
  });

  await db.delete(projects).where(eq(projects.id, parsed.projectId));

  revalidatePath("/admin/projects");
  revalidatePath("/admin/users");
  revalidatePath("/register");
  revalidatePath("/dashboard");
}
