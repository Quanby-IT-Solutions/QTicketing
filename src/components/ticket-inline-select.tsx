"use client";

import { useId, useState, useTransition } from "react";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { updateTicketInlineAction } from "@/app/actions/tickets";
import { priorityStyles, statusStyles } from "@/components/ticket-badge";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { TicketPriority, TicketStatus } from "@/db/schema";
import { cn } from "@/lib/utils";

const selectTone = {
  ...statusStyles,
  ...priorityStyles,
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
          "min-w-32 font-medium transition-opacity",
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
