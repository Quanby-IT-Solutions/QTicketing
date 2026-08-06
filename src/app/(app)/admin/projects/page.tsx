import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { FolderKanban, Plus, Shapes } from "lucide-react";
import { createProjectAction } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { requireUser } from "@/lib/auth";

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
        <Badge className="w-fit gap-1.5" variant="outline">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          {activeCount} active
        </Badge>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Plus className="size-4 text-primary" />
            Add a project
          </CardTitle>
          <CardDescription>Create a short code and a descriptive display name for the sidebar and ticket forms.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createProjectAction} className="grid gap-5 md:grid-cols-[minmax(10rem,0.65fr)_minmax(16rem,1.35fr)_auto] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="name">Project code</Label>
              <Input className="font-mono uppercase" id="name" maxLength={40} name="name" placeholder="FINANCE" required />
              <p className="text-xs text-muted-foreground">Uppercase letters, numbers, and hyphens.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Display name</Label>
              <Input id="title" maxLength={120} name="title" placeholder="Finance Management System" required />
              <p className="text-xs text-muted-foreground">Shown throughout ticket forms and tables.</p>
            </div>
            <Button className="md:mb-5" type="submit">
              <Plus data-icon="inline-start" />
              Add project
            </Button>
          </form>
        </CardContent>
      </Card>

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
                  <TableHead scope="col">Created</TableHead>
                  <TableHead className="text-right" scope="col">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectRows.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Shapes className="size-4" />
                        </span>
                        <span className="font-medium">{project.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs font-medium">{project.name}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{project.createdAt.toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        className={project.active
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "text-muted-foreground"}
                        variant="outline"
                      >
                        {project.active ? "Active" : "Inactive"}
                      </Badge>
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
