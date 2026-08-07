import { describe, expect, it } from "vitest";
import {
  canDeleteTicket,
  canEditTicket,
  canManageUsers,
  canViewTicket,
} from "@/lib/permissions";

describe("ticket permissions", () => {
  const ticket = { requesterId: "requester-1", assigneeId: null };

  it("allows creators to view and edit their tickets", () => {
    const user = { id: "requester-1", role: "requester" as const };

    expect(canViewTicket(user, ticket)).toBe(true);
    expect(canEditTicket(user, ticket)).toBe(true);
  });

  it("allows agents and admins across the queue", () => {
    expect(canViewTicket({ id: "agent-1", role: "agent" as const }, ticket)).toBe(true);
    expect(canEditTicket({ id: "admin-1", role: "admin" as const }, ticket)).toBe(true);
  });

  it("limits user management to admins", () => {
    expect(canManageUsers({ id: "admin-1", role: "admin" as const })).toBe(true);
    expect(canManageUsers({ id: "agent-1", role: "agent" as const })).toBe(false);
  });

  it("allows creators, agents, and admins to delete a ticket", () => {
    expect(canDeleteTicket({ id: "requester-1", role: "requester" as const }, ticket)).toBe(true);
    expect(canDeleteTicket({ id: "agent-1", role: "agent" as const }, ticket)).toBe(true);
    expect(canDeleteTicket({ id: "admin-1", role: "admin" as const }, ticket)).toBe(true);
  });

  it("blocks non-creator requesters from deleting a ticket", () => {
    expect(
      canDeleteTicket({ id: "requester-2", role: "requester" as const }, ticket),
    ).toBe(false);
  });
});

