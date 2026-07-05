import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Used only in server contexts that need raw SQL power beyond what the
// Supabase JS client offers (e.g. complex joins in server actions).
// Respects the same Postgres role RLS would apply to via connection string,
// but for trusted server-side aggregation queries we typically call through
// the Supabase client (server.ts) so RLS is enforced per-request-user instead.
const client = postgres(process.env.DATABASE_URL!, { prepare: false });
export const db = drizzle(client, { schema });
