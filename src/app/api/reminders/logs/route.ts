import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reminderLogs, subscriptions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") ?? "50");
    const offset = parseInt(searchParams.get("offset") ?? "0");

    const logs = await db.query.reminderLogs.findMany({
      where: eq(reminderLogs.userId, session.user.id),
      orderBy: [desc(reminderLogs.createdAt)],
      limit,
      offset,
      with: {
        subscription: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Get total count for pagination
    const allLogs = await db.query.reminderLogs.findMany({
      where: eq(reminderLogs.userId, session.user.id),
      columns: { id: true },
    });

    return NextResponse.json({
      logs,
      total: allLogs.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Get reminder logs error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
