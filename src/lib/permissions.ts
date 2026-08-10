import type { UserRole } from "@/db/schema";

type UserLike = {
  id: string;
  role: UserRole;
};

type TicketLike = {
  requesterId: string;
  assigneeId: string | null;
  projectId: string;
};

type ProjectAccessLike = {
  projectIds?: string[];
};

export function canViewTicket(user: UserLike & ProjectAccessLike, ticket: TicketLike) {
  return canAccessProject(user, ticket.projectId);
}

export function canEditTicket(user: UserLike & ProjectAccessLike, ticket: TicketLike) {
  return canAccessProject(user, ticket.projectId);
}

export function canDeleteTicket(user: UserLike & ProjectAccessLike, ticket: TicketLike) {
  return canEditTicket(user, ticket);
}

export function canManageUsers(user: UserLike) {
  return user.role === "admin";
}

export function canAccessProject(user: UserLike & ProjectAccessLike, projectId: string) {
  return user.role === "admin" || Boolean(user.projectIds?.includes(projectId));
}
