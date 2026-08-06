import { Badge } from "@/components/ui/badge";
import type { TicketPriority, TicketStatus } from "@/db/schema";
import { cn } from "@/lib/utils";

const statusStyles: Record<TicketStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  ongoing: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  done: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
};

const priorityStyles: Record<TicketPriority, string> = {
  low: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
  normal: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-300",
  high: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300",
};

function humanize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function TicketStatusBadge({ status, className }: { status: TicketStatus; className?: string }) {
  return (
    <Badge className={cn("gap-1.5", statusStyles[status], className)} variant="outline">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {humanize(status)}
    </Badge>
  );
}

export function TicketPriorityBadge({ priority, className }: { priority: TicketPriority; className?: string }) {
  return (
    <Badge className={cn(priorityStyles[priority], className)} variant="outline">
      {humanize(priority)}
    </Badge>
  );
}

export { priorityStyles, statusStyles };
