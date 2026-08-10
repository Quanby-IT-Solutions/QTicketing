import { createTicketSchema } from "@/lib/validation";
import { z } from "zod";

function isIsoCalendarDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

const apiDueDateSchema = createTicketSchema.shape.dueDate.refine(
  (value) => !value || isIsoCalendarDate(value),
  "Use a valid date in YYYY-MM-DD format.",
);

/**
 * API callers cannot choose the project, requester, status, or assignee. The
 * project comes from the URL and the requester comes from the Bearer token.
 */
export const createApiTicketSchema = createTicketSchema
  .omit({ projectId: true })
  .extend({ dueDate: apiDueDateSchema })
  .strict();

export const createRmisIntegrationTicketSchema = createApiTicketSchema
  .extend({
    requesterEmail: z.string().trim().email().max(255),
  })
  .strict();

export const updateApiTicketSchema = z
  .object({
    title: createTicketSchema.shape.title.optional(),
    description: createTicketSchema.shape.description.optional(),
    status: z.enum(["pending", "ongoing", "done"]).optional(),
    priority: createTicketSchema.shape.priority.optional(),
    category: createTicketSchema.shape.category.optional(),
    department: createTicketSchema.shape.department.optional(),
    location: createTicketSchema.shape.location.optional(),
    dueDate: apiDueDateSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Send at least one editable ticket field.");
