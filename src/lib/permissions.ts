import type { UserRole } from "@/db/schema";

type UserLike = {
  id: string;
  role: UserRole;
};

type TicketLike = {
  requesterId: string;
  assigneeId: string | null;
  projectId?: string;
};

type ProjectAccessLike = {
  projectIds?: string[];
};

export function canViewTicket(user: UserLike, ticket: TicketLike) {
  return user.role === "admin" || user.role === "agent" || ticket.requesterId === user.id;
}

export function canEditTicket(user: UserLike, ticket: TicketLike) {
  return user.role === "admin" || user.role === "agent" || ticket.requesterId === user.id;
}

export function canDeleteTicket(user: UserLike, ticket: TicketLike) {
  // Deleting is permanent, but for now the same people who can edit a ticket
  // can delete it: admins, agents, and the requester who created it.
  return canEditTicket(user, ticket);
}

export function canManageUsers(user: UserLike) {
  return user.role === "admin";
}

export function canAccessProject(user: UserLike & ProjectAccessLike, projectId: string) {
  return user.role === "admin" || Boolean(user.projectIds?.includes(projectId));
}
