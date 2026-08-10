import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { ArrowLeft, Send, TicketCheck } from "lucide-react";
import { registerAction } from "@/app/actions/auth";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { RegistrationProjectPicker } from "@/components/registration-project-picker";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Register",
};

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

              <RegistrationProjectPicker
                projects={projectRows.map(({ id, name, title }) => ({ id, name, title }))}
              />

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
