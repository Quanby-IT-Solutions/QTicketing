"use client";

import { useId, useMemo, useState } from "react";
import { Inbox, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TicketActionsMenu } from "@/components/ticket-actions-menu";
import { TicketPriorityBadge, TicketStatusBadge } from "@/components/ticket-badge";
import { TicketDetailsButton } from "@/components/ticket-details-dialog";
import { TicketInlineSelect } from "@/components/ticket-inline-select";
import type { TicketPriority, TicketStatus } from "@/db/schema";

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "ongoing", label: "Ongoing" },
  { value: "done", label: "Done" },
] as const;

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
] as const;

const priorityStyles = {
  low: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-300",
  normal:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
  high: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300",
} satisfies Record<TicketPriority, string>;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

type PageItem = number | "start-ellipsis" | "end-ellipsis";

function paginationItems(currentPage: number, pageCount: number): PageItem[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  if (currentPage <= 4) return [1, 2, 3, 4, 5, "end-ellipsis", pageCount];
  if (currentPage >= pageCount - 3) {
    return [1, "start-ellipsis", pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1, pageCount];
  }

  return [1, "start-ellipsis", currentPage - 1, currentPage, currentPage + 1, "end-ellipsis", pageCount];
}

export type TicketTableRow = {
  id: string;
  ticketNumber: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  department: string | null;
  location: string | null;
  dueDate: Date | string | null;
  requesterName: string;
  projectTitle: string;
  createdAt: Date;
  canEdit: boolean;
};

export function TicketsTable({
  rows,
  showProject = true,
  pageSize = 10,
}: {
  rows: TicketTableRow[];
  showProject?: boolean;
  pageSize?: number;
}) {
  const filterId = useId();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | TicketStatus>("all");
  const [priority, setPriority] = useState<"all" | TicketPriority>("all");
  const [page, setPage] = useState(1);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const hasFilters = normalizedQuery.length > 0 || status !== "all" || priority !== "all";

  const filteredRows = useMemo(
    () =>
      rows.filter((ticket) => {
        if (status !== "all" && ticket.status !== status) return false;
        if (priority !== "all" && ticket.priority !== priority) return false;
        if (!normalizedQuery) return true;

        const searchableText = [
          ticket.ticketNumber,
          ticket.title,
          ticket.requesterName,
          ticket.projectTitle,
          ticket.category,
          ticket.status,
          ticket.priority,
        ]
          .join(" ")
          .toLocaleLowerCase();

        return searchableText.includes(normalizedQuery.replace(/^#/, ""));
      }),
    [normalizedQuery, priority, rows, status],
  );

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / safePageSize));
  const currentPage = Math.min(page, pageCount);
  const firstResult = filteredRows.length === 0 ? 0 : (currentPage - 1) * safePageSize + 1;
  const lastResult = Math.min(currentPage * safePageSize, filteredRows.length);
  const visibleRows = filteredRows.slice(firstResult === 0 ? 0 : firstResult - 1, lastResult);

  function resetFilters() {
    setQuery("");
    setStatus("all");
    setPriority("all");
    setPage(1);
  }

  return (
    <section aria-label="Tickets" className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="space-y-3 border-b bg-muted/20 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <label className="sr-only" htmlFor={`${filterId}-search`}>
              Search tickets
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              className="h-9 bg-background pl-9"
              id={`${filterId}-search`}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search tickets, requesters, or projects..."
              type="search"
              value={query}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <label className="sr-only" htmlFor={`${filterId}-status`}>
              Filter by status
            </label>
            <NativeSelect
              className="w-full sm:w-36"
              id={`${filterId}-status`}
              onChange={(event) => {
                setStatus(event.target.value as "all" | TicketStatus);
                setPage(1);
              }}
              value={status}
            >
              <NativeSelectOption value="all">All statuses</NativeSelectOption>
              {statusOptions.map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>

            <label className="sr-only" htmlFor={`${filterId}-priority`}>
              Filter by priority
            </label>
            <NativeSelect
              className="w-full sm:w-36"
              id={`${filterId}-priority`}
              onChange={(event) => {
                setPriority(event.target.value as "all" | TicketPriority);
                setPage(1);
              }}
              value={priority}
            >
              <NativeSelectOption value="all">All priorities</NativeSelectOption>
              {priorityOptions.map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>

            {hasFilters ? (
              <Button className="col-span-2 sm:col-span-1" onClick={resetFilters} type="button" variant="ghost">
                <X aria-hidden="true" data-icon="inline-start" />
                Clear
              </Button>
            ) : null}
          </div>
        </div>

        <p aria-live="polite" className="text-xs text-muted-foreground">
          {filteredRows.length === 0
            ? `No tickets found${rows.length > 0 ? ` among ${rows.length} total` : ""}.`
            : `Showing ${firstResult}–${lastResult} of ${filteredRows.length} ${
                filteredRows.length === 1 ? "ticket" : "tickets"
              }${hasFilters && filteredRows.length !== rows.length ? ` (${rows.length} total)` : ""}.`}
        </p>
      </div>

      {visibleRows.length > 0 ? (
        <Table className={showProject ? "min-w-[72rem]" : "min-w-[62rem]"}>
          <TableCaption className="sr-only">
            Ticket list with requester, project, category, status, priority, creation date, and actions.
          </TableCaption>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-11 px-4" scope="col">
                Ticket
              </TableHead>
              <TableHead className="h-11 px-4" scope="col">
                Requester
              </TableHead>
              {showProject ? (
                <TableHead className="h-11 px-4" scope="col">
                  Project
                </TableHead>
              ) : null}
              <TableHead className="h-11 px-4" scope="col">
                Category
              </TableHead>
              <TableHead className="h-11 px-4" scope="col">
                Status
              </TableHead>
              <TableHead className="h-11 px-4" scope="col">
                Priority
              </TableHead>
              <TableHead className="h-11 px-4" scope="col">
                Created
              </TableHead>
              <TableHead className="h-11 w-14 px-3 text-right" scope="col">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((ticket) => {
            const ticketLabel = `ticket #${ticket.ticketNumber}, ${ticket.title}`;

            return (
              <TableRow className="group hover:bg-muted/35" key={ticket.id}>
                <TableCell className="min-w-72 px-4 py-3 whitespace-normal">
                  <TicketDetailsButton
                    className="block w-full rounded-sm text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    ticket={{
                      id: ticket.id,
                      ticketNumber: ticket.ticketNumber,
                      title: ticket.title,
                      status: ticket.status,
                      priority: ticket.priority,
                    }}
                  >
                    <span className="block font-mono text-xs font-medium text-muted-foreground">
                      #{ticket.ticketNumber}
                    </span>
                    <span className="mt-0.5 block font-medium text-foreground transition-colors group-hover:text-primary">
                      {ticket.title}
                    </span>
                  </TicketDetailsButton>
                </TableCell>
                <TableCell className="max-w-52 px-4 text-muted-foreground">
                  <span className="block truncate" title={ticket.requesterName}>
                    {ticket.requesterName}
                  </span>
                </TableCell>
                {showProject ? (
                  <TableCell className="max-w-52 px-4">
                    <span className="block truncate" title={ticket.projectTitle}>
                      {ticket.projectTitle}
                    </span>
                  </TableCell>
                ) : null}
                <TableCell className="max-w-44 px-4 text-muted-foreground">
                  <span className="block truncate" title={ticket.category}>
                    {ticket.category}
                  </span>
                </TableCell>
                <TableCell className="px-4">
                  {ticket.canEdit === false ? (
                    <TicketStatusBadge status={ticket.status} />
                  ) : (
                    <TicketInlineSelect
                      field="status"
                      key={`${ticket.id}-status-${ticket.status}`}
                      options={statusOptions}
                      ticketId={ticket.id}
                      ticketLabel={ticketLabel}
                      value={ticket.status}
                    />
                  )}
                </TableCell>
                <TableCell className="px-4">
                  {ticket.canEdit === false ? (
                    <TicketPriorityBadge priority={ticket.priority} />
                  ) : (
                    <TicketInlineSelect
                      field="priority"
                      key={`${ticket.id}-priority-${ticket.priority}`}
                      options={priorityOptions}
                      ticketId={ticket.id}
                      ticketLabel={ticketLabel}
                      value={ticket.priority}
                    />
                  )}
                </TableCell>
                <TableCell className="px-4 font-mono text-xs text-muted-foreground tabular-nums">
                  <time dateTime={new Date(ticket.createdAt).toISOString()}>
                    {dateFormatter.format(new Date(ticket.createdAt))}
                  </time>
                </TableCell>
                <TableCell className="w-14 px-3 text-right">
                  <TicketActionsMenu ticket={ticket} />
                </TableCell>
              </TableRow>
            );
            })}
          </TableBody>
        </Table>
      ) : (
        <div className="flex h-56 items-center justify-center px-4 text-center">
          <div className="flex max-w-sm flex-col items-center">
            <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Inbox aria-hidden="true" className="size-5" />
            </div>
            <p className="font-medium">{hasFilters ? "No matching tickets" : "No tickets yet"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasFilters
                ? "Try a different search term or clear one of the filters."
                : "New tickets will appear here once they are created."}
            </p>
            {hasFilters ? (
              <Button className="mt-4" onClick={resetFilters} size="sm" type="button" variant="outline">
                Clear filters
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {filteredRows.length > 0 ? (
        <div className="flex flex-col gap-3 border-t bg-muted/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Page {currentPage} of {pageCount}
          </p>

          {pageCount > 1 ? (
            <Pagination className="mx-0 w-auto justify-start sm:justify-end">
              <PaginationContent>
                <PaginationItem>
                  <Button
                    aria-label="Go to previous page"
                    disabled={currentPage === 1}
                    onClick={() => setPage(Math.max(1, currentPage - 1))}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Previous
                  </Button>
                </PaginationItem>

                <PaginationItem className="px-2 text-sm tabular-nums sm:hidden">
                  {currentPage} / {pageCount}
                </PaginationItem>

                {paginationItems(currentPage, pageCount).map((item) =>
                  typeof item === "number" ? (
                    <PaginationItem className="hidden sm:block" key={item}>
                      <Button
                        aria-current={item === currentPage ? "page" : undefined}
                        aria-label={`Go to page ${item}`}
                        onClick={() => setPage(item)}
                        size="icon-sm"
                        type="button"
                        variant={item === currentPage ? "outline" : "ghost"}
                      >
                        {item}
                      </Button>
                    </PaginationItem>
                  ) : (
                    <PaginationItem className="hidden sm:block" key={item}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ),
                )}

                <PaginationItem>
                  <Button
                    aria-label="Go to next page"
                    disabled={currentPage === pageCount}
                    onClick={() => setPage(Math.min(pageCount, currentPage + 1))}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Next
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function PriorityLegend() {
  return (
    <div aria-label="Ticket priority legend" className="flex flex-wrap items-center gap-2 text-sm" role="group">
      <span className="text-xs font-medium text-muted-foreground">Priority</span>
      {priorityOptions.map((priority) => (
        <Badge className={priorityStyles[priority.value]} key={priority.value} variant="outline">
          {priority.label}
        </Badge>
      ))}
    </div>
  );
}
