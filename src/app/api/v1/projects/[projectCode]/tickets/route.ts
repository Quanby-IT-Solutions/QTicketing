import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, userProjects } from "@/db/schema";
import { authenticateApiRequest } from "@/lib/api-auth";
import { createApiTicketSchema } from "@/lib/api-ticket-validation";
import { createTicket } from "@/lib/services/ticket-creation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ projectCode: string }>;
};

function response(body: unknown, status: number, extraHeaders?: HeadersInit) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

function hasOwn(value: unknown, key: string): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && Object.prototype.hasOwnProperty.call(value, key);
}

async function createProjectTicket(request: Request, { params }: RouteContext) {
  const user = await authenticateApiRequest(request);
  if (!user) {
    return response(
      { error: { code: "UNAUTHORIZED", message: "A valid Bearer API key is required." } },
      401,
      { "WWW-Authenticate": "Bearer" },
    );
  }

  const contentType = request.headers.get("content-type")?.toLowerCase();
  if (!contentType?.includes("application/json")) {
    return response(
      {
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: "Content-Type must be application/json. Attachments are not supported by this endpoint.",
        },
      },
      415,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return response({ error: { code: "INVALID_JSON", message: "Request body must be valid JSON." } }, 400);
  }

  if (hasOwn(body, "attachments")) {
    return response(
      {
        error: {
          code: "ATTACHMENTS_UNSUPPORTED",
          message: "Attachments are not supported by this JSON endpoint.",
        },
      },
      415,
    );
  }

  const parsed = createApiTicketSchema.safeParse(body);
  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    return response(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "The submitted ticket data is invalid.",
          fields: flattened.fieldErrors,
          form: flattened.formErrors,
        },
      },
      400,
    );
  }

  const { projectCode } = await params;
  const normalizedProjectCode = projectCode.trim().toUpperCase();
  const [project] = await db
    .select({ id: projects.id, name: projects.name, title: projects.title })
    .from(projects)
    .where(and(eq(projects.name, normalizedProjectCode), eq(projects.active, true)))
    .limit(1);

  if (!project) {
    return response(
      { error: { code: "PROJECT_NOT_FOUND", message: "The requested active project was not found." } },
      404,
    );
  }

  if (user.role !== "admin") {
    const [membership] = await db
      .select({ projectId: userProjects.projectId })
      .from(userProjects)
      .where(and(eq(userProjects.userId, user.id), eq(userProjects.projectId, project.id)))
      .limit(1);

    if (!user.projectIds.includes(project.id) || !membership) {
      return response(
        { error: { code: "FORBIDDEN", message: "This API key cannot create tickets for this project." } },
        403,
      );
    }
  }

  try {
    const ticket = await createTicket({
      ...parsed.data,
      projectId: project.id,
      requesterId: user.id,
    });

    revalidatePath("/tickets");
    revalidatePath("/dashboard");
    revalidatePath(`/tickets/${project.name}`);

    return response(
      {
        data: {
          ticket: {
            id: ticket.id,
            ticketNumber: ticket.ticketNumber,
            status: ticket.status,
            priority: ticket.priority,
            project: {
              id: project.id,
              code: project.name,
              title: project.title,
            },
            createdAt: ticket.createdAt.toISOString(),
          },
        },
      },
      201,
      { Location: `/tickets/detail/${ticket.id}` },
    );
  } catch (error) {
    console.error("API ticket creation failed.", error);
    return response(
      { error: { code: "INTERNAL_ERROR", message: "Unable to create the ticket." } },
      500,
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    return await createProjectTicket(request, context);
  } catch (error) {
    console.error("Ticket API request failed.", error);
    return response(
      { error: { code: "INTERNAL_ERROR", message: "Unable to process the ticket request." } },
      500,
    );
  }
}
