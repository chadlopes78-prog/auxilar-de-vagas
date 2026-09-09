import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";

async function requireAdmin(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ role: string }>`select role from profiles where user_id = ${userId}`;
  if (rows[0]?.role !== "admin") {
    const admins = await sql<{ n: number }>`select count(*)::int as n from profiles where role = 'admin'`;
    if (Number(admins[0]?.n ?? 0) === 0) return sql;
    throw new Error("Apenas administradores");
  }
  return sql;
}

export const claimAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const admins = await sql<{ n: number }>`select count(*)::int as n from profiles where role = 'admin'`;
    if (Number(admins[0]?.n ?? 0) > 0) throw new Error("Já existe um administrador");
    await sql`update profiles set role = 'admin' where user_id = ${context.userId}`;
    return { ok: true };
  });

export const adminStats = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await requireAdmin(context.userId);
    const [users] = await sql<{ n: number }>`select count(*)::int as n from profiles`;
    const [cands] = await sql<{ n: number }>`select count(*)::int as n from profiles where role = 'candidate'`;
    const [cos] = await sql<{ n: number }>`select count(*)::int as n from companies`;
    const [jobs] = await sql<{ n: number }>`select count(*)::int as n from jobs where status = 'published'`;
    const [apps] = await sql<{ n: number }>`select count(*)::int as n from applications`;
    const [today] = await sql<{ n: number }>`select count(*)::int as n from jobs where published_at >= now() - interval '1 day'`;
    return {
      users: Number(users.n),
      candidates: Number(cands.n),
      companies: Number(cos.n),
      jobs: Number(jobs.n),
      applications: Number(apps.n),
      publishedToday: Number(today.n),
    };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await requireAdmin(context.userId);
    return sql<{
      user_id: string;
      full_name: string | null;
      email: string | null;
      role: string;
    }>`select user_id, full_name, email, role from profiles order by created_at desc`;
  });

export const adminSetRole = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) =>
    z.object({ userId: z.string(), role: z.string() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const sql = await requireAdmin(context.userId);
    await sql`update profiles set role = ${data.role} where user_id = ${data.userId}`;
    return { ok: true };
  });

export const adminListJobs = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await requireAdmin(context.userId);
    return sql<{
      id: number;
      title: string;
      status: string;
      featured: boolean;
      company_name: string;
    }>`
      select j.id, j.title, j.status, j.featured, co.name as company_name
      from jobs j join companies co on co.id = j.company_id
      order by j.published_at desc
    `;
  });

export const adminUpdateJob = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) =>
    z
      .object({
        id: z.number(),
        action: z.enum(["feature", "unpublish", "publish", "delete", "urgent"]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const sql = await requireAdmin(context.userId);
    if (data.action === "delete") {
      await sql`delete from jobs where id = ${data.id}`;
    } else if (data.action === "feature") {
      await sql`update jobs set featured = not featured where id = ${data.id}`;
    } else if (data.action === "urgent") {
      await sql`update jobs set urgent = not urgent where id = ${data.id}`;
    } else if (data.action === "unpublish") {
      await sql`update jobs set status = 'draft' where id = ${data.id}`;
    } else if (data.action === "publish") {
      await sql`update jobs set status = 'published' where id = ${data.id}`;
    }
    return { ok: true };
  });

export const adminListCompanies = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await requireAdmin(context.userId);
    return sql<{ id: number; name: string; approved: boolean }>`
      select id, name, approved from companies order by name
    `;
  });

export const adminApproveCompany = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => id)
  .handler(async ({ context, data: id }) => {
    const sql = await requireAdmin(context.userId);
    await sql`update companies set approved = not approved where id = ${id}`;
    return { ok: true };
  });

export const adminAddLocation = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) =>
    z
      .object({
        kind: z.enum(["country", "region", "city", "category"]),
        name: z.string().min(1),
        parentId: z.number().optional(),
        code: z.string().optional(),
        currency: z.string().optional(),
        slug: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const sql = await requireAdmin(context.userId);
    if (data.kind === "country") {
      const slug = (data.slug ?? data.name).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
      await sql`insert into countries (code, name, currency, slug) values (${(data.code ?? data.name.slice(0, 2)).toUpperCase()}, ${data.name}, ${data.currency ?? "USD"}, ${slug})`;
    } else if (data.kind === "region") {
      const slug = data.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
      await sql`insert into regions (country_id, name, slug) values (${data.parentId ?? 1}, ${data.name}, ${slug})`;
    } else if (data.kind === "city") {
      await sql`insert into cities (region_id, name) values (${data.parentId ?? 1}, ${data.name})`;
    } else {
      const slug = (data.slug ?? data.name).toLowerCase().replace(/\s+/g, "-");
      await sql`insert into categories (slug, name, icon) values (${slug}, ${data.name}, 'briefcase') on conflict (slug) do nothing`;
    }
    return { ok: true };
  });
