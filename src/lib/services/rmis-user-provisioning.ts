import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { projectAccessRequests, projects, userProjects, users } from "@/db/schema";
import { hashPassword } from "@/lib/password";

const RMIS_PROJECT_CODE = "RMIS";

export class RmisProjectUnavailableError extends Error {
  constructor() {
    super("The RMIS project is missing or inactive.");
    this.name = "RmisProjectUnavailableError";
  }
}

export class RmisTicketingUserDisabledError extends Error {
  constructor() {
    super("The matching Ticketing account was disabled by an administrator.");
    this.name = "RmisTicketingUserDisabledError";
  }
}

type ProvisionRmisUserInput = {
  name: string;
  email: string;
  password: string;
};

export async function provisionRmisTicketingUser(input: ProvisionRmisUserInput) {
  const email = input.email.trim().toLowerCase();

  return db.transaction(async (tx) => {
    const [project] = await tx
      .select({ id: projects.id, name: projects.name, title: projects.title })
      .from(projects)
      .where(and(eq(projects.name, RMIS_PROJECT_CODE), eq(projects.active, true)))
      .limit(1);

    if (!project) throw new RmisProjectUnavailableError();

    let [user] = await tx
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        status: users.status,
        active: users.active,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    let created = false;

    if (!user) {
      [user] = await tx
        .insert(users)
        .values({
          name: input.name,
          email,
          passwordHash: await hashPassword(input.password),
          role: "requester",
          status: "approved",
          active: true,
        })
        .onConflictDoNothing({ target: users.email })
        .returning({
          id: users.id,
          email: users.email,
          role: users.role,
          status: users.status,
          active: users.active,
        });

      created = Boolean(user);

      if (!user) {
        [user] = await tx
          .select({
            id: users.id,
            email: users.email,
            role: users.role,
            status: users.status,
            active: users.active,
          })
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
      }
    }

    if (!user) throw new Error("Unable to resolve the provisioned Ticketing user.");
    if (!user.active) throw new RmisTicketingUserDisabledError();

    if (user.status !== "approved") {
      const [approvedUser] = await tx
        .update(users)
        .set({ status: "approved", updatedAt: new Date() })
        .where(eq(users.id, user.id))
        .returning({
          id: users.id,
          email: users.email,
          role: users.role,
          status: users.status,
          active: users.active,
        });

      if (approvedUser) user = approvedUser;
    }

    await tx
      .insert(userProjects)
      .values({ userId: user.id, projectId: project.id })
      .onConflictDoNothing();

    await tx
      .update(projectAccessRequests)
      .set({ status: "approved", reviewedAt: new Date() })
      .where(
        and(
          eq(projectAccessRequests.userId, user.id),
          eq(projectAccessRequests.projectId, project.id),
          eq(projectAccessRequests.status, "pending"),
        ),
      );

    return {
      created,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      project,
    };
  });
}
