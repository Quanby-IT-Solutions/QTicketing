import "dotenv/config";

import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { apiKeys, projects, userProjects, users } from "../src/db/schema";
import { hashPassword } from "../src/lib/password";

const projectSeeds = [
  { name: "QLEGAL", title: "QLegal" },
  { name: "HRIS", title: "Human Resource Information System" },
  { name: "DMS", title: "Document Management System" },
  { name: "RMIS", title: "Record Management Information System" },
  { name: "LMS", title: "Learning Management System" },
  { name: "CRIS", title: "Customer Relationship Information System" },
];

async function seedProjects() {
  for (const project of projectSeeds) {
    await db
      .insert(projects)
      .values(project)
      .onConflictDoUpdate({
        target: projects.name,
        set: { title: project.title, active: true },
      });
  }

  console.log(`Seeded ${projectSeeds.length} projects.`);
}

async function seedAdmin() {
  const name = process.env.ADMIN_NAME ?? "System Admin";
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password || password.length < 8) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD with at least 8 characters before seeding.");
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);

  if (existing) {
    console.log(`Admin user already exists: ${email}`);
    const projectRows = await db.select({ id: projects.id }).from(projects);
    await db
      .insert(userProjects)
      .values(projectRows.map((project) => ({ userId: existing.id, projectId: project.id })))
      .onConflictDoNothing();
    return existing.id;
  }

  const [admin] = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash: await hashPassword(password),
      role: "admin",
      status: "approved",
      active: true,
    })
    .returning({ id: users.id });

  const projectRows = await db.select({ id: projects.id }).from(projects);
  await db.insert(userProjects).values(projectRows.map((project) => ({ userId: admin.id, projectId: project.id })));

  console.log(`Admin user created: ${email}`);
  return admin.id;
}

async function seedBearer(userId: string) {
  const token = process.env.SEED_API_KEY?.trim();
  if (!token) {
    console.log("No seed bearer created. Set SEED_API_KEY to create one.");
    return;
  }
  if (!/^qtk_live_[A-Za-z0-9_-]{43}$/.test(token)) {
    throw new Error("SEED_API_KEY must be a valid qtk_live_ API key.");
  }

  const tokenHash = createHash("sha256").update(token, "utf8").digest("hex");
  await db
    .insert(apiKeys)
    .values({
      userId,
      name: "Seed bearer (no expiry)",
      prefix: token.slice(0, "qtk_live_".length + 8),
      tokenHash,
      expiresAt: null,
      revokedAt: null,
    })
    .onConflictDoNothing({ target: apiKeys.tokenHash });

  console.log("Seed bearer is ready with no expiry. Use the SEED_API_KEY environment value as its Bearer token.");
}

async function main() {
  await seedProjects();
  const adminId = await seedAdmin();
  await seedBearer(adminId);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
