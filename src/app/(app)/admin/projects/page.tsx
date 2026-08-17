import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { FolderKanban, Shapes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProjectActions } from "@/components/project-actions";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Projects",
};

const classificationLabels = {
  "white-label": "White Label",
  custom: "Custom / Bespoke",
  internal: "Internal",
  product: "Product",
} as const;

export default async function ProjectsPage() {
  const currentUser = await requireUser();
  if (currentUser.role !== "admin") redirect("/tickets");

  const projectRows = await db.select().from(projects).orderBy(asc(projects.title));
  const activeCount = projectRows.filter((project) => project.active).length;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-primary">Administration</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure the project workspaces available for ticket routing.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="w-fit gap-1.5" variant="outline">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            {activeCount} active
          </Badge>
          <CreateProjectDialog />
        </div>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="size-4 text-primary" />
            Project directory
          </CardTitle>
          <CardDescription>{projectRows.length} configured {projectRows.length === 1 ? "project" : "projects"}</CardDescription>
        </CardHeader>
        {projectRows.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Project</TableHead>
                  <TableHead scope="col">Code</TableHead>
                  <TableHead scope="col">Type</TableHead>
                  <TableHead scope="col">Created</TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead className="text-right" scope="col">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectRows.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10 text-primary">
                          {project.logoObjectKey ? <img alt="" className="size-full object-cover" src={`/api/projects/${project.id}/logo`} /> : <Shapes className="size-4" />}
                        </span>
                        <span className="font-medium">{project.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs font-medium">{project.name}</span>
                    </TableCell>
                    <TableCell><Badge variant="secondary">{classificationLabels[project.classification as keyof typeof classificationLabels]}</Badge></TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{project.createdAt.toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge
                        className={project.active
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "text-muted-foreground"}
                        variant="outline"
                      >
                        {project.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <ProjectActions
                        project={{
                          id: project.id,
                          name: project.name,
                          title: project.title,
                          logoObjectKey: project.logoObjectKey,
                          classification: project.classification,
                          active: project.active,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <CardContent>
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon"><FolderKanban /></EmptyMedia>
                <EmptyTitle>No projects yet</EmptyTitle>
                <EmptyDescription>Add the first project above to begin routing tickets.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
