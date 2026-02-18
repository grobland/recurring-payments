/**
 * Admin bootstrap seed script
 * Promotes a user to admin role by email address.
 * Run with: npx tsx src/scripts/seed-admin.ts
 *
 * Required env var: ADMIN_EMAIL - the email address of the user to promote to admin
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    console.error("Error: ADMIN_EMAIL environment variable is not set.");
    console.error("Usage: ADMIN_EMAIL=user@example.com npx tsx src/scripts/seed-admin.ts");
    process.exit(1);
  }

  console.log(`Promoting user with email "${adminEmail}" to admin role...`);

  const connectionString = process.env.DATABASE_URL!;
  const sql = postgres(connectionString, {
    prepare: false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: 30,
  });
  const db = drizzle(sql);

  try {
    const result = await db
      .update(users)
      .set({ role: "admin" })
      .where(eq(users.email, adminEmail))
      .returning({ id: users.id, email: users.email, role: users.role });

    if (result.length === 0) {
      console.error(`Error: No user found with email "${adminEmail}".`);
      await sql.end();
      process.exit(1);
    }

    console.log(`Successfully promoted user to admin:`);
    console.log(`  ID:    ${result[0].id}`);
    console.log(`  Email: ${result[0].email}`);
    console.log(`  Role:  ${result[0].role}`);

    await sql.end();
    process.exit(0);
  } catch (error) {
    await sql.end();
    throw error;
  }
}

seedAdmin().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
