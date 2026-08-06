"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userProjects, users } from "@/db/schema";
import { createSession, destroySession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { registerSchema } from "@/lib/validation";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !user.active || user.status !== "approved" || !(await verifyPassword(user.passwordHash, password))) {
    throw new Error("Invalid email or password.");
  }

  await createSession(user.id);
  redirect("/tickets");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function registerAction(formData: FormData) {
  const parsed = registerSchema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    projectIds: formData.getAll("projectIds"),
  });

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, parsed.email.toLowerCase())).limit(1);
  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  const [user] = await db
    .insert(users)
    .values({
      name: parsed.name,
      email: parsed.email.toLowerCase(),
      passwordHash: await hashPassword(parsed.password),
      role: "requester",
      status: "pending",
      active: true,
    })
    .returning({ id: users.id });

  await db.insert(userProjects).values(parsed.projectIds.map((projectId) => ({ userId: user.id, projectId })));
  redirect("/login?registered=1");
}
