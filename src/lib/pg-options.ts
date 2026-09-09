/** Pool options for Neon / Supabase / local Postgres. */
export function pgPoolOptions(
  connectionString: string,
  extra: Record<string, unknown> = {},
): {
  connectionString: string;
  ssl?: { rejectUnauthorized: boolean };
} & Record<string, unknown> {
  const url = normalizeDatabaseUrl(connectionString);
  const needsSsl = /supabase\.co|neon\.tech|sslmode=require/i.test(url);
  return {
    connectionString: url,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    ...extra,
  };
}

/** Session pooler (5432) supports Better Auth; transaction (6543) does not. */
export function normalizeDatabaseUrl(url: string): string {
  let next = url.trim();
  if (next.includes("pooler.supabase.com") && next.includes(":6543/")) {
    next = next.replace(":6543/", ":5432/");
  }
  if (/supabase\.co|neon\.tech/i.test(next) && !/[?&]sslmode=/i.test(next)) {
    next += next.includes("?") ? "&sslmode=require" : "?sslmode=require";
  }
  return next;
}
