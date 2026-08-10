import { describe, expect, it } from "vitest";
import {
  canDeleteTicket,
  canEditTicket,
  canManageUsers,
  canViewTicket,
} from "@/lib/permissions";

describe("ticket permissions", () => {
  const ticket = { projectId: "project-1", requesterId: "requester-1", assigneeId: null };

  it("allows every assigned project member to view and edit tickets", () => {
    const user = { id: "requester-2", role: "requester" as const, projectIds: ["project-1"] };

    expect(canViewTicket(user, ticket)).toBe(true);
    expect(canEditTicket(user, ticket)).toBe(true);
  });

  it("allows admins across every project", () => {
    expect(canViewTicket({ id: "admin-1", role: "admin" as const }, ticket)).toBe(true);
    expect(canEditTicket({ id: "admin-1", role: "admin" as const }, ticket)).toBe(true);
  });

  it("limits user management to admins", () => {
    expect(canManageUsers({ id: "admin-1", role: "admin" as const })).toBe(true);
    expect(canManageUsers({ id: "agent-1", role: "agent" as const })).toBe(false);
  });

  it("allows assigned project members and admins to delete a ticket", () => {
    expect(canDeleteTicket({ id: "requester-1", role: "requester" as const, projectIds: ["project-1"] }, ticket)).toBe(true);
    expect(canDeleteTicket({ id: "agent-1", role: "agent" as const, projectIds: ["project-1"] }, ticket)).toBe(true);
    expect(canDeleteTicket({ id: "admin-1", role: "admin" as const }, ticket)).toBe(true);
  });

  it("blocks users without access to the ticket project", () => {
    expect(
      canDeleteTicket({ id: "requester-2", role: "requester" as const, projectIds: ["project-2"] }, ticket),
    ).toBe(false);
  });
});

