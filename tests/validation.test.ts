import { describe, expect, it } from "vitest";
import {
  commentSchema,
  createTicketSchema,
  deleteCommentAttachmentSchema,
  deleteTicketSchema,
  requestProjectAccessSchema,
  reviewProjectAccessSchema,
  ticketPrioritySchema,
  ticketStatusSchema,
  updateCommentSchema,
  updateTicketSchema,
} from "@/lib/validation";

describe("ticket validation", () => {
  it("accepts the planned status and priority values", () => {
    expect(ticketStatusSchema.options).toEqual(["pending", "ongoing", "done"]);
    expect(ticketPrioritySchema.options).toEqual(["low", "normal", "high"]);
  });

  it("requires useful ticket content", () => {
    const result = createTicketSchema.safeParse({
      title: "Printer issue",
      description: "The office printer is showing a paper jam error.",
      priority: "normal",
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      category: "Hardware",
    });

    expect(result.success).toBe(true);
  });

  it("accepts a complete ticket update and trims text fields", () => {
    const result = updateTicketSchema.safeParse({
      ticketId: "7b0f2d10-9c4c-4f21-92ba-5e3e7062968d",
      title: "  Printer issue  ",
      description: "The office printer is showing a paper jam error.",
      status: "ongoing",
      priority: "high",
      category: "Hardware",
      department: "Operations",
      location: "Main office",
      dueDate: "2026-08-15",
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.title).toBe("Printer issue");
  });

  it("rejects malformed ticket updates", () => {
    const validUpdate = {
      ticketId: "7b0f2d10-9c4c-4f21-92ba-5e3e7062968d",
      title: "Printer issue",
      description: "The office printer is showing a paper jam error.",
      status: "ongoing",
      priority: "normal",
      category: "Hardware",
      department: "",
      location: "",
      dueDate: "",
    };

    expect(updateTicketSchema.safeParse({ ...validUpdate, ticketId: "not-a-uuid" }).success).toBe(false);
    expect(updateTicketSchema.safeParse({ ...validUpdate, status: "closed" }).success).toBe(false);
    expect(updateTicketSchema.safeParse({ ...validUpdate, title: "No" }).success).toBe(false);
  });
});

describe("ticket deletion validation", () => {
  it("requires a valid ticket ID", () => {
    expect(
      deleteTicketSchema.safeParse({ ticketId: "550e8400-e29b-41d4-a716-446655440000" }).success,
    ).toBe(true);
    expect(deleteTicketSchema.safeParse({ ticketId: "not-a-uuid" }).success).toBe(false);
    expect(deleteTicketSchema.safeParse({}).success).toBe(false);
  });
});

describe("comment validation", () => {
  const ticketId = "550e8400-e29b-41d4-a716-446655440000";
  const parentCommentId = "7b0f2d10-9c4c-4f21-92ba-5e3e7062968d";

  it("accepts both top-level comments and replies", () => {
    expect(commentSchema.safeParse({ ticketId, body: "I can reproduce this issue." }).success).toBe(true);
    expect(
      commentSchema.safeParse({ ticketId, parentCommentId, body: "Here are the requested details." }).success,
    ).toBe(true);
  });

  it("rejects invalid parent IDs and empty comment bodies", () => {
    expect(commentSchema.safeParse({ ticketId, parentCommentId: "not-a-uuid", body: "Reply" }).success).toBe(false);
    expect(commentSchema.safeParse({ ticketId, body: "   " }).success).toBe(false);
  });

  it("accepts comment edits", () => {
    expect(
      updateCommentSchema.safeParse({ ticketId, commentId: parentCommentId, body: "Updated text" }).success,
    ).toBe(true);
  });

  it("accepts attachment deletion for a comment and rejects bad ids", () => {
    const valid = {
      ticketId,
      commentId: parentCommentId,
      attachmentId: "550e8400-e29b-41d4-a716-446655440000",
    };

    expect(deleteCommentAttachmentSchema.safeParse(valid).success).toBe(true);
    expect(deleteCommentAttachmentSchema.safeParse({ ...valid, attachmentId: "not-a-uuid" }).success).toBe(false);
  });
});

describe("project access request validation", () => {
  const projectId = "550e8400-e29b-41d4-a716-446655440000";
  const requestId = "7b0f2d10-9c4c-4f21-92ba-5e3e7062968d";

  it("requires at least one valid project ID", () => {
    expect(requestProjectAccessSchema.safeParse({ projectIds: [projectId] }).success).toBe(true);
    expect(requestProjectAccessSchema.safeParse({ projectIds: [] }).success).toBe(false);
    expect(requestProjectAccessSchema.safeParse({ projectIds: ["not-a-uuid"] }).success).toBe(false);
  });

  it.each(["approve", "reject"] as const)("accepts the %s review decision", (decision) => {
    expect(reviewProjectAccessSchema.safeParse({ requestId, decision }).success).toBe(true);
  });

  it("rejects unsupported decisions and invalid request IDs", () => {
    expect(reviewProjectAccessSchema.safeParse({ requestId, decision: "pending" }).success).toBe(false);
    expect(reviewProjectAccessSchema.safeParse({ requestId: "not-a-uuid", decision: "approve" }).success).toBe(false);
  });
});
