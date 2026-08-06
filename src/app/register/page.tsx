import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { ArrowLeft, FolderKanban, Send, TicketCheck } from "lucide-react";
import { registerAction } from "@/app/actions/auth";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { cn } from "@/lib/utils";

export default async function RegisterPage() {
  const projectRows = await db.select().from(projects).where(eq(projects.active, true)).orderBy(asc(projects.title));

  return (
    <main className="min-h-svh bg-muted/30 px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link className="flex items-center gap-2 font-heading text-sm font-semibold" href="/login">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><TicketCheck className="size-4" /></span>
            Ticketing Portal
          </Link>
          <Link className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground")} href="/login">
            <ArrowLeft data-icon="inline-start" />Back to sign in
          </Link>
        </div>

        <Card className="shadow-xl shadow-slate-950/5">
          <CardHeader className="border-b">
            <CardTitle className="text-2xl">Request account access</CardTitle>
            <CardDescription>Create your profile and choose the project queues you need. An administrator will review your request.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={registerAction}
              className="space-y-6"
              data-loading-message="Submitting your registration..."
              data-page-loading="true"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input autoFocus id="name" name="name" placeholder="Juan Dela Cruz" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Work email</Label>
                  <Input autoComplete="email" id="email" name="email" placeholder="juan@company.com" required type="email" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="password">Password</Label>
                  <Input autoComplete="new-password" id="password" minLength={8} name="password" required type="password" />
                  <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>
                </div>
              </div>

              <fieldset className="space-y-3">
                <div><legend className="text-sm font-medium">Project access</legend><p className="mt-1 text-xs text-muted-foreground">Select every project where you expect to create or manage tickets.</p></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {projectRows.map((project) => (
                    <label className="group flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/50 has-[:checked]:border-primary/40 has-[:checked]:bg-primary/5" key={project.id}>
                      <input className="mt-0.5 size-4 accent-primary" name="projectIds" type="checkbox" value={project.id} />
                      <FolderKanban className="mt-0.5 size-4 shrink-0 text-muted-foreground group-has-[:checked]:text-primary" />
                      <span className="min-w-0"><span className="block font-mono text-xs font-semibold">{project.name}</span><span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{project.title}</span></span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
                <Link className={cn(buttonVariants({ variant: "outline" }), "justify-center")} href="/login">Cancel</Link>
                <PendingSubmitButton pendingLabel="Submitting..." type="submit">
                  <Send data-icon="inline-start" />
                  Submit for approval
                </PendingSubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
