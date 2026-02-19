import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  // Warn at module load time but don't throw — storage is non-fatal
  // The functions will return null if the client is not configured
  console.warn(
    "Supabase Storage not configured: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing"
  );
}

/**
 * Service-role Supabase client for server-side storage operations.
 *
 * SECURITY: Uses SUPABASE_SERVICE_ROLE_KEY — this module must NEVER be
 * imported in client components or NEXT_PUBLIC_ env vars.
 */
export const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null;
