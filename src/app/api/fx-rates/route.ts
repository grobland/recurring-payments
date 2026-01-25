import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getExchangeRates, convertCurrency } from "@/lib/fx/rates";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rates = await getExchangeRates();

    return NextResponse.json({
      base: "USD",
      rates,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get FX rates error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
