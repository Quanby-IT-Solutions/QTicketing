"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Clipboard,
  KeyRound,
  LoaderCircle,
  Plus,
  ShieldAlert,
  Trash2,
} from "lucide-react";

import {
  createApiKeyAction,
  revokeApiKeyAction,
} from "@/app/actions/api-keys";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export type ApiKeyListItem = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  status: "active" | "expired" | "revoked";
};

const statusConfig = {
  active: {
    label: "Active",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  },
  expired: {
    label: "Expired",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  },
  revoked: {
    label: "Revoked",
    className: "text-muted-foreground",
  },
} satisfies Record<
  ApiKeyListItem["status"],
  { label: string; className: string }
>;

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Manila",
});

function formatDate(value: string | null, fallback: string) {
  return value ? dateFormatter.format(new Date(value)) : fallback;
}

function ApiKeyStatusBadge({ status }: { status: ApiKeyListItem["status"] }) {
  const config = statusConfig[status];

  return (
    <Badge className={cn(config.className)} variant="outline">
      {config.label}
    </Badge>
  );
}

export function ApiKeyManager({ apiKeys }: { apiKeys: ApiKeyListItem[] }) {
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);
  const tokenInputRef = React.useRef<HTMLInputElement>(null);
  const [createdKey, setCreatedKey] = React.useState<{
    name: string;
    token: string;
  } | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [keyToRevoke, setKeyToRevoke] = React.useState<ApiKeyListItem | null>(
    null,
  );
  const [isCreating, startCreating] = React.useTransition();
  const [isRevoking, startRevoking] = React.useTransition();

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isCreating || createdKey) return;

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    setCreateError(null);

    startCreating(async () => {
      try {
        const result = await createApiKeyAction(formData);
        setCreatedKey({ name, token: result.token });
        setCopied(false);
        formRef.current?.reset();
        router.refresh();
        toast.add({
          title: "API key created",
          description: "Copy the key now; its full value will not be shown again.",
          type: "success",
        });
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "The API key could not be created. Please try again.";
        setCreateError(message);
        toast.add({
          title: "API key not created",
          description: message,
          type: "error",
          priority: "high",
        });
      }
    });
  }

  async function handleCopy() {
    if (!createdKey) return;

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard access is unavailable.");
      }
      await navigator.clipboard.writeText(createdKey.token);
      setCopied(true);
      toast.add({
        title: "API key copied",
        description: "Store it in the calling application's secret manager.",
        type: "success",
      });
    } catch {
      tokenInputRef.current?.focus();
      tokenInputRef.current?.select();
      toast.add({
        title: "Copy unavailable",
        description: "The key is selected. Use Ctrl+C to copy it manually.",
        type: "warning",
      });
    }
  }

  function handleRevoke() {
    if (!keyToRevoke || isRevoking) return;

    const formData = new FormData();
    formData.set("apiKeyId", keyToRevoke.id);

    startRevoking(async () => {
      try {
        await revokeApiKeyAction(formData);
        const revokedName = keyToRevoke.name;
        setKeyToRevoke(null);
        router.refresh();
        toast.add({
          title: "API key revoked",
          description: `"${revokedName}" can no longer authenticate requests.`,
          type: "success",
        });
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "The API key could not be revoked. Please try again.";
        toast.add({
          title: "API key not revoked",
          description: message,
          type: "error",
          priority: "high",
        });
      }
    });
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4 text-primary" />
          API keys
        </CardTitle>
        <CardDescription>
          Create credentials for trusted applications to submit tickets as you.
          Your current project access is checked on every request.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          className="grid gap-4 lg:grid-cols-[minmax(12rem,1fr)_11rem_auto] lg:items-end"
          onSubmit={handleCreate}
          ref={formRef}
        >
          <div className="space-y-2">
            <Label htmlFor="api-key-name">Key name</Label>
            <Input
              autoComplete="off"
              disabled={isCreating || Boolean(createdKey)}
              id="api-key-name"
              maxLength={80}
              name="name"
              placeholder="e.g. RMIS production"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="api-key-expiry">Expires after</Label>
            <NativeSelect
              className="w-full"
              defaultValue="90"
              disabled={isCreating || Boolean(createdKey)}
              id="api-key-expiry"
              name="expiresInDays"
            >
              <NativeSelectOption value="30">30 days</NativeSelectOption>
              <NativeSelectOption value="90">90 days</NativeSelectOption>
              <NativeSelectOption value="365">1 year</NativeSelectOption>
            </NativeSelect>
          </div>
          <Button
            disabled={isCreating || Boolean(createdKey)}
            type="submit"
          >
            {isCreating ? (
              <LoaderCircle
                aria-hidden="true"
                className="animate-spin"
                data-icon="inline-start"
              />
            ) : (
              <Plus aria-hidden="true" data-icon="inline-start" />
            )}
            {isCreating ? "Creating..." : "Create API key"}
          </Button>
        </form>

        {createError ? (
          <div
            className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {createError}
          </div>
        ) : null}

        {createdKey ? (
          <div
            aria-live="polite"
            className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
          >
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 size-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  Copy &ldquo;{createdKey.name}&rdquo; now
                </p>
                <p className="mt-1 text-sm text-current/75">
                  This is the only time the complete key will be displayed. Keep
                  it secret and store it in the calling application&apos;s secret
                  manager.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Input
                    aria-label="New API key"
                    autoComplete="off"
                    className="min-w-0 bg-background font-mono text-xs"
                    onFocus={(event) => event.currentTarget.select()}
                    readOnly
                    ref={tokenInputRef}
                    spellCheck={false}
                    value={createdKey.token}
                  />
                  <Button onClick={handleCopy} type="button" variant="outline">
                    {copied ? (
                      <Check aria-hidden="true" data-icon="inline-start" />
                    ) : (
                      <Clipboard aria-hidden="true" data-icon="inline-start" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  <Button
                    onClick={() => {
                      setCreatedKey(null);
                      setCopied(false);
                    }}
                    type="button"
                    variant="secondary"
                  >
                    Done
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="rounded-lg border bg-muted/30 px-3 py-2.5 text-sm">
          <span className="text-muted-foreground">Request header: </span>
          <code className="break-all font-mono text-xs">
            Authorization: Bearer &lt;your-api-key&gt;
          </code>
        </div>

        <div className="border-t pt-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-medium">Your API keys</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Only the prefix is shown for identification. Full key values
                cannot be recovered.
              </p>
            </div>
            {apiKeys.length > 0 ? (
              <Badge variant="secondary">
                {apiKeys.length} {apiKeys.length === 1 ? "key" : "keys"}
              </Badge>
            ) : null}
          </div>

          {apiKeys.length > 0 ? (
            <div className="divide-y rounded-xl border">
              {apiKeys.map((apiKey) => (
                <div
                  className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center"
                  key={apiKey.id}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">
                        {apiKey.name}
                      </p>
                      <ApiKeyStatusBadge status={apiKey.status} />
                    </div>
                    <code className="mt-1 block text-xs text-muted-foreground">
                      {apiKey.prefix}...
                    </code>
                  </div>
                  <dl className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-4 lg:min-w-[34rem]">
                    <div>
                      <dt className="text-muted-foreground">Created</dt>
                      <dd className="mt-1 font-medium">
                        {formatDate(apiKey.createdAt, "Unknown")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Last used</dt>
                      <dd className="mt-1 font-medium">
                        {formatDate(apiKey.lastUsedAt, "Never")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Expires</dt>
                      <dd className="mt-1 font-medium">
                        {formatDate(apiKey.expiresAt, "No expiry")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Revoked</dt>
                      <dd className="mt-1 font-medium">
                        {formatDate(apiKey.revokedAt, "Not revoked")}
                      </dd>
                    </div>
                  </dl>
                  <Button
                    aria-label={`Revoke API key ${apiKey.name}`}
                    disabled={apiKey.status !== "active" || isRevoking}
                    onClick={() => setKeyToRevoke(apiKey)}
                    size="sm"
                    type="button"
                    variant="destructive"
                  >
                    <Trash2 aria-hidden="true" data-icon="inline-start" />
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed px-6 py-8 text-center">
              <KeyRound className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">No API keys yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create a key above when a trusted project needs API access.
              </p>
            </div>
          )}
        </div>
      </CardContent>

      <AlertDialog
        onOpenChange={(open) => {
          if (!open && !isRevoking) setKeyToRevoke(null);
        }}
        open={Boolean(keyToRevoke)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2 aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle>
              Revoke &ldquo;{keyToRevoke?.name}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Requests using this key will immediately stop authenticating. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isRevoking}
              onClick={handleRevoke}
              variant="destructive"
            >
              {isRevoking ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" />
              ) : (
                <Trash2 aria-hidden="true" />
              )}
              {isRevoking ? "Revoking..." : "Revoke key"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
