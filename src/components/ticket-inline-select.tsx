"use client";

import { useId, useState, useTransition } from "react";
import { CheckCircle2, CircleAlert, Copy, LoaderCircle } from "lucide-react";
import { updateTicketInlineAction } from "@/app/actions/tickets";
import { priorityStyles, statusStyles } from "@/components/ticket-badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TicketPriority, TicketStatus } from "@/db/schema";
import { cn } from "@/lib/utils";

const selectTone = { ...statusStyles, ...priorityStyles } satisfies Record<TicketStatus | TicketPriority, string>;
const confirmationWord = "CONFIRM";

export function TicketInlineSelect({ ticketId, field, value, options, ticketLabel }: {
  ticketId: string;
  field: "status" | "priority";
  value: TicketStatus | TicketPriority;
  options: readonly { label: string; value: string }[];
  ticketLabel?: string;
}) {
  const statusId = useId();
  const [selectedValue, setSelectedValue] = useState<TicketStatus | TicketPriority>(value);
  const [pendingDone, setPendingDone] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fieldLabel = field === "status" ? "Status" : "Priority";
  const accessibleTicketLabel = ticketLabel ?? `ticket ${ticketId}`;

  function update(nextValue: TicketStatus | TicketPriority) {
    const previousValue = selectedValue;
    const formData = new FormData();
    setSelectedValue(nextValue); setError(null); formData.set("ticketId", ticketId); formData.set(field, nextValue);
    startTransition(async () => {
      try { await updateTicketInlineAction(formData); }
      catch { setSelectedValue(previousValue); setError(`${fieldLabel} could not be updated. Please try again.`); }
    });
  }

  function handleValueChange(nextValue: string | null) {
    if (!nextValue || isPending) return;
    if (field === "status" && nextValue === "done" && selectedValue !== "done") {
      setConfirmation(""); setCopied(false); setPendingDone(true); return;
    }
    update(nextValue as TicketStatus | TicketPriority);
  }

  async function copyConfirmationWord() {
    await navigator.clipboard.writeText(confirmationWord);
    setCopied(true);
  }

  return (
    <>
      <div className="flex min-w-40 items-center gap-2">
        <Select disabled={isPending} onValueChange={handleValueChange} value={selectedValue}>
          <SelectTrigger aria-busy={isPending} aria-describedby={isPending || error ? statusId : undefined} aria-invalid={error ? true : undefined} aria-label={`${fieldLabel} for ${accessibleTicketLabel}`} className={cn("min-w-32 font-medium transition-opacity", selectTone[selectedValue], isPending && "opacity-70")} size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false} side="bottom" sideOffset={6}>
            {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {isPending ? <span className="inline-flex size-4 shrink-0 items-center justify-center text-muted-foreground" id={statusId} role="status"><LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" /><span className="sr-only">Updating {fieldLabel.toLowerCase()}.</span></span> : error ? <span className="inline-flex size-4 shrink-0 items-center justify-center text-destructive" id={statusId} role="alert" title={error}><CircleAlert aria-hidden="true" className="size-3.5" /><span className="sr-only">{error}</span></span> : null}
      </div>

      <AlertDialog onOpenChange={(open) => { if (!open && !isPending) setPendingDone(false); }} open={pendingDone}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-emerald-500/10 text-emerald-600"><CheckCircle2 aria-hidden="true" /></AlertDialogMedia>
            <AlertDialogTitle>Mark ticket as done?</AlertDialogTitle>
            <AlertDialogDescription>Type <strong>{confirmationWord}</strong> to confirm. The requester will receive a completion email.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <div className="flex gap-2"><Input aria-label="Type CONFIRM to mark ticket done" autoFocus onChange={(event) => setConfirmation(event.target.value)} placeholder={`Type ${confirmationWord}`} value={confirmation} /><Button aria-label="Copy CONFIRM" onClick={copyConfirmationWord} size="icon" type="button" variant="outline">{copied ? <CheckCircle2 aria-hidden="true" /> : <Copy aria-hidden="true" />}</Button></div>
            <p className="text-xs text-muted-foreground">Copy and paste is supported.</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={confirmation !== confirmationWord || isPending} onClick={() => { update("done"); setPendingDone(false); }}><CheckCircle2 aria-hidden="true" />Mark done</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
