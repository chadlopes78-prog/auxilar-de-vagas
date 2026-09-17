const NAMED_KEYS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL_UNPOOLED",
  "NEON_DATABASE_URL",
  "NEON_POSTGRES_URL",
  "NETLIFY_DB_URL",
  "NETLIFY_DATABASE_URL",
  "NETLIFY_DATABASE_URL_UNPOOLED",
];

function looksLikePostgres(value: string | undefined): value is string {
  const v = value?.trim();
  return Boolean(v && /^(postgres|postgresql):\/\//i.test(v));
}

/** Names of env keys that look like a database URL (never the values). */
export function listDatabaseUrlKeys(): string[] {
  if (typeof process === "undefined") return [];
  const keys = new Set<string>();
  for (const key of NAMED_KEYS) {
    if (process.env[key]?.trim()) keys.add(key);
  }
  for (const [key, value] of Object.entries(process.env)) {
    if (/postgres|database|neon/i.test(key) && looksLikePostgres(value)) keys.add(key);
  }
  return [...keys].sort();
}

/** Postgres URL from the environment. */
export function readDatabaseUrl(): string | undefined {
  if (typeof process === "undefined") return undefined;
  for (const key of NAMED_KEYS) {
    const value = process.env[key]?.trim();
    if (looksLikePostgres(value)) return value.trim();
  }
  for (const value of Object.values(process.env)) {
    if (looksLikePostgres(value)) return value.trim();
  }
  return undefined;
}
