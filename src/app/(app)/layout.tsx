import { AppShell } from "@/components/app-shell";
import { db } from "@/db";
import { projects, userProjects } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { asc, eq, inArray } from "drizzle-orm";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const allowedProjectIds =
    user.role === "admin"
      ? null
      : (
          await db.select({ projectId: userProjects.projectId }).from(userProjects).where(eq(userProjects.userId, user.id))
        ).map((row) => row.projectId);
  const projectRows =
    allowedProjectIds === null
      ? await db.select().from(projects).where(eq(projects.active, true)).orderBy(asc(projects.name))
      : allowedProjectIds.length > 0
        ? await db.select().from(projects).where(inArray(projects.id, allowedProjectIds)).orderBy(asc(projects.name))
        : [];

  return <AppShell projects={projectRows} user={user}>{children}</AppShell>;
}
