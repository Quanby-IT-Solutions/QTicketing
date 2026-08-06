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

export function canManageUsers(user: UserLike) {
  return user.role === "admin";
}

export function canAccessProject(user: UserLike & ProjectAccessLike, projectId: string) {
  return user.role === "admin" || Boolean(user.projectIds?.includes(projectId));
}
