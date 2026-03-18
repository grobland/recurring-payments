import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  recurringMasters,
  recurringMasterSeriesLinks,
  recurringEvents,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { isUserActive } from "@/lib/auth/helpers";
import { mergeSchema } from "@/lib/validations/recurring";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/recurring/masters/[id]/merge
 * Merges a source recurring master into a target master.
 * Reassigns all series links from source to target, then deletes source.
 * All writes occur in a single db.transaction().
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isUserActive(session.user)) {
      return NextResponse.json(
        { error: "Your trial has expired. Please upgrade to merge recurring masters." },
        { status: 403 }
      );
    }

    const { id } = await params;

    const body = await request.json();
    const result = mergeSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { mergeIntoId } = result.data;

    // Prevent self-merge
    if (id === mergeIntoId) {
      return NextResponse.json(
        { error: "Cannot merge a master into itself" },
        { status: 400 }
      );
    }

    // Verify source master exists and belongs to user
    const [sourceMaster] = await db
      .select({ id: recurringMasters.id, name: recurringMasters.name })
      .from(recurringMasters)
      .where(and(eq(recurringMasters.id, id), eq(recurringMasters.userId, session.user.id)));

    if (!sourceMaster) {
      return NextResponse.json({ error: "Source recurring master not found" }, { status: 404 });
    }

    // Verify target master exists and belongs to user
    const [targetMaster] = await db
      .select({ id: recurringMasters.id, name: recurringMasters.name })
      .from(recurringMasters)
      .where(and(eq(recurringMasters.id, mergeIntoId), eq(recurringMasters.userId, session.user.id)));

    if (!targetMaster) {
      return NextResponse.json({ error: "Target recurring master not found" }, { status: 404 });
    }

    await db.transaction(async (tx) => {
      // Reassign all series links from source to target
      // onConflictDoNothing handles duplicates (series already linked to target)
      const sourceLinks = await tx
        .select({ id: recurringMasterSeriesLinks.id, seriesId: recurringMasterSeriesLinks.seriesId })
        .from(recurringMasterSeriesLinks)
        .where(eq(recurringMasterSeriesLinks.recurringMasterId, id));

      for (const link of sourceLinks) {
        await tx
          .insert(recurringMasterSeriesLinks)
          .values({
            recurringMasterId: mergeIntoId,
            seriesId: link.seriesId,
            isPrimary: false,
          })
          .onConflictDoNothing();
      }

      // Log event on target master
      await tx.insert(recurringEvents).values({
        userId: session.user.id,
        recurringMasterId: mergeIntoId,
        eventType: "master_merged",
        metadata: { mergedFromId: id, mergedFromName: sourceMaster.name },
      });

      // Log event on source master before deletion
      await tx.insert(recurringEvents).values({
        userId: session.user.id,
        recurringMasterId: id,
        eventType: "master_merged",
        metadata: { mergedIntoId: mergeIntoId, mergedIntoName: targetMaster.name },
      });

      // Delete source master (cascade deletes its series links)
      await tx
        .delete(recurringMasters)
        .where(and(eq(recurringMasters.id, id), eq(recurringMasters.userId, session.user.id)));
    });

    return NextResponse.json({ success: true, mergedIntoId: mergeIntoId });
  } catch (error) {
    console.error("Merge recurring masters error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
