import Link from "next/link";
import { CheckCircle2, ShieldCheck, TicketCheck } from "lucide-react";
import { loginAction } from "@/app/actions/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ registered?: string }> }) {
  const { registered } = await searchParams;

  return (
    <main className="grid min-h-svh bg-muted/30 lg:grid-cols-[minmax(28rem,0.9fr)_1.1fr]">
      <section className="flex flex-col px-6 py-8 sm:px-10 lg:px-16">
        <Link className="flex w-fit items-center gap-2 font-heading text-sm font-semibold" href="/login">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <TicketCheck className="size-4" />
          </span>
          Ticketing Portal
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <Card className="w-full max-w-md shadow-xl shadow-slate-950/5">
            <CardHeader>
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <CardDescription>Sign in to manage project requests and support tickets.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={loginAction} className="space-y-5">
                {registered ? (
                  <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                    <CheckCircle2 />
                    <AlertTitle>Registration submitted</AlertTitle>
                    <AlertDescription className="text-amber-800">An administrator must approve your account before you can sign in.</AlertDescription>
                  </Alert>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input autoComplete="email" autoFocus id="email" name="email" placeholder="you@company.com" required type="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input autoComplete="current-password" id="password" name="password" required type="password" />
                </div>
                <Button className="w-full" type="submit">Sign in</Button>
                <p className="text-center text-sm text-muted-foreground">
                  Need access?{" "}
                  <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/register">Request an account</Link>
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
        <p className="text-xs text-muted-foreground">Internal access only · Contact your administrator for help.</p>
      </section>

      <aside className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-40 -top-40 size-[32rem] rounded-full bg-primary/35 blur-3xl" />
        <div className="absolute -bottom-48 -left-24 size-[28rem] rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="relative flex items-center gap-2 text-sm font-medium text-white/70"><ShieldCheck className="size-4" />Secure internal workspace</div>
        <div className="relative max-w-xl">
          <p className="mb-5 text-sm font-medium uppercase tracking-[0.2em] text-blue-300">One place for every request</p>
          <h1 className="font-heading text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">Keep every project ticket visible, owned, and moving.</h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-300">Submit issues with supporting files, collaborate with the team, and follow each request from pending to done.</p>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {["Project-aware queues", "Clear priorities", "Complete history"].map((item) => (
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 backdrop-blur" key={item}>{item}</div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-slate-500">Built for internal support teams.</p>
      </aside>
    </main>
  );
}
