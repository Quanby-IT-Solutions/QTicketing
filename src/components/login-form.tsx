"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { loginAction } from "@/app/actions/auth";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";

const rememberedEmailCookie = "ticketing_remembered_email";
const rememberedEmailMaxAge = 60 * 60 * 24 * 365;

const loginErrorMessages: Record<string, string> = {
  "incorrect-email": "No account was found for that email address.",
  "incorrect-password": "The password you entered is incorrect.",
  "inactive-account": "This account is inactive. Contact an administrator for assistance.",
  "pending-approval": "Your account is waiting for administrator approval.",
  "not-approved": "This account has not been approved. Contact an administrator for assistance.",
};

export function LoginForm({
  registered,
  loginError,
  rememberedEmail = "",
}: {
  registered: boolean;
  loginError?: string;
  rememberedEmail?: string;
}) {
  const [email, setEmail] = React.useState(rememberedEmail);
  const [rememberMe, setRememberMe] = React.useState(Boolean(rememberedEmail));
  const displayedLoginError = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!loginError || displayedLoginError.current === loginError) return;
    const message = loginErrorMessages[loginError];
    if (!message) return;

    displayedLoginError.current = loginError;
    toast.add({
      title: "Unable to sign in",
      description: message,
      type: "error",
      priority: "high",
    });
  }, [loginError]);

  function handleSubmit() {
    const normalizedEmail = email.trim().toLowerCase();

    if (rememberMe && normalizedEmail) {
      document.cookie = `${rememberedEmailCookie}=${encodeURIComponent(normalizedEmail)}; path=/; max-age=${rememberedEmailMaxAge}; samesite=lax`;
    } else {
      document.cookie = `${rememberedEmailCookie}=; path=/; max-age=0; samesite=lax`;
    }
  }

  return (
    <form
      action={loginAction}
      className="space-y-5"
      onSubmit={handleSubmit}
    >
      {registered ? (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <CheckCircle2 />
          <AlertTitle>Registration submitted</AlertTitle>
          <AlertDescription className="text-amber-800">
            An administrator must approve your account before you can sign in.
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          autoComplete="email"
          autoFocus
          id="email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          required
          type="email"
          value={email}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          autoComplete="current-password"
          id="password"
          name="password"
          required
          type="password"
        />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          checked={rememberMe}
          id="remember-me"
          onCheckedChange={setRememberMe}
        />
        <Label className="cursor-pointer text-sm font-normal" htmlFor="remember-me">
          Remember me
        </Label>
      </div>
      <PendingSubmitButton className="w-full" pendingLabel="Signing in..." type="submit">
        Sign in
      </PendingSubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        Need access?{" "}
        <Link
          className="font-medium text-primary underline-offset-4 hover:underline"
          href="/register"
        >
          Request an account
        </Link>
      </p>
    </form>
  );
}
