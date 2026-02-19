import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { statements } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { generatePdfSignedUrl } from "@/lib/storage/pdf-storage";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/statements/[id]/pdf-url
 * Generates an on-demand signed URL for a stored statement PDF.
 * Verifies statement ownership before generating the URL.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch statement with ownership check
    const statement = await db.query.statements.findFirst({
      where: and(
        eq(statements.id, id),
        eq(statements.userId, session.user.id)
      ),
      columns: {
        id: true,
        pdfStoragePath: true,
        originalFilename: true,
      },
    });

    if (!statement) {
      return NextResponse.json(
        { error: "Statement not found" },
        { status: 404 }
      );
    }

    if (!statement.pdfStoragePath) {
      return NextResponse.json(
        { error: "No PDF stored for this statement" },
        { status: 404 }
      );
    }

    // Generate two signed URLs in parallel:
    // - viewUrl: plain signed URL for in-browser PDF rendering
    // - downloadUrl: signed URL with Content-Disposition: attachment for browser save dialog
    const [viewUrl, downloadUrl] = await Promise.all([
      generatePdfSignedUrl(statement.pdfStoragePath),
      generatePdfSignedUrl(statement.pdfStoragePath, {
        download: statement.originalFilename,
      }),
    ]);

    if (!viewUrl && !downloadUrl) {
      return NextResponse.json(
        { error: "Failed to generate PDF URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: viewUrl ?? downloadUrl,
      downloadUrl: downloadUrl ?? viewUrl,
    });
  } catch (error) {
    console.error("PDF URL generation error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
