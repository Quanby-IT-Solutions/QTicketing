import { and, eq, inArray, max, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { tickets, userProjects } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });

  const projectIds = user.role === "admin"
    ? null
    : (await db.select({ projectId: userProjects.projectId }).from(userProjects).where(eq(userProjects.userId, user.id))).map((row) => row.projectId);
  const visibleTickets = projectIds === null
    ? undefined
    : projectIds.length > 0
      ? inArray(tickets.projectId, projectIds)
      : eq(tickets.id, "00000000-0000-0000-0000-000000000000");
  const [summary] = await db
    .select({ count: sql<number>`count(*)`, latestUpdatedAt: max(tickets.updatedAt) })
    .from(tickets)
    .where(visibleTickets ? and(visibleTickets) : undefined);
  const version = `${summary?.count ?? 0}:${summary?.latestUpdatedAt?.toISOString() ?? ""}`;
  return NextResponse.json({ data: { version } }, { headers: { "Cache-Control": "no-store" } });
}
