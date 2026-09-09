import { getConnectionString } from "@netlify/database";

/** Postgres URL from the environment, including Netlify Database. */
export function readDatabaseUrl(): string | undefined {
  if (typeof process === "undefined") return undefined;
  for (const key of [
    "DATABASE_URL",
    "NETLIFY_DB_URL",
    "NETLIFY_DATABASE_URL",
    "NETLIFY_DATABASE_URL_UNPOOLED",
  ]) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  if (!process.env.NETLIFY) return undefined;
  try {
    const value = getConnectionString();
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  } catch {
    return undefined;
  }
}
