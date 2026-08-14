"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { CircleAlert, FileUp, Plus } from "lucide-react"

import { createTicketModalAction } from "@/app/actions/tickets"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"

export type CreateTicketProject = {
  id: string
  name: string
  title: string
}

type CreatedTicket = {
  ticketId: string
  ticketNumber: number
}

type TicketDialogContextValue = {
  currentRouteProject?: CreateTicketProject
  openTicketDialog: (project?: CreateTicketProject) => void
}

type FormErrors = Partial<
  Record<
    "title" | "description" | "projectId" | "category" | "department" | "location" | "attachments" | "form",
    string
  >
>

const TicketDialogContext = createContext<TicketDialogContextValue | null>(null)

function getCurrentRouteProject(pathname: string, projects: CreateTicketProject[]) {
  const match = pathname.match(/^\/tickets\/([^/]+)\/?$/)
  if (!match || match[1].toLocaleLowerCase() === "new") return undefined

  try {
    const projectCode = decodeURIComponent(match[1])
    return projects.find((project) => project.name.toLocaleLowerCase() === projectCode.toLocaleLowerCase())
  } catch {
    return undefined
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  return "The ticket could not be created. Please review the form and try again."
}

function validateTicketForm(formData: FormData): FormErrors {
  const errors: FormErrors = {}
  const title = String(formData.get("title") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const projectId = String(formData.get("projectId") ?? "")
  const category = String(formData.get("category") ?? "").trim()
  const department = String(formData.get("department") ?? "").trim()
  const location = String(formData.get("location") ?? "").trim()
  if (title.length < 3) errors.title = "Enter a title with at least 3 characters."
  else if (title.length > 160) errors.title = "Keep the title to 160 characters or fewer."

  if (description.length < 1) errors.description = "Enter a description."
  else if (description.length > 5000) errors.description = "Keep the description to 5,000 characters or fewer."

  if (!projectId) errors.projectId = "Select a project."

  if (category.length < 2) errors.category = "Enter a category with at least 2 characters."
  else if (category.length > 80) errors.category = "Keep the category to 80 characters or fewer."

  if (department.length > 80) errors.department = "Keep the department to 80 characters or fewer."
  if (location.length > 120) errors.location = "Keep the location to 120 characters or fewer."
  return errors
}

export function useTicketDialog() {
  const context = useContext(TicketDialogContext)
  if (!context) throw new Error("useTicketDialog must be used within TicketDialogProvider.")
  return context
}

export function TicketDialogProvider({
  projects,
  children,
}: {
  projects: CreateTicketProject[]
  children: ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<CreateTicketProject>()
  const [dialogSession, setDialogSession] = useState(0)
  const [announcement, setAnnouncement] = useState("")
  const currentRouteProject = useMemo(() => getCurrentRouteProject(pathname, projects), [pathname, projects])

  const openTicketDialog = useCallback(
    (project?: CreateTicketProject) => {
      const availableProject = project
        ? projects.find((candidate) => candidate.id === project.id)
        : currentRouteProject
      setSelectedProject(availableProject)
      setDialogSession((session) => session + 1)
      setOpen(true)
    },
    [currentRouteProject, projects],
  )

  const contextValue = useMemo(
    () => ({ currentRouteProject, openTicketDialog }),
    [currentRouteProject, openTicketDialog],
  )

  function handleCreated(ticket: CreatedTicket) {
    setAnnouncement(`Ticket #${ticket.ticketNumber} was created successfully.`)
    setOpen(false)
    setSelectedProject(undefined)
    router.refresh()
  }

  return (
    <TicketDialogContext.Provider value={contextValue}>
      {children}
      <Dialog
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (!nextOpen) setSelectedProject(undefined)
        }}
        open={open}
      >
        <CreateTicketDialogForm
          key={dialogSession}
          onCreated={handleCreated}
          project={selectedProject}
          projects={projects}
        />
      </Dialog>
      <p aria-atomic="true" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </TicketDialogContext.Provider>
  )
}

type CreateTicketButtonProps = Omit<
  ComponentProps<typeof Button>,
  "children" | "nativeButton" | "onClick" | "render" | "type"
> & {
  project?: CreateTicketProject
  label?: ReactNode
}

export function CreateTicketButton({
  project,
  label = "New ticket",
  ...buttonProps
}: CreateTicketButtonProps) {
  const { currentRouteProject, openTicketDialog } = useTicketDialog()
  const fallbackProject = project ?? currentRouteProject
  const fallbackHref = fallbackProject
    ? `/tickets/${encodeURIComponent(fallbackProject.name)}/new`
    : "/tickets/new"

  return (
    <Button
      {...buttonProps}
      nativeButton={false}
      onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        openTicketDialog(project)
      }}
      render={<Link data-no-page-loading href={fallbackHref} />}
    >
      <Plus aria-hidden="true" data-icon="inline-start" />
      {label}
    </Button>
  )
}

function CreateTicketDialogForm({
  projects,
  project,
  onCreated,
}: {
  projects: CreateTicketProject[]
  project?: CreateTicketProject
  onCreated: (ticket: CreatedTicket) => void
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isPending, startTransition] = useTransition()
  const hasProjects = projects.length > 0

  function handleInput(event: FormEvent<HTMLFormElement>) {
    const name = (event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).name as keyof FormErrors
    if (!name) return

    setErrors((current) => {
      if (!current[name] && !current.form) return current
      return { ...current, [name]: undefined, form: undefined }
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isPending) return

    const form = event.currentTarget
    const formData = new FormData(form)
    const nextErrors = validateTicketForm(formData)

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      requestAnimationFrame(() => form.querySelector<HTMLElement>("[aria-invalid='true']")?.focus())
      return
    }

    setErrors({})
    startTransition(async () => {
      try {
        const ticket = await createTicketModalAction(formData)
        formRef.current?.reset()
        onCreated(ticket)
      } catch (error) {
        setErrors({ form: getErrorMessage(error) })
      }
    })
  }

  return (
    <DialogContent
      className="flex max-h-[calc(100svh-1rem)] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-h-[calc(100svh-2rem)] sm:max-w-3xl"
      showCloseButton={!isPending}
    >
      <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12 sm:px-6 sm:py-5">
        <DialogTitle className="text-lg">{project ? `Create a ${project.name} ticket` : "Create a new ticket"}</DialogTitle>
        <DialogDescription>
          {project
            ? `This request will be filed under ${project.title}.`
            : "Share the issue details and route it to the right project."}
        </DialogDescription>
      </DialogHeader>

      <form className="flex min-h-0 flex-1 flex-col" noValidate onInput={handleInput} onSubmit={handleSubmit} ref={formRef}>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          {errors.form ? (
            <Alert variant="destructive">
              <CircleAlert aria-hidden="true" />
              <AlertTitle>Ticket not created</AlertTitle>
              <AlertDescription>{errors.form}</AlertDescription>
            </Alert>
          ) : null}

          {!hasProjects ? (
            <Alert>
              <CircleAlert aria-hidden="true" />
              <AlertTitle>No active projects available</AlertTitle>
              <AlertDescription>
                Ask an administrator for project access before creating a ticket.
              </AlertDescription>
            </Alert>
          ) : null}

          <Field data-invalid={Boolean(errors.title)}>
            <FieldLabel htmlFor="create-ticket-title">
              Title <span aria-hidden="true" className="text-destructive">*</span>
            </FieldLabel>
            <Input
              aria-describedby={errors.title ? "create-ticket-title-error" : undefined}
              aria-invalid={Boolean(errors.title)}
              autoFocus
              disabled={isPending}
              id="create-ticket-title"
              maxLength={160}
              minLength={3}
              name="title"
              placeholder="Briefly summarize the issue"
              required
            />
            <FieldError id="create-ticket-title-error">{errors.title}</FieldError>
          </Field>

          <Field data-invalid={Boolean(errors.description)}>
            <FieldLabel htmlFor="create-ticket-description">
              Description <span aria-hidden="true" className="text-destructive">*</span>
            </FieldLabel>
            <Textarea
              aria-describedby={errors.description ? "create-ticket-description-error" : "create-ticket-description-help"}
              aria-invalid={Boolean(errors.description)}
              className="min-h-28 resize-y"
              disabled={isPending}
              id="create-ticket-description"
              maxLength={5000}
              name="description"
              placeholder="What happened, what did you expect, and what have you already tried?"
              required
            />
            <FieldDescription id="create-ticket-description-help">Include enough detail for the support team to reproduce the issue.</FieldDescription>
            <FieldError id="create-ticket-description-error">{errors.description}</FieldError>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              aria-labelledby={project ? "create-ticket-project-label" : undefined}
              data-invalid={Boolean(errors.projectId)}
            >
              <FieldLabel
                htmlFor={project ? undefined : "create-ticket-project"}
                id="create-ticket-project-label"
              >
                Project <span aria-hidden="true" className="text-destructive">*</span>
              </FieldLabel>
              {project ? (
                <>
                  <input name="projectId" type="hidden" value={project.id} />
                  <div
                    className="flex min-h-8 items-center justify-between gap-3 rounded-lg border bg-muted/40 px-2.5 py-1.5 text-sm"
                  >
                    <span className="truncate font-medium">{project.title}</span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">{project.name}</span>
                  </div>
                </>
              ) : (
                <NativeSelect
                  aria-describedby={errors.projectId ? "create-ticket-project-error" : undefined}
                  aria-invalid={Boolean(errors.projectId)}
                  className="w-full"
                  defaultValue={projects.length === 1 ? projects[0].id : ""}
                  disabled={isPending || !hasProjects}
                  id="create-ticket-project"
                  name="projectId"
                  required
                >
                  <NativeSelectOption value="">Select a project</NativeSelectOption>
                  {projects.map((option) => (
                    <NativeSelectOption key={option.id} value={option.id}>
                      {option.title} ({option.name})
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              )}
              <FieldError id="create-ticket-project-error">{errors.projectId}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="create-ticket-priority">Priority</FieldLabel>
              <NativeSelect className="w-full" defaultValue="normal" disabled={isPending} id="create-ticket-priority" name="priority">
                <NativeSelectOption value="low">Low</NativeSelectOption>
                <NativeSelectOption value="normal">Normal</NativeSelectOption>
                <NativeSelectOption value="high">High</NativeSelectOption>
              </NativeSelect>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={Boolean(errors.category)}>
              <FieldLabel htmlFor="create-ticket-category">
                Category <span aria-hidden="true" className="text-destructive">*</span>
              </FieldLabel>
              <Input
                aria-describedby={errors.category ? "create-ticket-category-error" : undefined}
                aria-invalid={Boolean(errors.category)}
                disabled={isPending}
                id="create-ticket-category"
                maxLength={80}
                name="category"
                placeholder="Software, access, hardware…"
                required
              />
              <FieldError id="create-ticket-category-error">{errors.category}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="create-ticket-due-date">Due date</FieldLabel>
              <DatePicker disabled={isPending} id="create-ticket-due-date" name="dueDate" />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={Boolean(errors.department)}>
              <FieldLabel htmlFor="create-ticket-department">Department</FieldLabel>
              <Input
                aria-describedby={errors.department ? "create-ticket-department-error" : undefined}
                aria-invalid={Boolean(errors.department)}
                disabled={isPending}
                id="create-ticket-department"
                maxLength={80}
                name="department"
                placeholder="Optional"
              />
              <FieldError id="create-ticket-department-error">{errors.department}</FieldError>
            </Field>

            <Field data-invalid={Boolean(errors.location)}>
              <FieldLabel htmlFor="create-ticket-location">Location</FieldLabel>
              <Input
                aria-describedby={errors.location ? "create-ticket-location-error" : undefined}
                aria-invalid={Boolean(errors.location)}
                disabled={isPending}
                id="create-ticket-location"
                maxLength={120}
                name="location"
                placeholder="Optional"
              />
              <FieldError id="create-ticket-location-error">{errors.location}</FieldError>
            </Field>
          </div>

          <Field data-invalid={Boolean(errors.attachments)}>
            <FieldLabel htmlFor="create-ticket-attachments">
              <FileUp aria-hidden="true" className="size-4 text-muted-foreground" />
              Attachments
            </FieldLabel>
            <Input
              aria-describedby={errors.attachments ? "create-ticket-attachments-error" : "create-ticket-attachments-help"}
              aria-invalid={Boolean(errors.attachments)}
              className="h-auto min-h-8 py-1"
              disabled={isPending}
              id="create-ticket-attachments"
              multiple
              name="attachments"
              type="file"
            />
            <FieldDescription id="create-ticket-attachments-help">Optional. You can attach one or more files.</FieldDescription>
            <FieldError id="create-ticket-attachments-error">{errors.attachments}</FieldError>
          </Field>
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 rounded-b-xl px-5 py-4 sm:px-6">
          <DialogClose render={<Button disabled={isPending} type="button" variant="outline" />}>
            Cancel
          </DialogClose>
          <Button disabled={isPending || !hasProjects} type="submit">
            {isPending ? <Spinner aria-label="Creating ticket" data-icon="inline-start" /> : <Plus aria-hidden="true" data-icon="inline-start" />}
            {isPending ? "Creating…" : "Create ticket"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
