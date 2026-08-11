import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, ticketComments, tickets, users } from "@/db/schema";
import { authenticateApiRequest } from "@/lib/api-auth";
import { createApiCommentSchema } from "@/lib/api-ticket-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ projectCode: string; ticketId: string }> };

function response(body: unknown, status: number, headers?: HeadersInit) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

async function getAuthorizedTicket(request: Request, { params }: Context) {
  const user = await authenticateApiRequest(request);
  if (!user) return { error: response({ error: { code: "UNAUTHORIZED", message: "A valid Bearer API key is required." } }, 401, { "WWW-Authenticate": "Bearer" }) };
  const { projectCode, ticketId } = await params;
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);
  if (!ticket) return { error: response({ error: { code: "TICKET_NOT_FOUND", message: "The ticket was not found." } }, 404) };
  const [project] = await db.select({ id: projects.id, name: projects.name }).from(projects).where(and(eq(projects.id, ticket.projectId), eq(projects.name, projectCode.trim().toUpperCase()), eq(projects.active, true))).limit(1);
  if (!project) return { error: response({ error: { code: "TICKET_NOT_FOUND", message: "The ticket was not found in this active project." } }, 404) };
  if (user.role !== "admin" && !user.projectIds.includes(project.id)) return { error: response({ error: { code: "FORBIDDEN", message: "This API key cannot access comments for this project." } }, 403) };
  return { user, ticket, project };
}

export async function GET(request: Request, context: Context) {
  const result = await getAuthorizedTicket(request, context);
  if ("error" in result) return result.error;
  const comments = await db.select({ id: ticketComments.id, parentCommentId: ticketComments.parentCommentId, authorId: ticketComments.authorId, authorName: users.name, authorEmail: users.email, body: ticketComments.body, createdAt: ticketComments.createdAt }).from(ticketComments).innerJoin(users, eq(ticketComments.authorId, users.id)).where(eq(ticketComments.ticketId, result.ticket.id)).orderBy(asc(ticketComments.createdAt));
  return response({ data: { comments: comments.map((comment) => ({ ...comment, createdAt: comment.createdAt.toISOString(), canManage: result.user.role === "admin" || comment.authorId === result.user.id })) } }, 200);
}

export async function POST(request: Request, context: Context) {
  const result = await getAuthorizedTicket(request, context);
  if ("error" in result) return result.error;
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return response({ error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Content-Type must be application/json." } }, 415);
  let body: unknown;
  try { body = await request.json(); } catch { return response({ error: { code: "INVALID_JSON", message: "Request body must be valid JSON." } }, 400); }
  const parsed = createApiCommentSchema.safeParse(body);
  if (!parsed.success) return response({ error: { code: "VALIDATION_ERROR", message: "The submitted comment is invalid.", fields: parsed.error.flatten().fieldErrors } }, 400);
  if (parsed.data.parentCommentId) {
    const [parent] = await db.select({ id: ticketComments.id }).from(ticketComments).where(and(eq(ticketComments.id, parsed.data.parentCommentId), eq(ticketComments.ticketId, result.ticket.id))).limit(1);
    if (!parent) return response({ error: { code: "PARENT_COMMENT_NOT_FOUND", message: "The reply parent does not belong to this ticket." } }, 400);
  }
  const [comment] = await db.transaction(async (tx) => {
    const inserted = await tx.insert(ticketComments).values({ ticketId: result.ticket.id, authorId: result.user.id, parentCommentId: parsed.data.parentCommentId ?? null, body: parsed.data.body }).returning();
    await tx.update(tickets).set({ updatedAt: new Date() }).where(eq(tickets.id, result.ticket.id));
    return inserted;
  });
  return response({ data: { comment: { id: comment.id, ticketId: comment.ticketId, parentCommentId: comment.parentCommentId, authorId: comment.authorId, body: comment.body, createdAt: comment.createdAt.toISOString() } } }, 201);
}
