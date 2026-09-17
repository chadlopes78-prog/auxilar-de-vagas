/** Postgres URL from the environment. */
export function readDatabaseUrl(): string | undefined {
  if (typeof process === "undefined") return undefined;
  for (const key of [
    "DATABASE_URL",
    "POSTGRES_URL",
    "POSTGRES_PRISMA_URL",
    "POSTGRES_URL_NON_POOLING",
    "DATABASE_URL_UNPOOLED",
    "NETLIFY_DB_URL",
    "NETLIFY_DATABASE_URL",
    "NETLIFY_DATABASE_URL_UNPOOLED",
  ]) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}