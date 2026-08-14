import Link from "next/link";
import { CalendarDays, FileText, FolderKanban, MapPin, Paperclip, Send, Tag } from "lucide-react";
import { createTicketAction } from "@/app/actions/tickets";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ProjectOption = {
  id: string;
  name?: string;
  title: string;
};

function SectionTitle({ icon: Icon, title, description }: { icon: typeof FileText; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </div>
    </div>
  );
}

export function TicketForm({
  projects,
  selectedProject,
}: {
  projects?: ProjectOption[];
  selectedProject?: ProjectOption;
}) {
  const cancelHref = selectedProject?.name
    ? `/tickets/${encodeURIComponent(selectedProject.name)}`
    : "/tickets";

  return (
    <form action={createTicketAction} className="space-y-5">
      {selectedProject ? <input name="projectId" type="hidden" value={selectedProject.id} /> : null}

      <Card>
        <CardHeader className="border-b">
          <SectionTitle
            description="Give the support team enough context to understand the request."
            icon={FileText}
            title="Request details"
          />
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Ticket title</Label>
            <Input
              autoFocus
              id="title"
              maxLength={160}
              minLength={3}
              name="title"
              placeholder="Briefly summarize the issue"
              required
            />
            <p className="text-xs text-muted-foreground">Use a specific, action-oriented summary.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              className="min-h-40 resize-y"
              id="description"
              name="description"
              placeholder="What happened, what did you expect, and how does it affect your work?"
              required
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <SectionTitle
            description="Route the ticket to the right queue and set its urgency."
            icon={Tag}
            title="Classification"
          />
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          {selectedProject ? (
            <div className="space-y-2 sm:col-span-2">
              <Label>Project</Label>
              <div className="flex min-h-10 items-center gap-3 rounded-lg border bg-muted/40 px-3 text-sm">
                <FolderKanban className="size-4 text-primary" />
                <span className="font-medium">{selectedProject.title}</span>
                {selectedProject.name ? (
                  <span className="ml-auto rounded-md bg-background px-2 py-0.5 font-mono text-xs text-muted-foreground ring-1 ring-border">
                    {selectedProject.name}
                  </span>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="projectId">Project</Label>
              <NativeSelect className="w-full" id="projectId" name="projectId" required>
                <NativeSelectOption value="">Select a project</NativeSelectOption>
                {(projects ?? []).map((project) => (
                  <NativeSelectOption key={project.id} value={project.id}>
                    {project.name ? `${project.name} — ` : ""}{project.title}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <NativeSelect className="w-full" defaultValue="normal" id="priority" name="priority">
              <NativeSelectOption value="low">Low</NativeSelectOption>
              <NativeSelectOption value="normal">Normal</NativeSelectOption>
              <NativeSelectOption value="high">High</NativeSelectOption>
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input id="category" name="category" placeholder="e.g. Access, Software, Hardware" required />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <SectionTitle
            description="Optional details help the team plan and prioritize the work."
            icon={MapPin}
            title="Additional context"
          />
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input id="department" name="department" placeholder="e.g. Finance" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" placeholder="Office, branch, or remote" />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5" htmlFor="dueDate">
              <CalendarDays className="size-3.5 text-muted-foreground" /> Due date
            </Label>
            <DatePicker id="dueDate" name="dueDate" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <SectionTitle
            description="Add screenshots, documents, or other supporting files."
            icon={Paperclip}
            title="Attachments"
          />
        </CardHeader>
        <CardContent>
          <Label
            className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/20 px-6 py-5 text-center transition-colors hover:bg-muted/50"
            htmlFor="attachments"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-background ring-1 ring-border">
              <Paperclip className="size-4 text-muted-foreground" />
            </span>
            <span className="text-sm font-medium">Choose files to attach</span>
            <span className="text-xs font-normal text-muted-foreground">Images and documents</span>
            <Input className="sr-only" id="attachments" multiple name="attachments" type="file" />
          </Label>
        </CardContent>
      </Card>

      <div className="sticky bottom-3 z-10 flex flex-col-reverse gap-2 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-end">
        <Link className={cn(buttonVariants({ variant: "outline" }), "justify-center")} href={cancelHref}>
          Cancel
        </Link>
        <Button type="submit">
          <Send data-icon="inline-start" />
          Create ticket
        </Button>
      </div>
    </form>
  );
}
