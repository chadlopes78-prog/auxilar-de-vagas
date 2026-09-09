import { env } from "@/lib/env.server";

/** Supabase project credentials — used as Postgres (DATABASE_URL) plus optional Auth URL. */
export function supabaseEnv() {
  const url = env("SUPABASE_URL") ?? env("VITE_SUPABASE_URL");
  const anonKey = env("SUPABASE_ANON_KEY") ?? env("VITE_SUPABASE_ANON_KEY");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  return { url, anonKey, serviceKey, configured: Boolean(url && (anonKey || serviceKey)) };
}

export function supabaseConfigured() {
  return supabaseEnv().configured || Boolean(env("DATABASE_URL")?.includes("supabase.co"));
}
