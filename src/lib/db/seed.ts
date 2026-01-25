import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as dotenv from "dotenv";
import { categories } from "./schema";
import { DEFAULT_CATEGORIES } from "../constants/categories";

dotenv.config({ path: ".env.local" });

async function seed() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  console.log("Connecting to database...");
  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client);

  console.log("Seeding default categories...");

  for (const category of DEFAULT_CATEGORIES) {
    await db
      .insert(categories)
      .values({
        userId: null, // null = predefined/default category
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        color: category.color,
        isDefault: true,
        sortOrder: category.sortOrder,
      })
      .onConflictDoNothing();
  }

  console.log("Seeding complete!");

  await client.end();
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
