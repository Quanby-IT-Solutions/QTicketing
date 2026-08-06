import {
  AnyPgColumn,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", ["admin", "agent", "requester"]);
export const userStatusEnum = pgEnum("user_status", ["pending", "approved", "rejected"]);
export const ticketStatusEnum = pgEnum("ticket_status", ["pending", "ongoing", "done"]);
export const ticketPriorityEnum = pgEnum("ticket_priority", ["low", "normal", "high"]);
export const projectAccessRequestStatusEnum = pgEnum("project_access_request_status", [
  "pending",
  "approved",
  "rejected",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("requester"),
  status: userStatusEnum("status").notNull().default("pending"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 40 }).notNull().unique(),
  title: varchar("title", { length: 120 }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userProjects = pgTable(
  "user_projects",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.projectId] }),
    userIdx: index("user_projects_user_idx").on(table.userId),
    projectIdx: index("user_projects_project_idx").on(table.projectId),
  }),
);

export const projectAccessRequests = pgTable(
  "project_access_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    status: projectAccessRequestStatusEnum("status").notNull().default("pending"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedById: uuid("reviewed_by_id").references(() => users.id, { onDelete: "set null" }),
  },
  (table) => ({
    userProjectUniqueIdx: uniqueIndex("project_access_requests_user_project_unique").on(table.userId, table.projectId),
    statusIdx: index("project_access_requests_status_idx").on(table.status),
    userIdx: index("project_access_requests_user_idx").on(table.userId),
    projectIdx: index("project_access_requests_project_idx").on(table.projectId),
  }),
);

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketNumber: integer("ticket_number").generatedAlwaysAsIdentity().notNull().unique(),
    title: varchar("title", { length: 160 }).notNull(),
    description: text("description").notNull(),
    status: ticketStatusEnum("status").notNull().default("pending"),
    priority: ticketPriorityEnum("priority").notNull().default("normal"),
    category: varchar("category", { length: 80 }).notNull(),
    department: varchar("department", { length: 80 }),
    location: varchar("location", { length: 120 }),
    dueDate: timestamp("due_date", { withTimezone: true }),
    projectId: uuid("project_id").notNull().references(() => projects.id),
    requesterId: uuid("requester_id").notNull().references(() => users.id),
    assigneeId: uuid("assignee_id").references(() => users.id),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    requesterIdx: index("tickets_requester_idx").on(table.requesterId),
    projectIdx: index("tickets_project_idx").on(table.projectId),
    assigneeIdx: index("tickets_assignee_idx").on(table.assigneeId),
    statusIdx: index("tickets_status_idx").on(table.status),
  }),
);

export const ticketComments = pgTable(
  "ticket_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id").notNull().references(() => tickets.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").notNull().references(() => users.id),
    parentCommentId: uuid("parent_comment_id").references((): AnyPgColumn => ticketComments.id, {
      onDelete: "cascade",
    }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ticketIdx: index("ticket_comments_ticket_idx").on(table.ticketId),
    parentIdx: index("ticket_comments_parent_idx").on(table.parentCommentId),
  }),
);

export const ticketAttachments = pgTable("ticket_attachments", {
  id: uuid("id").defaultRandom().primaryKey(),
  ticketId: uuid("ticket_id").notNull().references(() => tickets.id, { onDelete: "cascade" }),
  uploaderId: uuid("uploader_id").notNull().references(() => users.id),
  objectKey: text("object_key").notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 160 }).notNull(),
  size: integer("size").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ticketStatusHistory = pgTable("ticket_status_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  ticketId: uuid("ticket_id").notNull().references(() => tickets.id, { onDelete: "cascade" }),
  changedById: uuid("changed_by_id").notNull().references(() => users.id),
  fromStatus: ticketStatusEnum("from_status"),
  toStatus: ticketStatusEnum("to_status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ticketRelations = relations(tickets, ({ one, many }) => ({
  requester: one(users, { fields: [tickets.requesterId], references: [users.id], relationName: "requester" }),
  assignee: one(users, { fields: [tickets.assigneeId], references: [users.id], relationName: "assignee" }),
  project: one(projects, { fields: [tickets.projectId], references: [projects.id] }),
  comments: many(ticketComments),
  attachments: many(ticketAttachments),
  statusHistory: many(ticketStatusHistory),
}));

export const ticketCommentRelations = relations(ticketComments, ({ one, many }) => ({
  ticket: one(tickets, { fields: [ticketComments.ticketId], references: [tickets.id] }),
  author: one(users, { fields: [ticketComments.authorId], references: [users.id] }),
  parent: one(ticketComments, {
    fields: [ticketComments.parentCommentId],
    references: [ticketComments.id],
    relationName: "commentReplies",
  }),
  replies: many(ticketComments, { relationName: "commentReplies" }),
}));

export const userRelations = relations(users, ({ many }) => ({
  requestedTickets: many(tickets, { relationName: "requester" }),
  assignedTickets: many(tickets, { relationName: "assignee" }),
  userProjects: many(userProjects),
  projectAccessRequests: many(projectAccessRequests, { relationName: "accessRequestUser" }),
  projectAccessReviews: many(projectAccessRequests, { relationName: "accessRequestReviewer" }),
}));

export const projectRelations = relations(projects, ({ many }) => ({
  tickets: many(tickets),
  userProjects: many(userProjects),
  accessRequests: many(projectAccessRequests),
}));

export const userProjectRelations = relations(userProjects, ({ one }) => ({
  user: one(users, { fields: [userProjects.userId], references: [users.id] }),
  project: one(projects, { fields: [userProjects.projectId], references: [projects.id] }),
}));

export const projectAccessRequestRelations = relations(projectAccessRequests, ({ one }) => ({
  user: one(users, {
    fields: [projectAccessRequests.userId],
    references: [users.id],
    relationName: "accessRequestUser",
  }),
  project: one(projects, {
    fields: [projectAccessRequests.projectId],
    references: [projects.id],
  }),
  reviewedBy: one(users, {
    fields: [projectAccessRequests.reviewedById],
    references: [users.id],
    relationName: "accessRequestReviewer",
  }),
}));

export type TicketStatus = (typeof ticketStatusEnum.enumValues)[number];
export type TicketPriority = (typeof ticketPriorityEnum.enumValues)[number];
export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type UserStatus = (typeof userStatusEnum.enumValues)[number];
export type ProjectAccessRequestStatus = (typeof projectAccessRequestStatusEnum.enumValues)[number];

export const nowSql = sql`now()`;
