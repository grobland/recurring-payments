import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateRemindersSchema = z.object({
  emailRemindersEnabled: z.boolean().optional(),
  reminderDaysBefore: z.array(z.number().min(1).max(30)).optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: {
        emailRemindersEnabled: true,
        reminderDaysBefore: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      emailRemindersEnabled: user.emailRemindersEnabled,
      reminderDaysBefore: user.reminderDaysBefore,
    });
  } catch (error) {
    console.error("Get reminders settings error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = updateRemindersSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(users)
      .set({
        ...result.data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id))
      .returning({
        emailRemindersEnabled: users.emailRemindersEnabled,
        reminderDaysBefore: users.reminderDaysBefore,
      });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update reminders settings error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
