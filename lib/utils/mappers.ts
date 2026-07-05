/**
 * The Supabase JS client returns raw Postgres rows with snake_case column
 * names (target_budget, start_date, ...), while our Drizzle schema types
 * (db/schema.ts) use camelCase to match idiomatic TypeScript. This utility
 * bridges the two so components can rely on a single, consistent shape
 * regardless of whether the data came from supabase-js or Drizzle directly.
 */
function toCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

export function camelizeRow<T>(row: Record<string, unknown> | null | undefined): T {
  if (!row) return row as T;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[toCamel(key)] = value;
  }
  return out as T;
}

export function camelizeRows<T>(rows: Record<string, unknown>[] | null | undefined): T[] {
  return (rows ?? []).map((r) => camelizeRow<T>(r));
}
