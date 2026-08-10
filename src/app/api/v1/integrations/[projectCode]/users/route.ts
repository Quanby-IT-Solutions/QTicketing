import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { hasValidBearerAuthorization } from "@/lib/rmis-integration-auth";
import {
  IntegrationProjectUnavailableError,
  IntegrationTicketingUserDisabledError,
  provisionTicketingUser,
} from "@/lib/services/rmis-user-provisioning";
import { rmisProvisionUserSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ projectCode: string }> }) {
  const { projectCode } = await params;
  const code = projectCode.trim().toUpperCase();
  if (!env.TICKETING_PROVISIONING_TOKEN) {
    return response({ error: { code: "INTEGRATION_NOT_CONFIGURED", message: "Provisioning is not configured." } }, 503);
  }
  if (!hasValidBearerAuthorization(request.headers.get("authorization"), env.TICKETING_PROVISIONING_TOKEN)) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "A valid Bearer token is required." } }, { status: 401, headers: { "Cache-Control": "no-store", "WWW-Authenticate": "Bearer" } });
  }
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return response({ error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Content-Type must be application/json." } }, 415);
  }
  let body: unknown;
  try { body = await request.json(); } catch { return response({ error: { code: "INVALID_JSON", message: "Request body must be valid JSON." } }, 400); }
  const parsed = rmisProvisionUserSchema.safeParse(body);
  if (!parsed.success) return response({ error: { code: "VALIDATION_ERROR", message: "The submitted user data is invalid.", fields: parsed.error.flatten().fieldErrors } }, 400);
  try {
    const result = await provisionTicketingUser(code, parsed.data);
    return response({ data: result }, result.created ? 201 : 200);
  } catch (error) {
    if (error instanceof IntegrationTicketingUserDisabledError) return response({ error: { code: "USER_DISABLED", message: error.message } }, 409);
    if (error instanceof IntegrationProjectUnavailableError) return response({ error: { code: "PROJECT_UNAVAILABLE", message: error.message } }, 503);
    console.error("Integration user provisioning failed.", error);
    return response({ error: { code: "INTERNAL_ERROR", message: "Unable to provision the Ticketing account." } }, 500);
  }
}
