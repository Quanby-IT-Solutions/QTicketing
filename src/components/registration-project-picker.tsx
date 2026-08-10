"use client"

import * as React from "react"
import { CheckCircle2, ChevronRight, FolderKanban, Layers3 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type RegistrationProject = {
  id: string
  name: string
  title: string
}

export function RegistrationProjectPicker({ projects }: { projects: RegistrationProject[] }) {
  const [open, setOpen] = React.useState(false)
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [showError, setShowError] = React.useState(false)
  const selectedIdSet = React.useMemo(() => new Set(selectedIds), [selectedIds])
  const selectedProjects = projects.filter((project) => selectedIdSet.has(project.id))
  const allSelected = projects.length > 0 && selectedIds.length === projects.length

  function setProjectSelected(projectId: string, checked: boolean) {
    setSelectedIds((current) =>
      checked
        ? current.includes(projectId)
          ? current
          : [...current, projectId]
        : current.filter((id) => id !== projectId),
    )
    if (checked) setShowError(false)
  }

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium">Project access</legend>
      <div className="!-mt-2">
        <p className="mt-1 text-xs text-muted-foreground">
          Select every project where you expect to create or manage tickets.
        </p>
      </div>

      {selectedIds.map((projectId) => (
        <input key={projectId} name="projectIds" type="hidden" value={projectId} />
      ))}
      <input
        aria-label="Select at least one project"
        checked={selectedIds.length > 0}
        className="sr-only"
        onChange={() => undefined}
        onInvalid={(event) => {
          event.preventDefault()
          setShowError(true)
          setOpen(true)
        }}
        required
        tabIndex={-1}
        type="checkbox"
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button
              className={cn(
                "h-auto w-full justify-between px-4 py-3 text-left",
                showError && selectedIds.length === 0 && "border-destructive text-destructive",
              )}
              type="button"
              variant="outline"
            />
          }
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers3 className="size-4" />
            </span>
            <span className="grid min-w-0 gap-0.5">
              <span className="font-medium">Select projects</span>
              <span className="truncate text-xs font-normal text-muted-foreground">
                {selectedIds.length > 0
                  ? `${selectedIds.length} ${selectedIds.length === 1 ? "project" : "projects"} selected`
                  : "Choose at least one project"}
              </span>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {selectedIds.length > 0 ? <Badge variant="secondary">{selectedIds.length}</Badge> : null}
            <ChevronRight className="size-4 text-muted-foreground" />
          </span>
        </DialogTrigger>

        <DialogContent className="flex max-h-[calc(100svh-2rem)] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b p-4 pr-12 sm:p-5 sm:pr-12">
            <DialogTitle className="flex items-center gap-2">
              <Layers3 className="size-4 text-primary" />
              Select project access
            </DialogTitle>
            <DialogDescription>
              Choose every project queue you need. An administrator will review your request.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3 sm:px-5">
            <p className="text-xs text-muted-foreground">
              {selectedIds.length} of {projects.length} selected
            </p>
            <div className="flex items-center gap-1">
              <Button
                disabled={projects.length === 0 || allSelected}
                onClick={() => {
                  setSelectedIds(projects.map((project) => project.id))
                  setShowError(false)
                }}
                size="sm"
                type="button"
                variant="ghost"
              >
                Select all
              </Button>
              <Button
                disabled={selectedIds.length === 0}
                onClick={() => setSelectedIds([])}
                size="sm"
                type="button"
                variant="ghost"
              >
                Clear
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            {projects.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {projects.map((project) => {
                  const checked = selectedIdSet.has(project.id)
                  const checkboxId = `registration-project-${project.id}`

                  return (
                    <label
                      className={cn(
                        "group flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/50",
                        checked && "border-primary/40 bg-primary/5",
                      )}
                      htmlFor={checkboxId}
                      key={project.id}
                    >
                      <Checkbox
                        checked={checked}
                        className="mt-0.5"
                        id={checkboxId}
                        onCheckedChange={(nextChecked) => setProjectSelected(project.id, nextChecked)}
                      />
                      <FolderKanban
                        className={cn(
                          "mt-0.5 size-4 shrink-0 text-muted-foreground",
                          checked && "text-primary",
                        )}
                      />
                      <span className="min-w-0">
                        <span className="block font-mono text-xs font-semibold">{project.name}</span>
                        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                          {project.title}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No active projects are available.
              </div>
            )}
          </div>

          <DialogFooter className="mx-0 mb-0 shrink-0 rounded-b-xl px-4 py-3 sm:px-5">
            <span className="mr-auto flex items-center gap-2 text-xs text-muted-foreground">
              {selectedIds.length > 0 ? <CheckCircle2 className="size-4 text-emerald-600" /> : null}
              {selectedIds.length > 0
                ? `${selectedIds.length} selected`
                : "Select at least one project"}
            </span>
            <DialogClose render={<Button disabled={selectedIds.length === 0} type="button" />}>
              Done
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedProjects.length > 0 ? (
        <div className="flex flex-wrap gap-1.5" aria-label="Selected projects">
          {selectedProjects.map((project) => (
            <Badge key={project.id} variant="outline">
              {project.name}
            </Badge>
          ))}
        </div>
      ) : (
        <p className={cn("text-xs text-muted-foreground", showError && "text-destructive")}>
          {showError ? "Select at least one project to continue." : "No projects selected yet."}
        </p>
      )}
    </fieldset>
  )
}
