import type { Metadata } from "next";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { projects, userProjects } from "@/db/schema";
import { TicketForm } from "@/components/ticket-form";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "New Ticket",
};

export default async function NewTicketPage() {
  const user = await requireUser();
  const allowedProjectIds =
    user.role === "admin"
      ? null
      : (
          await db.select({ projectId: userProjects.projectId }).from(userProjects).where(eq(userProjects.userId, user.id))
        ).map((row) => row.projectId);
  const projectRows =
    allowedProjectIds === null
      ? await db.select().from(projects).where(eq(projects.active, true)).orderBy(asc(projects.title))
      : allowedProjectIds.length > 0
        ? await db.select().from(projects).where(inArray(projects.id, allowedProjectIds)).orderBy(asc(projects.title))
        : [];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <p className="mb-1 text-sm font-medium text-primary">New request</p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Create a new ticket</h1>
        <p className="mt-1 text-sm text-muted-foreground">Choose the project that should receive this request.</p>
      </div>
      <TicketForm projects={projectRows} />
    </div>
  );
}
