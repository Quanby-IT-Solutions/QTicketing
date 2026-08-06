"use client";

import { useId, useState, useTransition } from "react";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { updateTicketInlineAction } from "@/app/actions/tickets";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { TicketPriority, TicketStatus } from "@/db/schema";
import { cn } from "@/lib/utils";

const selectTone = {
  pending:
    "[&_select]:border-amber-200 [&_select]:bg-amber-50 [&_select]:text-amber-800 dark:[&_select]:border-amber-900 dark:[&_select]:bg-amber-950/50 dark:[&_select]:text-amber-300",
  ongoing:
    "[&_select]:border-blue-200 [&_select]:bg-blue-50 [&_select]:text-blue-800 dark:[&_select]:border-blue-900 dark:[&_select]:bg-blue-950/50 dark:[&_select]:text-blue-300",
  done: "[&_select]:border-emerald-200 [&_select]:bg-emerald-50 [&_select]:text-emerald-800 dark:[&_select]:border-emerald-900 dark:[&_select]:bg-emerald-950/50 dark:[&_select]:text-emerald-300",
  low: "[&_select]:border-sky-200 [&_select]:bg-sky-50 [&_select]:text-sky-800 dark:[&_select]:border-sky-900 dark:[&_select]:bg-sky-950/50 dark:[&_select]:text-sky-300",
  normal:
    "[&_select]:border-border [&_select]:bg-background [&_select]:text-foreground dark:[&_select]:bg-input/30",
  high: "[&_select]:border-rose-200 [&_select]:bg-rose-50 [&_select]:text-rose-800 dark:[&_select]:border-rose-900 dark:[&_select]:bg-rose-950/50 dark:[&_select]:text-rose-300",
} satisfies Record<TicketStatus | TicketPriority, string>;

export function TicketInlineSelect({
  ticketId,
  field,
  value,
  options,
  ticketLabel,
}: {
  ticketId: string;
  field: "status" | "priority";
  value: TicketStatus | TicketPriority;
  options: readonly { label: string; value: string }[];
  ticketLabel?: string;
}) {
  const statusId = useId();
  const [selectedValue, setSelectedValue] = useState<TicketStatus | TicketPriority>(value);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fieldLabel = field === "status" ? "Status" : "Priority";
  const accessibleTicketLabel = ticketLabel ?? `ticket ${ticketId}`;

  return (
    <div className="flex min-w-40 items-center gap-2">
      <NativeSelect
        aria-busy={isPending}
        aria-describedby={isPending || error ? statusId : undefined}
        aria-invalid={error ? true : undefined}
        aria-label={`${fieldLabel} for ${accessibleTicketLabel}`}
        className={cn(
          "min-w-32 transition-opacity [&_select]:font-medium",
          selectTone[selectedValue],
          isPending && "opacity-70",
        )}
        disabled={isPending}
        onChange={(event) => {
          const nextValue = event.target.value as TicketStatus | TicketPriority;
          const previousValue = selectedValue;
          const formData = new FormData();

          setSelectedValue(nextValue);
          setError(null);
          formData.set("ticketId", ticketId);
          formData.set(field, nextValue);

          startTransition(async () => {
            try {
              await updateTicketInlineAction(formData);
            } catch {
              setSelectedValue(previousValue);
              setError(`${fieldLabel} could not be updated. Please try again.`);
            }
          });
        }}
        size="sm"
        value={selectedValue}
      >
        {options.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>

      {isPending ? (
        <span className="inline-flex size-4 shrink-0 items-center justify-center text-muted-foreground" id={statusId} role="status">
          <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
          <span className="sr-only">Updating {fieldLabel.toLocaleLowerCase()}.</span>
        </span>
      ) : error ? (
        <span
          className="inline-flex size-4 shrink-0 items-center justify-center text-destructive"
          id={statusId}
          role="alert"
          title={error}
        >
          <CircleAlert aria-hidden="true" className="size-3.5" />
          <span className="sr-only">{error}</span>
        </span>
      ) : null}
    </div>
  );
}
