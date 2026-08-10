import type { Metadata } from "next";
import { asc, desc, eq } from "drizzle-orm";
import {
  AtSign,
  CheckCircle2,
  Clock3,
  FolderCheck,
  FolderKey,
  History,
  Send,
  Shield,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import { ProjectAccessRequestForm } from "@/components/project-access-request-form";
import {
  ApiKeyManager,
  type ApiKeyListItem,
} from "@/components/api-key-manager";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { db } from "@/db";
import {
  projectAccessRequests,
  projects,
  userProjects,
  type ProjectAccessRequestStatus,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { listApiKeys } from "@/lib/api-keys";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

const requestStatus = {
  pending: {
    label: "Pending",
    className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
    icon: Clock3,
  },
  approved: {
    label: "Approved",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    className: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300",
    icon: XCircle,
  },
} satisfies Record<
  ProjectAccessRequestStatus,
  { label: string; className: string; icon: typeof Clock3 }
>;

function RequestStatusBadge({ status }: { status: ProjectAccessRequestStatus }) {
  const config = requestStatus[status];
  const Icon = config.icon;

  return (
    <Badge className={cn("gap-1", config.className)} variant="outline">
      <Icon />
      {config.label}
    </Badge>
  );
}

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const user = await requireUser();

  const [activeProjects, assignedProjects, requestRows, apiKeyRows] =
    await Promise.all([
      db
        .select()
        .from(projects)
        .where(eq(projects.active, true))
        .orderBy(asc(projects.title)),
      db
        .select({
          id: projects.id,
          name: projects.name,
          title: projects.title,
          active: projects.active,
        })
        .from(userProjects)
        .innerJoin(projects, eq(userProjects.projectId, projects.id))
        .where(eq(userProjects.userId, user.id))
        .orderBy(asc(projects.title)),
      db
        .select({
          id: projectAccessRequests.id,
          projectId: projectAccessRequests.projectId,
          projectName: projects.name,
          projectTitle: projects.title,
          status: projectAccessRequests.status,
          requestedAt: projectAccessRequests.requestedAt,
          reviewedAt: projectAccessRequests.reviewedAt,
        })
        .from(projectAccessRequests)
        .innerJoin(projects, eq(projectAccessRequests.projectId, projects.id))
        .where(eq(projectAccessRequests.userId, user.id))
        .orderBy(desc(projectAccessRequests.requestedAt)),
      listApiKeys(user.id),
    ]);

  const currentProjects = user.role === "admin" ? activeProjects : assignedProjects;
  const assignedProjectIds = new Set(
    assignedProjects.map((project) => project.id),
  );
  const latestRequestByProject = new Map(
    requestRows.map((request) => [request.projectId, request]),
  );
  const pendingRequestCount = requestRows.filter(
    (request) => request.status === "pending",
  ).length;
  const now = new Date();
  const apiKeyItems: ApiKeyListItem[] = apiKeyRows.map((apiKey) => ({
    id: apiKey.id,
    name: apiKey.name,
    prefix: apiKey.prefix,
    createdAt: apiKey.createdAt.toISOString(),
    lastUsedAt: apiKey.lastUsedAt?.toISOString() ?? null,
    expiresAt: apiKey.expiresAt?.toISOString() ?? null,
    revokedAt: apiKey.revokedAt?.toISOString() ?? null,
    status: apiKey.revokedAt
      ? "revoked"
      : apiKey.expiresAt && apiKey.expiresAt <= now
        ? "expired"
        : "active",
  }));
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <p className="mb-1 text-sm font-medium text-primary">Account</p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review your profile, API credentials, and project access requests.
        </p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar className="size-14" size="lg">
              <AvatarFallback className="bg-primary/10 text-primary">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg">{user.name}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </div>
            <Badge className="w-fit capitalize" variant="outline">
              <Shield />
              {user.role}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-0 sm:grid-cols-2">
            <div className="flex items-start gap-3 py-4 sm:pr-6">
              <UserRound className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs text-muted-foreground">Full name</dt>
                <dd className="mt-1 text-sm font-medium">{user.name}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3 border-t py-4 sm:border-t-0 sm:border-l sm:pl-6">
              <AtSign className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs text-muted-foreground">Email address</dt>
                <dd className="mt-1 break-all text-sm font-medium">
                  {user.email}
                </dd>
              </div>
            </div>
          </dl>
          <Separator />
          <div className="flex items-start gap-3 py-4">
            <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" />
            <div>
              <p className="text-sm font-medium">Account approved</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Your account and project permissions are managed by a ticketing
                administrator.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <ApiKeyManager apiKeys={apiKeyItems} />

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <FolderCheck className="size-4 text-primary" />
            Current project access
          </CardTitle>
          <CardDescription>
            Projects where you can create, view, and manage tickets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user.role === "admin" ? (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <p className="font-medium">Administrator access</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Administrators automatically have access to every active
                  project and do not need to submit access requests.
                </p>
              </div>
            </div>
          ) : null}

          {currentProjects.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {currentProjects.map((project) => (
                <div
                  className="flex min-w-0 items-start gap-3 rounded-xl border p-4"
                  key={project.id}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FolderKey className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold">
                        {project.name}
                      </span>
                      <Badge
                        className={cn(
                          project.active
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                            : "text-muted-foreground",
                        )}
                        variant="outline"
                      >
                        {project.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {project.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FolderKey />
                </EmptyMedia>
                <EmptyTitle>No project access assigned</EmptyTitle>
                <EmptyDescription>
                  Select an available project below to request access from an
                  administrator.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Send className="size-4 text-primary" />
            Request more access
          </CardTitle>
          <CardDescription>
            {user.role === "admin"
              ? "Your role already includes every active project."
              : "Choose one or more additional project queues for administrator review."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user.role === "admin" ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ShieldCheck />
                </EmptyMedia>
                <EmptyTitle>No access request is needed</EmptyTitle>
                <EmptyDescription>
                  Administrator permissions automatically cover all active
                  projects.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              {activeProjects.length > 0 ? (
                <ProjectAccessRequestForm
                  assignedProjectIds={Array.from(assignedProjectIds)}
                  latestRequests={requestRows.map((request) => ({
                    projectId: request.projectId,
                    status: request.status,
                  }))}
                  pendingRequestCount={pendingRequestCount}
                  projects={activeProjects.map((project) => ({
                    id: project.id,
                    name: project.name,
                    title: project.title,
                  }))}
                />
              ) : (
                <Empty className="border">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <FolderKey />
                    </EmptyMedia>
                    <EmptyTitle>No active projects available</EmptyTitle>
                    <EmptyDescription>
                      There are currently no project queues available to request.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}

              <div className="mt-6 border-t pt-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="flex items-center gap-2 text-sm font-medium">
                      <History className="size-4 text-muted-foreground" />
                      Request history
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Latest review state for each project you requested.
                    </p>
                  </div>
                  {requestRows.length > 0 ? (
                    <Badge variant="secondary">
                      {requestRows.length} {requestRows.length === 1 ? "request" : "requests"}
                    </Badge>
                  ) : null}
                </div>

                {requestRows.length > 0 ? (
                  <div className="divide-y rounded-xl border">
                    {requestRows.map((request) => (
                      <div
                        className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                        key={request.id}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-semibold">
                              {request.projectName}
                            </span>
                            <RequestStatusBadge status={request.status} />
                          </div>
                          <p className="mt-1 truncate text-sm text-muted-foreground">
                            {request.projectTitle}
                          </p>
                        </div>
                        <div className="shrink-0 text-left text-xs text-muted-foreground sm:text-right">
                          <p>Requested {request.requestedAt.toLocaleString()}</p>
                          {request.reviewedAt ? (
                            <p className="mt-1">
                              Reviewed {request.reviewedAt.toLocaleString()}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed px-6 py-8 text-center">
                    <p className="text-sm font-medium">No access requests yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Requests submitted from this page will appear here.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
