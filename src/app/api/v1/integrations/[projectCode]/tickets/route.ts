import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, userProjects, users } from "@/db/schema";
import { createRmisIntegrationTicketSchema } from "@/lib/api-ticket-validation";
import { env } from "@/lib/env";
import { hasValidBearerAuthorization } from "@/lib/rmis-integration-auth";
import { createTicket } from "@/lib/services/ticket-creation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(body: unknown, status: number, headers?: HeadersInit) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export async function POST(request: Request, { params }: { params: Promise<{ projectCode: string }> }) {
  const { projectCode } = await params;
  const code = projectCode.trim().toUpperCase();
  if (!env.TICKETING_TICKET_API_KEY) return response({ error: { code: "INTEGRATION_NOT_CONFIGURED", message: "Integration ticket creation is not configured." } }, 503);
  if (!hasValidBearerAuthorization(request.headers.get("authorization"), env.TICKETING_TICKET_API_KEY)) {
    return response({ error: { code: "UNAUTHORIZED", message: "A valid Bearer integration key is required." } }, 401, { "WWW-Authenticate": "Bearer" });
  }
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return response({ error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Content-Type must be application/json. Attachments are not supported by this endpoint." } }, 415);
  let body: unknown;
  try { body = await request.json(); } catch { return response({ error: { code: "INVALID_JSON", message: "Request body must be valid JSON." } }, 400); }
  const parsed = createRmisIntegrationTicketSchema.safeParse(body);
  if (!parsed.success) return response({ error: { code: "VALIDATION_ERROR", message: "The submitted ticket data is invalid.", fields: parsed.error.flatten().fieldErrors } }, 400);

  const [project] = await db.select({ id: projects.id, name: projects.name, title: projects.title }).from(projects).where(and(eq(projects.name, code), eq(projects.active, true))).limit(1);
  if (!project) return response({ error: { code: "PROJECT_UNAVAILABLE", message: `The ${code} project is missing or inactive.` } }, 503);
  const [requester] = await db.select({ id: users.id, role: users.role }).from(users).where(and(eq(users.email, parsed.data.requesterEmail.toLowerCase()), eq(users.active, true), eq(users.status, "approved"))).limit(1);
  if (!requester) return response({ error: { code: "REQUESTER_FORBIDDEN", message: "The requester cannot create tickets for this project." } }, 403);
  if (requester.role !== "admin") {
    const [membership] = await db.select({ projectId: userProjects.projectId }).from(userProjects).where(and(eq(userProjects.userId, requester.id), eq(userProjects.projectId, project.id))).limit(1);
    if (!membership) return response({ error: { code: "REQUESTER_FORBIDDEN", message: "The requester cannot create tickets for this project." } }, 403);
  }
  try {
    const { requesterEmail: _requesterEmail, ...ticketInput } = parsed.data;
    const ticket = await createTicket({ ...ticketInput, projectId: project.id, requesterId: requester.id });
    revalidatePath("/tickets"); revalidatePath("/dashboard"); revalidatePath(`/tickets/${project.name}`);
    return response({ data: { ticket: { id: ticket.id, ticketNumber: ticket.ticketNumber, status: ticket.status, priority: ticket.priority, project: { id: project.id, code: project.name, title: project.title }, createdAt: ticket.createdAt.toISOString() } } }, 201, { Location: `/tickets/detail/${ticket.id}` });
  } catch (error) {
    console.error("Integration ticket creation failed.", error);
    return response({ error: { code: "INTERNAL_ERROR", message: "Unable to create the ticket." } }, 500);
  }
}
