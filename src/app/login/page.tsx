import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Sign In",
};

function decodeRememberedEmail(value: string | undefined) {
  if (!value) return "";

  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string; error?: string }>;
}) {
  const { registered, error } = await searchParams;
  const cookieStore = await cookies();
  const rememberedEmail = decodeRememberedEmail(
    cookieStore.get("ticketing_remembered_email")?.value,
  );

  return (
    <main className="grid min-h-svh bg-muted/30 lg:grid-cols-[minmax(28rem,0.9fr)_1.1fr]">
      <section className="flex flex-col px-6 py-8 sm:px-10 lg:px-16">
        <Link
          className="flex w-fit items-center gap-2 font-heading text-sm font-semibold"
          href="/login"
        >
          <span className="flex size-8 items-center justify-center overflow-hidden rounded-full shadow-sm">
            <img alt="" className="size-full object-cover" src="/qby.png" />
          </span>
          Ticketing Portal
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <Card className="w-full max-w-md shadow-xl shadow-slate-950/5">
            <CardHeader>
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <CardDescription>
                Sign in to manage project requests and support tickets.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LoginForm
                registered={Boolean(registered)}
                loginError={error}
                rememberedEmail={rememberedEmail}
              />
            </CardContent>
          </Card>
        </div>
        <p className="text-xs text-muted-foreground">
          Internal access only · Contact your administrator for help.
        </p>
      </section>

      <aside className="login-hero-panel relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="login-motion-shape login-motion-shape-a" />
        <div className="login-motion-shape login-motion-shape-b" />
        <div className="login-motion-shape login-motion-shape-c" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_82%,rgba(6,182,212,0.14),transparent_32%),linear-gradient(135deg,rgba(2,6,23,0.78),rgba(15,23,42,0.3)_55%,rgba(37,99,235,0.18))]" />
        <div className="relative flex items-center gap-2 text-sm font-medium text-white/70">
          <ShieldCheck className="size-4" />
          Secure internal workspace
        </div>
        <div className="relative max-w-xl">
          <p className="mb-5 text-sm font-medium uppercase tracking-[0.2em] text-blue-300">
            One place for every request
          </p>
          <h1 className="font-heading text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
            Keep every project ticket visible, owned, and moving.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-300">
            Submit issues with supporting files, collaborate with the team, and
            follow each request from pending to done.
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              "Project-aware queues",
              "Clear priorities",
              "Complete history",
            ].map((item) => (
              <div
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 backdrop-blur"
                key={item}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-slate-500">
          Built for internal support teams.
        </p>
      </aside>
    </main>
  );
}
