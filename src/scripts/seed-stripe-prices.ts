/**
 * Seed script for stripe_prices table
 * Run with: npx tsx src/scripts/seed-stripe-prices.ts
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { stripePrices } from "@/lib/db/schema";
import type { Tier } from "@/lib/db/schema";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

interface PriceConfig {
  stripePriceId: string;
  tier: Tier;
  interval: "month" | "year";
  currency: "usd" | "eur" | "gbp";
  amountCents: number;
}

const PRICE_CONFIGS: PriceConfig[] = [
  // Primary tier - $4/€4/£3 monthly, $40/€40/£30 annual
  { stripePriceId: "price_1SzyyX9mtGAqVex4XKIwlmRM", tier: "primary", interval: "month", currency: "usd", amountCents: 400 },
  { stripePriceId: "price_1Szyzs9mtGAqVex40bPI3SIw", tier: "primary", interval: "year", currency: "usd", amountCents: 4000 },
  { stripePriceId: "price_1SzyyX9mtGAqVex4F27siUUa", tier: "primary", interval: "month", currency: "eur", amountCents: 400 },
  { stripePriceId: "price_1Szz0T9mtGAqVex4BnttcUY7", tier: "primary", interval: "year", currency: "eur", amountCents: 4000 },
  { stripePriceId: "price_1Szyz89mtGAqVex47oFAoTnP", tier: "primary", interval: "month", currency: "gbp", amountCents: 300 },
  { stripePriceId: "price_1Szz019mtGAqVex4hgGbSnPe", tier: "primary", interval: "year", currency: "gbp", amountCents: 3000 },

  // Enhanced tier - $7/€7/£5.50 monthly, $70/€70/£55 annual
  { stripePriceId: "price_1Szz1u9mtGAqVex4SxtZd0U2", tier: "enhanced", interval: "month", currency: "usd", amountCents: 700 },
  { stripePriceId: "price_1Szz2I9mtGAqVex4KVW4rJ97", tier: "enhanced", interval: "year", currency: "usd", amountCents: 7000 },
  { stripePriceId: "price_1Szz359mtGAqVex4hYqMI1yk", tier: "enhanced", interval: "month", currency: "eur", amountCents: 700 },
  { stripePriceId: "price_1Szz3X9mtGAqVex42KQrNpAg", tier: "enhanced", interval: "year", currency: "eur", amountCents: 7000 },
  { stripePriceId: "price_1Szz2b9mtGAqVex4Y8bx6TDp", tier: "enhanced", interval: "month", currency: "gbp", amountCents: 550 },
  { stripePriceId: "price_1Szz2k9mtGAqVex4cYhIIQfz", tier: "enhanced", interval: "year", currency: "gbp", amountCents: 5500 },

  // Advanced tier - $11/€11/£8.50 monthly, $110/€110/£85 annual
  { stripePriceId: "price_1Szz4K9mtGAqVex4mxTJFwjU", tier: "advanced", interval: "month", currency: "usd", amountCents: 1100 },
  { stripePriceId: "price_1Szz4c9mtGAqVex4r1lAERaQ", tier: "advanced", interval: "year", currency: "usd", amountCents: 11000 },
  { stripePriceId: "price_1Szz4v9mtGAqVex4TxtekBnb", tier: "advanced", interval: "month", currency: "eur", amountCents: 1100 },
  { stripePriceId: "price_1Szz5N9mtGAqVex411bg6FkG", tier: "advanced", interval: "year", currency: "eur", amountCents: 11000 },
  { stripePriceId: "price_1Szz6H9mtGAqVex4A7cCFZOa", tier: "advanced", interval: "month", currency: "gbp", amountCents: 850 },
  { stripePriceId: "price_1Szz6R9mtGAqVex4ySuHCpG4", tier: "advanced", interval: "year", currency: "gbp", amountCents: 8500 },
];

async function seed() {
  console.log("Seeding stripe_prices table...");

  // Create connection with max retries and connection pooling disabled
  const connectionString = process.env.DATABASE_URL!;
  const sql = postgres(connectionString, {
    prepare: false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: 30
  });
  const db = drizzle(sql);

  try {
    for (const config of PRICE_CONFIGS) {
      await db
        .insert(stripePrices)
        .values({
          stripePriceId: config.stripePriceId,
          tier: config.tier,
          interval: config.interval,
          currency: config.currency,
          amountCents: config.amountCents,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: stripePrices.stripePriceId,
          set: {
            tier: config.tier,
            interval: config.interval,
            currency: config.currency,
            amountCents: config.amountCents,
            isActive: true,
          },
        });

      console.log(`  ✓ ${config.tier} ${config.currency.toUpperCase()} ${config.interval}`);
    }

    console.log(`\nSeeded ${PRICE_CONFIGS.length} prices successfully!`);
    await sql.end();
    process.exit(0);
  } catch (error) {
    await sql.end();
    throw error;
  }
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
