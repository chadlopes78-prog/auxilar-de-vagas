import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { fingerprint } from "@/lib/utils";
import { resolveApplyChannel, sourceSlugFrom } from "@/lib/server/connectors";
import { cityToSlug, countrySlug, localizeCityName, localizeRegionName, regionToSlug } from "@/lib/i18n";
import { isGarbagePlaceName } from "@/lib/server/connectors/rss";
import type {
  CompanyCard,
  JobCard,
  JobDetail,
  JobSearchInput,
  PlaceCount,
  SearchResult,
} from "@/lib/types";

const locationCache = new Map<string, { at: number; value: PlaceCount[] }>();
export function clearLocationCache() {
  locationCache.clear();
}
function cachedPlaces(key: string, ttlMs: number, fn: () => Promise<PlaceCount[]>) {
  const hit = locationCache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return Promise.resolve(hit.value);
  return fn().then((value) => {
    locationCache.set(key, { at: Date.now(), value });
    return value;
  });
}

const searchSchema = z.object({
  q: z.string().optional(),
  countryId: z.number().nullable().optional(),
  regionId: z.number().nullable().optional(),
  cityId: z.number().nullable().optional(),
  categoryId: z.number().nullable().optional(),
  employmentType: z.string().optional(),
  workModel: z.string().optional(),
  experienceLevel: z.string().optional(),
  posted: z.string().optional(),
  company: z.string().optional(),
  salaryMin: z.number().nullable().optional(),
  salaryMax: z.number().nullable().optional(),
  sort: z.string().optional(),
  strictLocation: z.boolean().optional(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
  sourceSlug: z.string().optional(),
});

type JobRow = {
  id: number;
  title: string;
  company_id: number;
  company_name: string;
  city: string | null;
  region: string | null;
  country: string | null;
  country_code: string | null;
  category: string | null;
  category_id: number | null;
  employment_type: string;
  work_model: string;
  experience_level: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  published_at: string;
  deadline: string | null;
  description: string | null;
  featured: boolean;
  urgent: boolean;
  source_name: string | null;
  original_url: string | null;
  apply_method: string | null;
  source_id: number | null;
  apply_email: string | null;
};

function toCard(r: JobRow, saved = false): JobCard {
  return {
    id: r.id,
    title: r.title,
    companyId: r.company_id,
    companyName: r.company_name,
    city: r.city,
    region: r.region,
    country: r.country,
    countryCode: r.country_code,
    category: r.category,
    categoryId: r.category_id,
    employmentType: r.employment_type,
    workModel: r.work_model,
    experienceLevel: r.experience_level,
    salaryMin: r.salary_min == null ? null : Number(r.salary_min),
    salaryMax: r.salary_max == null ? null : Number(r.salary_max),
    salaryCurrency: r.salary_currency,
    publishedAt: String(r.published_at),
    deadline: r.deadline ? String(r.deadline) : null,
    excerpt: (r.description ?? "").slice(0, 140),
    featured: Boolean(r.featured),
    urgent: Boolean(r.urgent),
    saved,
    sourceName: r.source_name || "Auxilar de Vagas",
    originalUrl: r.original_url,
    applyMethod: r.apply_method || "platform",
    sourceId: r.source_id,
    applyEmail: r.apply_email,
    applyChannel: resolveApplyChannel({
      applyMethod: r.apply_method,
      sourceName: r.source_name,
      sourceId: r.source_id,
      applyEmail: r.apply_email,
    }),
  };
}

const ACTIVE_JOB = `j.status = 'published' and (j.deadline is null or j.deadline >= current_date)`;

const JOB_SELECT = `
  select j.id, j.title, j.company_id, co.name as company_name,
    ci.name as city, r.name as region, ctry.name as country, ctry.code as country_code,
    cat.name as category, j.category_id, j.employment_type, j.work_model, j.experience_level,
    j.salary_min, j.salary_max, j.salary_currency, j.published_at, j.deadline,
    j.description, j.featured, j.urgent, j.source_name, j.original_url, j.apply_method, j.source_id, j.apply_email
  from jobs j
  join companies co on co.id = j.company_id
  left join cities ci on ci.id = j.city_id
  left join regions r on r.id = j.region_id
  left join countries ctry on ctry.id = j.country_id
  left join categories cat on cat.id = j.category_id
`;

export const searchJobs = createServerFn({ method: "POST" })
  .validator((d: JobSearchInput) => searchSchema.parse(d))
  .handler(async ({ data }): Promise<SearchResult> => {
    const { ensureAggregatorReady } = await import("@/lib/server/ingest");
    await ensureAggregatorReady();
    const sql = await getSql();
    const conds = [ACTIVE_JOB];
    const params: unknown[] = [];
    const add = (clause: string, value: unknown) => {
      params.push(value);
      conds.push(clause.replace("?", `$${params.length}`));
    };
    if (data.q?.trim()) {
      params.push(`%${data.q.trim()}%`);
      const i = params.length;
      conds.push(
        `(j.title ilike $${i} or co.name ilike $${i} or coalesce(j.description,'') ilike $${i})`,
      );
    }
    if (data.categoryId) add("j.category_id = ?", data.categoryId);
    if (data.employmentType) add("j.employment_type = ?", data.employmentType);
    if (data.workModel) add("j.work_model = ?", data.workModel);
    if (data.experienceLevel) add("j.experience_level = ?", data.experienceLevel);
    if (data.company?.trim()) add("co.name ilike ?", `%${data.company.trim()}%`);
    if (data.salaryMin != null) add("j.salary_max >= ?", data.salaryMin);
    if (data.salaryMax != null) add("j.salary_min <= ?", data.salaryMax);
    if (data.posted === "today") conds.push("j.published_at >= now() - interval '1 day'");
    if (data.posted === "3") conds.push("j.published_at >= now() - interval '3 days'");
    if (data.posted === "7") conds.push("j.published_at >= now() - interval '7 days'");
    if (data.posted === "30") conds.push("j.published_at >= now() - interval '30 days'");

    const cityId = data.cityId ?? 0;
    const regionId = data.regionId ?? 0;
    const countryId = data.countryId ?? 0;

    if (countryId) {
      params.push(countryId);
      const i = params.length;
      conds.push(
        `(j.country_id = $${i} or (j.work_model = 'remote' and (j.country_id = $${i} or j.country_id is null)))`,
      );
    }

    if (data.strictLocation) {
      if (cityId) add("j.city_id = ?", cityId);
      else if (regionId) add("j.region_id = ?", regionId);
    }

    const whereAll = conds.join(" and ");
    const whereParamsAll = [...params];

    if (data.sourceSlug?.trim()) {
      params.push(data.sourceSlug.trim());
      const i = params.length;
      conds.push(
        `(exists (select 1 from job_sources s where s.id = j.source_id and s.slug = $${i}) or lower(replace(coalesce(j.source_name,''), ' ', '-')) = $${i})`,
      );
    }

    const where = conds.join(" and ");
    const whereParams = [...params];
    params.push(cityId, regionId, countryId);
    const c1 = params.length - 2;
    const c2 = params.length - 1;
    const c3 = params.length;

    const ranked = !data.sort || data.sort === "relevant";
    let order = `case
      when j.city_id = $${c1} then 1
      when j.region_id = $${c2} then 2
      when j.country_id = $${c3} then 3
      when j.work_model = 'remote' then 4
      else 5 end,
      j.featured desc, j.published_at desc`;
    if (data.sort === "salary") order = "j.salary_max desc nulls last, j.published_at desc";
    if (data.sort === "deadline") order = "j.deadline asc nulls last";
    if (data.sort === "recent") order = "j.published_at desc";

    const pageSize = Math.min(Math.max(data.pageSize ?? 24, 1), 80);
    const page = Math.max(data.page ?? 1, 1);
    const offset = (page - 1) * pageSize;

    const countRows = await sql.query<{ n: number }>(
      `select count(*)::int as n
       from jobs j
       join companies co on co.id = j.company_id
       where ${where}`,
      whereParams,
    );
    const total = Number(countRows[0]?.n ?? 0);

    const rows = await sql.query<JobRow>(
      `${JOB_SELECT} where ${where} order by ${order} limit ${pageSize} offset ${offset}`,
      ranked ? params : whereParams,
    );

    const counts = await sql.query<{
      city_count: number;
      region_count: number;
      country_count: number;
      remote_count: number;
    }>(
      `select
        coalesce(sum(case when city_id = $1 then 1 else 0 end),0)::int as city_count,
        coalesce(sum(case when region_id = $2 then 1 else 0 end),0)::int as region_count,
        coalesce(sum(case when country_id = $3 then 1 else 0 end),0)::int as country_count,
        coalesce(sum(case when work_model = 'remote' then 1 else 0 end),0)::int as remote_count
       from jobs j where ${ACTIVE_JOB}${countryId ? " and (j.country_id = $3 or j.country_id is null)" : ""}`,
      [cityId, regionId, countryId],
    );

    const c = counts[0];
    const sourceRows = await sql.query<{ source_name: string | null; source_id: number | null; n: number }>(
      `select j.source_name, j.source_id, count(*)::int as n
       from jobs j
       join companies co on co.id = j.company_id
       where ${whereAll}
       group by j.source_name, j.source_id
       order by n desc`,
      whereParamsAll,
    );
    const sourceCounts = sourceRows.map((row) => ({
      slug: sourceSlugFrom(row.source_name, row.source_id),
      name: row.source_name || "Auxilar de Vagas",
      count: Number(row.n),
    }));
    return {
      jobs: rows.map((r) => toCard(r)),
      total,
      page,
      pageSize,
      cityCount: Number(c?.city_count ?? 0),
      regionCount: Number(c?.region_count ?? 0),
      countryCount: Number(c?.country_count ?? 0),
      remoteCount: Number(c?.remote_count ?? 0),
      sourceCounts,
    };
  });

export const countJobsByCountry = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ code: string; slug: string; name: string; count: number }[]> => {
    const { ensureAggregatorReady } = await import("@/lib/server/ingest");
    await ensureAggregatorReady();
    const sql = await getSql();
    const rows = await sql<{
      code: string;
      name: string;
      n: number;
    }>`
      select c.code, c.name,
        coalesce((select count(*) from jobs j where j.country_id = c.id and j.status = 'published' and (j.deadline is null or j.deadline >= current_date)),0)::int as n
      from countries c
      where c.code in ('MZ', 'AO', 'PT')
      order by case c.code when 'MZ' then 1 when 'AO' then 2 else 3 end
    `;
    return rows.map((r) => ({
      code: r.code,
      slug: r.code === "MZ" ? "mocambique" : r.code === "AO" ? "angola" : "portugal",
      name: r.code === "MZ" ? "Moçambique" : r.code === "AO" ? "Angola" : "Portugal",
      count: Number(r.n),
    }));
  },
);

export const listLocationsWithJobs = createServerFn({ method: "POST" })
  .validator((d: { countryId?: number | null; regionId?: number | null }) =>
    z
      .object({
        countryId: z.number().nullable().optional(),
        regionId: z.number().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<PlaceCount[]> => {
    const key = `loc:${data.countryId ?? "x"}:${data.regionId ?? "x"}`;
    return cachedPlaces(key, 45000, async () => {
    const { ensureAggregatorReady } = await import("@/lib/server/ingest");
    await ensureAggregatorReady();
    const sql = await getSql();
    if (data.regionId) {
      const rows = await sql.query<{ id: number; name: string; region_id: number; n: number }>(
        `select ci.id, ci.name, ci.region_id, count(*)::int as n
         from jobs j
         join cities ci on ci.id = j.city_id
         where ${ACTIVE_JOB} and j.region_id = $1
           and char_length(ci.name) between 2 and 48
           and ci.name not like '%<%'
           and ci.name not like '%>%'
         group by ci.id, ci.name, ci.region_id
         having count(*) > 0
         order by n desc, ci.name asc`,
        [data.regionId],
      );
      return rows
        .filter((r) => !isGarbagePlaceName(r.name))
        .map((r) => {
          const name = localizeCityName(r.name);
          return { id: r.id, name, slug: cityToSlug(name), count: Number(r.n), regionId: r.region_id };
        });
    }
    if (data.countryId) {
      const rows = await sql.query<{ id: number; name: string; country_id: number; n: number }>(
        `select r.id, r.name, r.country_id, count(*)::int as n
         from jobs j
         join regions r on r.id = j.region_id
         where ${ACTIVE_JOB} and j.country_id = $1
           and char_length(r.name) between 2 and 48
           and r.name not like '%<%'
           and r.name not like '%>%'
         group by r.id, r.name, r.country_id
         having count(*) > 0
         order by n desc, r.name asc`,
        [data.countryId],
      );
      return rows
        .filter((r) => !isGarbagePlaceName(r.name))
        .map((r) => {
          const name = localizeRegionName(r.name);
          return { id: r.id, name, slug: regionToSlug(name), count: Number(r.n), countryId: r.country_id };
        });
    }
    const rows = await sql.query<{ id: number; code: string; name: string; n: number }>(
      `select c.id, c.code, c.name, count(*)::int as n
       from jobs j
       join countries c on c.id = j.country_id
       where ${ACTIVE_JOB} and c.code in ('MZ','AO','PT')
       group by c.id, c.code, c.name
       having count(*) > 0
       order by case c.code when 'MZ' then 1 when 'AO' then 2 else 3 end`,
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.code === "MZ" ? "Moçambique" : r.code === "AO" ? "Angola" : "Portugal",
      slug: countrySlug(r.code),
      count: Number(r.n),
    }));
    });
  });

export const getJob = createServerFn({ method: "GET" })
  .validator((id: number) => id)
  .handler(async ({ data: id }): Promise<JobDetail | null> => {
    const sql = await getSql();
    const rows = await sql.query<
      JobRow & {
        responsibilities: string | null;
        requirements: string | null;
        qualifications: string | null;
        benefits: string | null;
        apply_method: string;
        external_url: string | null;
        apply_email: string | null;
        company_description: string | null;
        company_industry: string | null;
        company_website: string | null;
        company_size: string | null;
      }
    >(
      `select j.id, j.title, j.company_id, co.name as company_name,
        ci.name as city, r.name as region, ctry.name as country, ctry.code as country_code,
        cat.name as category, j.category_id, j.employment_type, j.work_model, j.experience_level,
        j.salary_min, j.salary_max, j.salary_currency, j.published_at, j.deadline,
        j.description, j.featured, j.urgent, j.responsibilities, j.requirements, j.qualifications,
        j.benefits, j.apply_method, j.external_url, j.apply_email, j.source_name, j.original_url, j.source_id,
        co.description as company_description, co.industry as company_industry,
        co.website as company_website, co.size as company_size
      from jobs j
      join companies co on co.id = j.company_id
      left join cities ci on ci.id = j.city_id
      left join regions r on r.id = j.region_id
      left join countries ctry on ctry.id = j.country_id
      left join categories cat on cat.id = j.category_id
      where j.id = $1`,
      [id],
    );
    const r = rows[0];
    if (!r) return null;
    return {
      ...toCard(r),
      description: r.description,
      responsibilities: r.responsibilities,
      requirements: r.requirements,
      qualifications: r.qualifications,
      benefits: r.benefits,
      applyEmail: r.apply_email,
      companyDescription: r.company_description,
      companyIndustry: r.company_industry,
      companyWebsite: r.company_website,
      companySize: r.company_size,
      alreadyApplied: false,
    };
  });

export const listCompanies = createServerFn({ method: "GET" }).handler(
  async (): Promise<CompanyCard[]> => {
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      name: string;
      industry: string | null;
      city: string | null;
      country: string | null;
      description: string | null;
      website: string | null;
      size: string | null;
      job_count: number;
      approved: boolean;
    }>`
      select co.id, co.name, co.industry, ci.name as city, ctry.name as country,
        co.description, co.website, co.size, co.approved,
        coalesce((select count(*) from jobs j where j.company_id = co.id and j.status = 'published'),0)::int as job_count
      from companies co
      left join cities ci on ci.id = co.city_id
      left join countries ctry on ctry.id = co.country_id
      where co.approved = true
      order by co.name
    `;
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      industry: r.industry,
      city: r.city,
      country: r.country,
      description: r.description,
      website: r.website,
      size: r.size,
      jobCount: Number(r.job_count),
      approved: r.approved,
    }));
  },
);

export const getCompany = createServerFn({ method: "GET" })
  .validator((id: number) => id)
  .handler(async ({ data: id }) => {
    const sql = await getSql();
    const companies = await listCompanies();
    const company = companies.find((c) => c.id === id) ?? null;
    if (!company) return { company: null, jobs: [] as JobCard[] };
    const rows = await sql.query<JobRow>(
      `${JOB_SELECT} where j.company_id = $1 and j.status = 'published' order by j.published_at desc`,
      [id],
    );
    return { company, jobs: rows.map((r) => toCard(r)) };
  });

const postJobSchema = z.object({
  title: z.string().min(3),
  categoryId: z.number(),
  countryId: z.number(),
  regionId: z.number(),
  cityId: z.number(),
  employmentType: z.string(),
  workModel: z.string(),
  experienceLevel: z.string(),
  salaryMin: z.number().nullable().optional(),
  salaryMax: z.number().nullable().optional(),
  salaryCurrency: z.string().optional(),
  deadline: z.string().optional(),
  description: z.string().min(10),
  responsibilities: z.string().optional(),
  requirements: z.string().optional(),
  qualifications: z.string().optional(),
  benefits: z.string().optional(),
  applyMethod: z.string().optional(),
  customQuestions: z
    .array(
      z.object({
        question: z.string().min(3),
        type: z.string(),
        required: z.boolean().optional(),
        options: z.array(z.string()).optional(),
        step: z.string().optional(),
      }),
    )
    .optional(),
});

export const publishJob = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => postJobSchema.parse(d))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const prof = await sql<{ role: string; company_id: number | null }>`
      select p.role, e.company_id
      from profiles p
      left join employer_profiles e on e.user_id = p.user_id
      where p.user_id = ${context.userId}
    `;
    const row = prof[0];
    if (!row || (row.role !== "employer" && row.role !== "admin")) {
      throw new Error("Apenas empregadores podem publicar vagas");
    }
    let companyId = row.company_id;
    if (!companyId) {
      const owned = await sql<{ id: number }>`
        select id from companies where owner_id = ${context.userId} order by id desc limit 1
      `;
      companyId = owned[0]?.id ?? null;
    }
    if (!companyId) throw new Error("Crie primeiro o perfil da empresa");
    const company = await sql<{ name: string }>`select name from companies where id = ${companyId}`;
    const city = await sql<{ name: string }>`select name from cities where id = ${data.cityId}`;
    const fp = fingerprint(data.title, company[0]?.name ?? "", city[0]?.name ?? "");
    const dup = await sql<{ id: number }>`
      select id from jobs
      where fingerprint = ${fp}
         or (
           lower(title) = lower(${data.title})
           and company_id = ${companyId}
           and country_id = ${data.countryId}
           and status = 'published'
         )
      limit 1
    `;
    if (dup[0]) return { id: dup[0].id };
    const inserted = await sql<{ id: number }>`
      insert into jobs (
        company_id, title, category_id, country_id, region_id, city_id,
        employment_type, work_model, experience_level, salary_min, salary_max,
        salary_currency, description, responsibilities, requirements, qualifications, benefits,
        apply_method, deadline, status, source_name, source_id, fingerprint, published_at,
        custom_application_questions
      ) values (
        ${companyId}, ${data.title}, ${data.categoryId}, ${data.countryId},
        ${data.regionId}, ${data.cityId}, ${data.employmentType}, ${data.workModel},
        ${data.experienceLevel}, ${data.salaryMin ?? null}, ${data.salaryMax ?? null},
        ${data.salaryCurrency ?? "MZN"}, ${data.description},
        ${data.responsibilities ?? ""}, ${data.requirements ?? ""}, ${data.qualifications ?? ""}, ${data.benefits ?? ""},
        ${data.applyMethod ?? "platform"}, ${data.deadline || null},
        'published', 'Auxilar de Vagas', 1, ${fp}, now(),
        ${data.customQuestions?.length ? JSON.stringify(data.customQuestions) : null}::jsonb
      ) returning id
    `;
    const jobId = inserted[0].id;
    try {
      const { ensureJobQuestions } = await import("@/lib/server/apply-questions");
      await ensureJobQuestions(jobId);
    } catch {
      /* questions generated on first apply */
    }
    const alerts = await sql<{ user_id: string; keyword: string | null }>`
      select user_id, keyword from job_alerts where active = true
        and (city_id is null or city_id = ${data.cityId})
    `;
    const title = data.title.toLowerCase();
    for (const a of alerts) {
      if (a.keyword && !title.includes(a.keyword.toLowerCase())) continue;
      await sql`
        insert into notifications (user_id, title, body)
        values (${a.user_id}, ${"Uma nova vaga corresponde ao seu alerta."}, ${data.title + " · " + (city[0]?.name ?? "")})
      `;
    }
    return { id: jobId };
  });

export const listMyJobs = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql.query<JobRow>(
      `${JOB_SELECT} where co.owner_id = $1 order by j.published_at desc`,
      [context.userId],
    );
    return rows.map((r) => toCard(r));
  });
