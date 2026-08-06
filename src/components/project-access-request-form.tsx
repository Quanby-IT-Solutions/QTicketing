"use client";

import * as React from "react";
import { CheckCircle2, Clock3, Send, XCircle } from "lucide-react";

import { requestProjectAccessAction } from "@/app/actions/project-access";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { ProjectAccessRequestStatus } from "@/db/schema";
import { cn } from "@/lib/utils";

type ProjectAccessProject = {
  id: string;
  name: string;
  title: string;
};

type ProjectAccessRequest = {
  projectId: string;
  status: ProjectAccessRequestStatus;
};

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

export function ProjectAccessRequestForm({
  assignedProjectIds,
  latestRequests,
  pendingRequestCount,
  projects,
}: {
  assignedProjectIds: string[];
  latestRequests: ProjectAccessRequest[];
  pendingRequestCount: number;
  projects: ProjectAccessProject[];
}) {
  const [selectedProjectIds, setSelectedProjectIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const assignedProjectIdSet = React.useMemo(
    () => new Set(assignedProjectIds),
    [assignedProjectIds],
  );
  const latestRequestByProject = React.useMemo(
    () => new Map(latestRequests.map((request) => [request.projectId, request])),
    [latestRequests],
  );
  const selectableProjectIds = React.useMemo(
    () =>
      projects
        .filter((project) => {
          const request = latestRequestByProject.get(project.id);
          return !assignedProjectIdSet.has(project.id) && request?.status !== "pending";
        })
        .map((project) => project.id),
    [assignedProjectIdSet, latestRequestByProject, projects],
  );
  const selectableProjectCount = selectableProjectIds.length;
  const selectedSelectableCount = selectableProjectIds.filter((projectId) =>
    selectedProjectIds.has(projectId),
  ).length;
  const allSelectableProjectsSelected =
    selectableProjectCount > 0 && selectedSelectableCount === selectableProjectCount;
  const submitProjectAccessRequest = React.useCallback(async (formData: FormData) => {
    await requestProjectAccessAction(formData);
  }, []);

  function toggleProject(projectId: string, checked: boolean) {
    setSelectedProjectIds((current) => {
      const next = new Set(current);
      if (checked) next.add(projectId);
      else next.delete(projectId);
      return next;
    });
  }

  function selectAllProjects() {
    setSelectedProjectIds(new Set(selectableProjectIds));
  }

  return (
    <form action={submitProjectAccessRequest} className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {selectableProjectCount > 0
            ? `${selectableProjectCount} ${selectableProjectCount === 1 ? "project is" : "projects are"} available to request.`
            : "No additional projects are available to request."}
        </p>
        <Button
          disabled={selectableProjectCount === 0 || allSelectableProjectsSelected}
          onClick={selectAllProjects}
          type="button"
          variant="outline"
        >
          Select all available
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => {
          const assigned = assignedProjectIdSet.has(project.id);
          const request = latestRequestByProject.get(project.id);
          const pending = request?.status === "pending";
          const selectable = !assigned && !pending;
          const checkboxId = `request-project-${project.id}`;

          return (
            <label
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4 transition-colors",
                selectable
                  ? "cursor-pointer hover:border-primary/30 hover:bg-primary/5"
                  : "cursor-not-allowed bg-muted/30 opacity-75",
              )}
              htmlFor={checkboxId}
              key={project.id}
            >
              <Checkbox
                checked={selectedProjectIds.has(project.id)}
                className="mt-0.5"
                disabled={!selectable}
                id={checkboxId}
                name="projectIds"
                onCheckedChange={(checked) => toggleProject(project.id, checked)}
                value={project.id}
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold">
                    {project.name}
                  </span>
                  {assigned ? (
                    <Badge
                      className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                      variant="outline"
                    >
                      <CheckCircle2 />
                      Current access
                    </Badge>
                  ) : request ? (
                    <RequestStatusBadge status={request.status} />
                  ) : (
                    <Badge variant="outline">Available</Badge>
                  )}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {project.title}
                </span>
                {request?.status === "rejected" ? (
                  <span className="mt-2 block text-xs text-rose-600 dark:text-rose-400">
                    You may select this project to submit a new request.
                  </span>
                ) : request?.status === "approved" && !assigned ? (
                  <span className="mt-2 block text-xs text-muted-foreground">
                    Previously approved but not currently assigned; you may request it again.
                  </span>
                ) : pending ? (
                  <span className="mt-2 block text-xs text-amber-700 dark:text-amber-300">
                    Waiting for administrator review.
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {pendingRequestCount > 0
            ? `${pendingRequestCount} ${pendingRequestCount === 1 ? "request is" : "requests are"} currently pending.`
            : "Requests remain pending until an administrator reviews them."}
        </p>
        <Button disabled={selectedSelectableCount === 0} type="submit">
          <Send data-icon="inline-start" />
          Submit request
        </Button>
      </div>
    </form>
  );
}
