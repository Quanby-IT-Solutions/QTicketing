import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, ticketStatusHistory, tickets } from "@/db/schema";
import { authenticateApiRequest } from "@/lib/api-auth";
import { updateApiTicketSchema } from "@/lib/api-ticket-validation";

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
  const [project] = await db.select({ id: projects.id, name: projects.name, title: projects.title }).from(projects).where(and(eq(projects.id, ticket.projectId), eq(projects.name, projectCode.trim().toUpperCase()), eq(projects.active, true))).limit(1);
  if (!project) return { error: response({ error: { code: "TICKET_NOT_FOUND", message: "The ticket was not found in this active project." } }, 404) };
  if (user.role !== "admin" && !user.projectIds.includes(project.id)) return { error: response({ error: { code: "FORBIDDEN", message: "This API key cannot access tickets for this project." } }, 403) };
  return { user, project, ticket };
}

function serialize(ticket: typeof tickets.$inferSelect) {
  return { ...ticket, dueDate: ticket.dueDate?.toISOString() ?? null, resolvedAt: ticket.resolvedAt?.toISOString() ?? null, createdAt: ticket.createdAt.toISOString(), updatedAt: ticket.updatedAt.toISOString() };
}

export async function GET(request: Request, context: Context) {
  const result = await getAuthorizedTicket(request, context);
  if ("error" in result) return result.error;
  return response({ data: { ticket: serialize(result.ticket), project: result.project } }, 200);
}

export async function PATCH(request: Request, context: Context) {
  const result = await getAuthorizedTicket(request, context);
  if ("error" in result) return result.error;
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return response({ error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Content-Type must be application/json." } }, 415);
  let body: unknown;
  try { body = await request.json(); } catch { return response({ error: { code: "INVALID_JSON", message: "Request body must be valid JSON." } }, 400); }
  const parsed = updateApiTicketSchema.safeParse(body);
  if (!parsed.success) return response({ error: { code: "VALIDATION_ERROR", message: "The submitted ticket data is invalid.", fields: parsed.error.flatten().fieldErrors, form: parsed.error.flatten().formErrors } }, 400);
  const data = parsed.data;
  const now = new Date();
  const statusChanged = data.status !== undefined && data.status !== result.ticket.status;
  const updates: Partial<typeof tickets.$inferInsert> = { ...data, dueDate: data.dueDate === undefined ? undefined : data.dueDate ? new Date(data.dueDate) : null, updatedAt: now };
  if (statusChanged) updates.resolvedAt = data.status === "done" ? now : null;
  await db.transaction(async (tx) => {
    const [updated] = await tx.update(tickets).set(updates).where(eq(tickets.id, result.ticket.id)).returning();
    if (statusChanged) await tx.insert(ticketStatusHistory).values({ ticketId: result.ticket.id, changedById: result.user.id, fromStatus: result.ticket.status, toStatus: data.status! });
    result.ticket = updated;
  });
  revalidatePath("/tickets"); revalidatePath("/dashboard"); revalidatePath(`/tickets/${result.project.name}`); revalidatePath(`/tickets/detail/${result.ticket.id}`);
  return response({ data: { ticket: serialize(result.ticket) } }, 200);
}

export async function DELETE(request: Request, context: Context) {
  const result = await getAuthorizedTicket(request, context);
  if ("error" in result) return result.error;
  await db.delete(tickets).where(eq(tickets.id, result.ticket.id));
  revalidatePath("/tickets"); revalidatePath("/dashboard"); revalidatePath(`/tickets/${result.project.name}`);
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
