"use client";

import * as React from "react";
import { KeyRound, LoaderCircle } from "lucide-react";
import { changePasswordAction } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordDialog() {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const formRef = React.useRef<HTMLFormElement>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        await changePasswordAction(formData);
        formRef.current?.reset();
        setOpen(false);
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Password could not be changed. Please try again.");
      }
    });
  }

  return (
    <Dialog onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) { setError(null); formRef.current?.reset(); } }} open={open}>
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        <KeyRound data-icon="inline-start" />Change password
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>Enter your current password, then choose a new password with at least 8 characters.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit} ref={formRef}>
          <div className="space-y-2"><Label htmlFor="current-password">Current password</Label><Input autoComplete="current-password" disabled={isPending} id="current-password" name="currentPassword" required type="password" /></div>
          <div className="space-y-2"><Label htmlFor="new-password">New password</Label><Input autoComplete="new-password" disabled={isPending} id="new-password" minLength={8} name="newPassword" required type="password" /></div>
          <div className="space-y-2"><Label htmlFor="confirm-password">Confirm new password</Label><Input autoComplete="new-password" disabled={isPending} id="confirm-password" minLength={8} name="confirmPassword" required type="password" /></div>
          {error ? <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{error}</p> : null}
          <DialogFooter><Button disabled={isPending} type="submit">{isPending ? <LoaderCircle className="animate-spin" /> : <KeyRound />} {isPending ? "Changing password..." : "Change password"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
