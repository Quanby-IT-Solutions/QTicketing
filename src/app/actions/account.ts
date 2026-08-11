"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z.string().min(8, "New password must be at least 8 characters.").max(128),
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"], message: "New passwords do not match.",
  });

export async function changePasswordAction(formData: FormData) {
  const user = await requireUser();
  const parsed = changePasswordSchema.parse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  const [account] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, user.id)).limit(1);
  if (!account || !(await verifyPassword(account.passwordHash, parsed.currentPassword))) {
    throw new Error("Your current password is incorrect.");
  }
  if (await verifyPassword(account.passwordHash, parsed.newPassword)) {
    throw new Error("Choose a new password that is different from your current password.");
  }
  await db.update(users).set({ passwordHash: await hashPassword(parsed.newPassword), updatedAt: new Date() }).where(eq(users.id, user.id));
}
