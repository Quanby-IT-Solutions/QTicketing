import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db";
import { projects, userProjects } from "@/db/schema";
import { TicketForm } from "@/components/ticket-form";
import { requireUser } from "@/lib/auth";

export default async function NewProjectTicketPage({ params }: { params: Promise<{ projectCode: string }> }) {
  const { projectCode } = await params;
  const user = await requireUser();
  const code = decodeURIComponent(projectCode).toUpperCase();
  const [project] = await db.select().from(projects).where(eq(projects.name, code)).limit(1);

  if (!project || !project.active) notFound();

  if (user.role !== "admin") {
    const access = await db
      .select({ projectId: userProjects.projectId })
      .from(userProjects)
      .where(eq(userProjects.userId, user.id))
      .then((rows) => rows.some((row) => row.projectId === project.id));
    if (!access) notFound();
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <Badge className="mb-3 font-mono" variant="outline">{project.name}</Badge>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Create a new ticket</h1>
        <p className="mt-1 text-sm text-muted-foreground">This request will be filed under {project.title}.</p>
      </div>
      <TicketForm selectedProject={project} />
    </div>
  );
}
