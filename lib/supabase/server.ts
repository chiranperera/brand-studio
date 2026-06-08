import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createAdminBase } from "@supabase/supabase-js";

/**
 * Server Supabase client (anon key + the user's session cookies). Use inside
 * Server Components and route handlers to read/write as the logged-in user
 * (RLS applies).
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component — middleware refreshes the session instead.
          }
        },
      },
    }
  );
}

/**
 * Service-role client — bypasses RLS. SERVER ONLY. Used by export/storage code
 * that needs privileged access (signed URLs, writing to private buckets).
 */
export function createAdminClient() {
  return createAdminBase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
