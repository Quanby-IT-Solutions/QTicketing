import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/db";
import { projects, userProjects } from "@/db/schema";
import { TicketForm } from "@/components/ticket-form";
import { requireUser } from "@/lib/auth";

export async function generateMetadata({ params }: { params: Promise<{ projectCode: string }> }): Promise<Metadata> {
  const { projectCode } = await params;
  const code = decodeURIComponent(projectCode).toUpperCase();
  const [project] = await db.select().from(projects).where(eq(projects.name, code)).limit(1);
  return { title: project ? `New ${project.name} Ticket` : "New Ticket" };
}

export default async function NewProjectTicketPage({ params }: { params: Promise<{ projectCode: string }> }) {
  const { projectCode } = await params;
  const user = await requireUser();
  const code = decodeURIComponent(projectCode).toUpperCase();
  const [project] = await db.select().from(projects).where(eq(projects.name, code)).limit(1);

  if (!project) notFound();

  if (!project.active) {
    return (
      <div className="mx-auto flex min-h-[calc(100svh-12rem)] w-full max-w-4xl items-center justify-center px-4">
        <Card className="w-full border-blue-200 bg-blue-50/40">
          <CardContent className="flex flex-col items-center px-6 py-12 text-center">
            <span className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 ring-1 ring-blue-200">
              <Wrench className="size-7" />
            </span>
            <Badge className="mb-3 font-mono" variant="outline">
              {project.name}
            </Badge>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Currently updating project configuration
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              The project <span className="font-medium text-foreground">{project.title}</span> is
              temporarily unavailable while its configuration is being updated.
              Please check back shortly.
            </p>
            <Link
              className={buttonVariants({ variant: "outline" }) + " mt-6 justify-center"}
              href="/tickets"
            >
              <ArrowLeft data-icon="inline-start" />
              Back to tickets
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

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
