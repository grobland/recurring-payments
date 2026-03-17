import { supabaseAdmin } from "@/lib/supabase/server";

const BUCKET = "statements";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Upload a PDF statement to Supabase Storage.
 *
 * Path format: {userId}/{sourceSlug}/{hashPrefix}-{originalFilename}.pdf
 * Uses the file's SHA-256 hash prefix for uniqueness so each distinct file
 * gets its own storage path.
 *
 * @param file - The PDF file to upload
 * @param userId - Owning user's UUID
 * @param sourceType - Source name (e.g. "Lloyds Bank") — used as folder slug
 * @param pdfHash - SHA-256 hex hash of the file (first 12 chars used in path)
 * @returns { path } on success, null on failure (non-fatal)
 */
export async function uploadStatementPdf(
  file: File,
  userId: string,
  sourceType: string,
  pdfHash?: string,
): Promise<{ path: string } | null> {
  if (!supabaseAdmin) {
    console.error("PDF storage upload failed: Supabase admin client not configured");
    return null;
  }

  // Guard: file size
  if (file.size > MAX_FILE_SIZE) {
    console.error(
      `PDF storage upload failed: file size ${file.size} exceeds 10MB limit`
    );
    return null;
  }

  // Guard: MIME type
  if (file.type !== "application/pdf") {
    console.error(
      `PDF storage upload failed: expected application/pdf, got ${file.type}`
    );
    return null;
  }

  try {
    const sourceSlug = sourceType
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    // Build a unique filename from the hash prefix + sanitised original name.
    // If no hash provided, fall back to a timestamp for uniqueness.
    const hashPrefix = pdfHash ? pdfHash.slice(0, 12) : Date.now().toString(36);
    const safeName = file.name
      .replace(/\.pdf$/i, "")
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 60);

    const path = `${userId}/${sourceSlug}/${hashPrefix}-${safeName}.pdf`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: "application/pdf",
        upsert: true,
        cacheControl: "3600",
      });

    if (error) {
      console.error("PDF storage upload failed:", error);
      return null;
    }

    return { path };
  } catch (error) {
    console.error("PDF storage upload failed:", error);
    return null;
  }
}

/**
 * Generate a signed URL for a stored PDF (1-hour expiry).
 *
 * @param pdfStoragePath - Storage path of the PDF file
 * @param options.download - When provided, adds Content-Disposition: attachment header to the URL.
 *   Pass the desired filename (e.g. "statement-2024-01.pdf") to trigger browser save dialog.
 *   When omitted, URL is suitable for in-browser viewing.
 * @returns signed URL string on success, null on failure
 */
export async function generatePdfSignedUrl(
  pdfStoragePath: string,
  options?: { download?: string }
): Promise<string | null> {
  if (!supabaseAdmin) {
    console.error("PDF signed URL generation failed: Supabase admin client not configured");
    return null;
  }

  try {
    const { data, error } = options?.download
      ? await supabaseAdmin.storage
          .from(BUCKET)
          .createSignedUrl(pdfStoragePath, 3600, { download: options.download }) // Sets Content-Disposition: attachment
      : await supabaseAdmin.storage
          .from(BUCKET)
          .createSignedUrl(pdfStoragePath, 3600); // Plain viewing URL

    if (error || !data?.signedUrl) {
      console.error("PDF signed URL generation failed:", error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error("PDF signed URL generation failed:", error);
    return null;
  }
}
