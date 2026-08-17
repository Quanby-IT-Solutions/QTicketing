import { z } from "zod";

export const ticketStatusSchema = z.enum(["pending", "ongoing", "done"]);
export const ticketPrioritySchema = z.enum(["low", "normal", "high"]);

export const createTicketSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(1).max(5000),
  priority: ticketPrioritySchema.default("normal"),
  projectId: z.string().uuid(),
  category: z.string().trim().min(2).max(80),
  department: z.string().trim().max(80).optional().or(z.literal("")),
  location: z.string().trim().max(120).optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
});

export const updateTicketSchema = z.object({
  ticketId: z.string().uuid(),
  title: createTicketSchema.shape.title,
  description: createTicketSchema.shape.description,
  status: ticketStatusSchema,
  priority: ticketPrioritySchema,
  assigneeId: z.string().uuid().optional().or(z.literal("")),
  category: createTicketSchema.shape.category,
  department: createTicketSchema.shape.department,
  location: createTicketSchema.shape.location,
  dueDate: createTicketSchema.shape.dueDate,
});

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  projectIds: z.array(z.string().uuid()).min(1, "Select at least one project."),
});

export const rmisProvisionUserSchema = registerSchema.pick({
  name: true,
  email: true,
  password: true,
});

export const updateUserAccessSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "agent", "requester"]),
  status: z.enum(["pending", "approved", "rejected"]),
  active: z.boolean(),
  projectIds: z.array(z.string().uuid()),
});

export const requestProjectAccessSchema = z.object({
  projectIds: z.array(z.string().uuid()).min(1, "Select at least one project."),
});

export const reviewProjectAccessSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
});

export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[A-Z0-9-]+$/, "Use uppercase letters, numbers, and hyphens only."),
  title: z.string().trim().min(2).max(120),
  classification: z.enum(["white-label", "custom", "internal", "product"]),
});

export const updateProjectSchema = z.object({
  projectId: z.string().uuid(),
  name: createProjectSchema.shape.name,
  title: createProjectSchema.shape.title,
  classification: createProjectSchema.shape.classification,
});

export const toggleProjectActiveSchema = z.object({
  projectId: z.string().uuid(),
});

export const deleteProjectSchema = z.object({
  projectId: z.string().uuid(),
});

export const updateTicketInlineSchema = z.object({
  ticketId: z.string().uuid(),
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
});

export const commentSchema = z.object({
  ticketId: z.string().uuid(),
  parentCommentId: z.string().uuid().optional(),
  body: z.string().trim().min(1).max(3000),
});

export const updateCommentSchema = z.object({
  ticketId: z.string().uuid(),
  commentId: z.string().uuid(),
  body: z.string().trim().min(1).max(3000),
});

export const deleteCommentSchema = z.object({
  ticketId: z.string().uuid(),
  commentId: z.string().uuid(),
});

export const deleteCommentAttachmentSchema = z.object({
  ticketId: z.string().uuid(),
  commentId: z.string().uuid(),
  attachmentId: z.string().uuid(),
});

export const deleteTicketSchema = z.object({
  ticketId: z.string().uuid(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type UpdateTicketInlineInput = z.infer<typeof updateTicketInlineSchema>;
export type RequestProjectAccessInput = z.infer<typeof requestProjectAccessSchema>;
export type ReviewProjectAccessInput = z.infer<typeof reviewProjectAccessSchema>;
