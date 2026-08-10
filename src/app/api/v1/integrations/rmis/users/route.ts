import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { hasValidRmisProvisioningAuthorization } from "@/lib/rmis-integration-auth";
import {
  provisionRmisTicketingUser,
  RmisProjectUnavailableError,
  RmisTicketingUserDisabledError,
} from "@/lib/services/rmis-user-provisioning";
import { rmisProvisionUserSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(body: unknown, status: number, extraHeaders?: HeadersInit) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

export async function POST(request: Request) {
  const provisioningToken = env.TICKETING_PROVISIONING_TOKEN ?? env.RMIS_PROVISIONING_TOKEN;
  if (!provisioningToken) {
    return response(
      { error: { code: "INTEGRATION_NOT_CONFIGURED", message: "RMIS provisioning is not configured." } },
      503,
    );
  }

  if (
    !hasValidRmisProvisioningAuthorization(
      request.headers.get("authorization"),
      provisioningToken,
    )
  ) {
    return response(
      { error: { code: "UNAUTHORIZED", message: "A valid Bearer token is required." } },
      401,
      { "WWW-Authenticate": "Bearer" },
    );
  }

  const contentType = request.headers.get("content-type")?.toLowerCase();
  if (!contentType?.includes("application/json")) {
    return response(
      { error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Content-Type must be application/json." } },
      415,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return response({ error: { code: "INVALID_JSON", message: "Request body must be valid JSON." } }, 400);
  }

  const parsed = rmisProvisionUserSchema.safeParse(body);
  if (!parsed.success) {
    return response(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "The submitted user data is invalid.",
          fields: parsed.error.flatten().fieldErrors,
        },
      },
      400,
    );
  }

  try {
    const result = await provisionRmisTicketingUser(parsed.data);
    return response({ data: result }, result.created ? 201 : 200);
  } catch (error) {
    if (error instanceof RmisTicketingUserDisabledError) {
      return response({ error: { code: "USER_DISABLED", message: error.message } }, 409);
    }

    if (error instanceof RmisProjectUnavailableError) {
      return response({ error: { code: "PROJECT_UNAVAILABLE", message: error.message } }, 503);
    }

    console.error("RMIS user provisioning failed.", error);
    return response(
      { error: { code: "INTERNAL_ERROR", message: "Unable to provision the Ticketing account." } },
      500,
    );
  }
}
