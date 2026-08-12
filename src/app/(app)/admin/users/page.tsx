import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { Check, CheckCircle2, Clock3, FolderPlus, ShieldCheck, ShieldPlus, UsersRound, X } from "lucide-react";
import { reviewProjectAccessAction } from "@/app/actions/project-access";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateUserDialog } from "@/components/create-user-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserAccessActions } from "@/components/user-access-actions";
import { db } from "@/db";
import { projectAccessRequests, projects, userProjects, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

const statusClass = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
};

export const metadata: Metadata = {
  title: "Users",
};

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const currentUser = await requireUser();
  if (currentUser.role !== "admin") redirect("/tickets");
  const { page: pageParam } = await searchParams;

  const [userRows, projectRows, accessRows, accessRequestRows] = await Promise.all([
    db.select().from(users).orderBy(asc(users.status), asc(users.name)),
    db.select().from(projects).orderBy(asc(projects.title)),
    db.select().from(userProjects),
    db
      .select({
        id: projectAccessRequests.id,
        requestedAt: projectAccessRequests.requestedAt,
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        projectId: projects.id,
        projectName: projects.name,
        projectTitle: projects.title,
      })
      .from(projectAccessRequests)
      .innerJoin(users, eq(projectAccessRequests.userId, users.id))
      .innerJoin(projects, eq(projectAccessRequests.projectId, projects.id))
      .where(eq(projectAccessRequests.status, "pending"))
      .orderBy(desc(projectAccessRequests.requestedAt)),
  ]);

  const accessByUser = new Map<string, Set<string>>();
  for (const row of accessRows) {
    const set = accessByUser.get(row.userId) ?? new Set<string>();
    set.add(row.projectId);
    accessByUser.set(row.userId, set);
  }

  const manageableUserRows = userRows;
  const pendingCount = manageableUserRows.filter((user) => user.status === "pending").length;
  const activeCount = manageableUserRows.filter((user) => user.active && user.status === "approved").length;
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(manageableUserRows.length / pageSize));
  const requestedPage = Number(pageParam);
  const currentPage = Number.isSafeInteger(requestedPage) ? Math.min(Math.max(requestedPage, 1), pageCount) : 1;
  const pageStart = (currentPage - 1) * pageSize;
  const pagedUserRows = manageableUserRows.slice(pageStart, pageStart + pageSize);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-primary">Administration</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">User management</h1>
          <p className="mt-1 text-sm text-muted-foreground">Approve registrations and project requests, assign roles, and control access.</p>
        </div>
        <CreateUserDialog projects={projectRows} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><UsersRound className="size-5" /></span>
            <div><p className="text-2xl font-semibold tabular-nums">{manageableUserRows.length}</p><p className="text-xs text-muted-foreground">Managed accounts</p></div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Clock3 className="size-5" /></span>
            <div><p className="text-2xl font-semibold tabular-nums">{pendingCount}</p><p className="text-xs text-muted-foreground">Awaiting approval</p></div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><CheckCircle2 className="size-5" /></span>
            <div><p className="text-2xl font-semibold tabular-nums">{activeCount}</p><p className="text-xs text-muted-foreground">Approved & active</p></div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><ShieldPlus className="size-5" /></span>
            <div><p className="text-2xl font-semibold tabular-nums">{accessRequestRows.length}</p><p className="text-xs text-muted-foreground">Project requests</p></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2"><FolderPlus className="size-4 text-primary" />Project access requests</CardTitle>
          <CardDescription>Approve a request to add the project directly to the user&apos;s account.</CardDescription>
        </CardHeader>
        {accessRequestRows.length > 0 ? (
          <div className="divide-y">
            {accessRequestRows.map((request) => (
              <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center" key={request.id}>
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <Avatar><AvatarFallback>{initials(request.userName)}</AvatarFallback></Avatar>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{request.userName}</p>
                      <Badge className="border-amber-200 bg-amber-50 text-amber-700" variant="outline">Pending</Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{request.userEmail}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                      <span className="rounded-md bg-primary/10 px-2 py-1 font-mono text-xs font-semibold text-primary">{request.projectName}</span>
                      <span className="text-muted-foreground">{request.projectTitle}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Requested {request.requestedAt.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 pl-11 lg:pl-0">
                  <form action={reviewProjectAccessAction}>
                    <input name="requestId" type="hidden" value={request.id} />
                    <input name="decision" type="hidden" value="reject" />
                    <Button aria-label={`Reject ${request.projectName} access for ${request.userName}`} type="submit" variant="outline">
                      <X data-icon="inline-start" />Reject
                    </Button>
                  </form>
                  <form action={reviewProjectAccessAction}>
                    <input name="requestId" type="hidden" value={request.id} />
                    <input name="decision" type="hidden" value="approve" />
                    <Button aria-label={`Approve ${request.projectName} access for ${request.userName}`} type="submit">
                      <Check data-icon="inline-start" />Approve
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <CardContent>
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10 text-center">
              <ShieldCheck className="mb-3 size-8 text-muted-foreground/60" />
              <p className="text-sm font-medium">No pending project requests</p>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">New requests submitted from Settings will appear here for review.</p>
            </div>
          </CardContent>
        )}
      </Card>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div><h2 className="font-heading text-lg font-semibold">Accounts</h2><p className="text-sm text-muted-foreground">Review and update access one account at a time.</p></div>
          <Badge variant="outline">{manageableUserRows.length} users</Badge>
        </div>

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Approval</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Projects</TableHead>
                <TableHead className="text-right">Permissions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedUserRows.map((user) => {
                const userAccess = accessByUser.get(user.id) ?? new Set<string>();
                const projectCodes = projectRows
                  .filter((project) => userAccess.has(project.id))
                  .map((project) => project.name);

                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex min-w-60 items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{initials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{user.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="capitalize" variant="outline">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusClass[user.status]} variant="outline">
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.active ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-80 flex-wrap gap-1">
                        {projectCodes.length > 0 ? (
                          projectCodes.map((code) => (
                            <Badge className="font-mono" key={code} variant="secondary">
                              {code}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">No projects</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <UserAccessActions
                        projects={projectRows}
                        user={{
                          id: user.id,
                          name: user.name,
                          email: user.email,
                          role: user.role,
                          status: user.status,
                          active: user.active,
                          projectIds: Array.from(userAccess),
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground">
              {manageableUserRows.length === 0
                ? "No accounts to show"
                : `Showing ${pageStart + 1}-${Math.min(pageStart + pageSize, manageableUserRows.length)} of ${manageableUserRows.length} users`}
            </p>
            <div className="flex items-center gap-2">
              {currentPage === 1 ? (
                <Button disabled size="sm" variant="outline">Previous</Button>
              ) : (
                <Link className={cn(buttonVariants({ size: "sm", variant: "outline" }))} href={`/admin/users?page=${currentPage - 1}`}>Previous</Link>
              )}
              <span className="text-xs text-muted-foreground">Page {currentPage} of {pageCount}</span>
              {currentPage === pageCount ? (
                <Button disabled size="sm" variant="outline">Next</Button>
              ) : (
                <Link className={cn(buttonVariants({ size: "sm", variant: "outline" }))} href={`/admin/users?page=${currentPage + 1}`}>Next</Link>
              )}
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
