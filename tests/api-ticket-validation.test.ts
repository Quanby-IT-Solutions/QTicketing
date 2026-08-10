import { describe, expect, it } from "vitest";
import {
  createApiTicketSchema,
  createRmisIntegrationTicketSchema,
} from "@/lib/api-ticket-validation";

const validTicket = {
  title: "Unable to archive record",
  description: "Archiving the record returns an error.",
  priority: "normal",
  category: "Software",
  department: "Records",
  location: "Main Office",
  dueDate: "2026-08-20",
};

describe("API ticket validation", () => {
  it("accepts ticket fields and applies the default priority", () => {
    const result = createApiTicketSchema.safeParse({
      title: validTicket.title,
      description: validTicket.description,
      category: validTicket.category,
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.priority).toBe("normal");
  });

  it("accepts a valid complete JSON ticket payload", () => {
    expect(createApiTicketSchema.safeParse(validTicket).success).toBe(true);
  });

  it.each(["projectId", "requesterId", "status", "assigneeId"])(
    "rejects the server-controlled %s field",
    (field) => {
      expect(createApiTicketSchema.safeParse({ ...validTicket, [field]: "client-controlled" }).success).toBe(false);
    },
  );

  it("rejects unknown attachment metadata and invalid calendar dates", () => {
    expect(createApiTicketSchema.safeParse({ ...validTicket, attachments: [] }).success).toBe(false);
    expect(createApiTicketSchema.safeParse({ ...validTicket, dueDate: "2026-02-30" }).success).toBe(false);
    expect(createApiTicketSchema.safeParse({ ...validTicket, dueDate: "08/20/2026" }).success).toBe(false);
  });
});

describe("RMIS integration ticket validation", () => {
  it("requires the authenticated RMIS user's email alongside valid ticket data", () => {
    expect(
      createRmisIntegrationTicketSchema.safeParse({
        ...validTicket,
        requesterEmail: "juan@example.com",
      }).success,
    ).toBe(true);
    expect(createRmisIntegrationTicketSchema.safeParse(validTicket).success).toBe(false);
    expect(
      createRmisIntegrationTicketSchema.safeParse({
        ...validTicket,
        requesterEmail: "not-an-email",
      }).success,
    ).toBe(false);
  });
});
