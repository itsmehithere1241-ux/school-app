import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error(
      "Missing env vars. Copy env.example to .env.local and set:\n" +
        "  NEXT_PUBLIC_SUPABASE_URL\n" +
        "  SUPABASE_SERVICE_ROLE_KEY (Dashboard → Project Settings → API → service_role)",
    );
    process.exit(1);
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function clearTable(
  supabase: SupabaseClient,
  table: string,
): Promise<void> {
  const { error } = await supabase.from(table).delete().gte("id", 0);

  if (error) {
    throw new Error(`Failed to clear ${table}: ${error.message}`);
  }

  console.log(`Cleared ${table}`);
}

export async function clearTables(
  supabase: SupabaseClient,
  tables: string[],
): Promise<void> {
  for (const table of tables) {
    await clearTable(supabase, table);
  }
}
