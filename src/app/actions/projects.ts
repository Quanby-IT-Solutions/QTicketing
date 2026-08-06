"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { canManageUsers } from "@/lib/permissions";
import { createProjectSchema } from "@/lib/validation";

export async function createProjectAction(formData: FormData) {
  const currentUser = await requireUser();
  if (!canManageUsers(currentUser)) throw new Error("Only admins can create projects.");

  const parsed = createProjectSchema.parse({
    name: formData.get("name"),
    title: formData.get("title"),
  });

  await db.insert(projects).values({
    name: parsed.name,
    title: parsed.title,
    active: true,
  });

  revalidatePath("/admin/projects");
  revalidatePath("/admin/users");
  revalidatePath("/register");
}
