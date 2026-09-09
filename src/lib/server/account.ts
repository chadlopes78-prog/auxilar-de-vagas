import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { recalcCompleteness } from "@/lib/server/candidate";
import { executeSubmit } from "@/lib/server/apply";
import { sendWelcomeEmail } from "@/lib/server/mail";
import type {
  ApplicationRow,
  JobAlertRow,
  NotificationRow,
  Profile,
} from "@/lib/types";

function stringifyAns(value: unknown): string {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) return value.map((v) => String(v)).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function parseStoredAnswers(raw: unknown): { key: string; question: string; answer: string }[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    return raw.map((item) => {
      const r = item as Record<string, unknown>;
      return {
        key: String(r.key ?? ""),
        question: String(r.question ?? r.key ?? ""),
        answer: stringifyAns(r.answer),
      };
    });
  }
  if (typeof raw === "object") {
    return Object.entries(raw as Record<string, unknown>).map(([key, value]) => ({
      key,
      question: key,
      answer: stringifyAns(value),
    }));
  }
  return null;
}

async function loadProfile(userId: string): Promise<Profile | null> {
  const sql = await getSql();
  const rows = await sql<{
    user_id: string;
    role: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    country_id: number | null;
    region_id: number | null;
    city_id: number | null;
    country_name: string | null;
    region_name: string | null;
    city_name: string | null;
    onboarded: boolean;
    title: string | null;
    about: string | null;
    experience_level: string | null;
    open_to_remote: boolean | null;
    linkedin: string | null;
    portfolio: string | null;
    cv_name: string | null;
    completeness: number | null;
    company_id: number | null;
    default_cover_letter: string | null;
    salary_expectation: string | null;
    availability: string | null;
    desired_role: string | null;
  }>`
    select p.user_id, p.role, p.full_name, p.email, p.phone, p.avatar_url,
      p.country_id, p.region_id, p.city_id, p.onboarded,
      ctry.name as country_name, r.name as region_name, ci.name as city_name,
      cp.title, cp.about, cp.experience_level, cp.open_to_remote, cp.linkedin,
      cp.portfolio, cp.cv_name, cp.completeness, ep.company_id,
      cp.default_cover_letter, cp.salary_expectation, cp.availability, cp.desired_role
    from profiles p
    left join countries ctry on ctry.id = p.country_id
    left join regions r on r.id = p.region_id
    left join cities ci on ci.id = p.city_id
    left join candidate_profiles cp on cp.user_id = p.user_id
    left join employer_profiles ep on ep.user_id = p.user_id
    where p.user_id = ${userId}
  `;
  const p = rows[0];
  if (!p) return null;
  const interests = await sql<{ category_id: number }>`
    select category_id from candidate_interests where user_id = ${userId}
  `;
  return {
    userId: p.user_id,
    role: (p.role as Profile["role"]) || "candidate",
    fullName: p.full_name,
    email: p.email,
    phone: p.phone,
    avatarUrl: p.avatar_url,
    countryId: p.country_id,
    regionId: p.region_id,
    cityId: p.city_id,
    countryName: p.country_name,
    regionName: p.region_name,
    cityName: p.city_name,
    onboarded: Boolean(p.onboarded),
    title: p.title,
    about: p.about,
    experienceLevel: p.experience_level,
    openToRemote: p.open_to_remote ?? true,
    linkedin: p.linkedin,
    portfolio: p.portfolio,
    cvName: p.cv_name,
    completeness: Number(p.completeness ?? 20),
    companyId: p.company_id,
    interests: interests.map((i) => i.category_id),
    defaultCoverLetter: p.default_cover_letter,
    salaryExpectation: p.salary_expectation,
    availability: p.availability,
    desiredRole: p.desired_role,
  };
}

export const ensureProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { email?: string | null; name?: string | null } | undefined) => d ?? {})
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const inserted = await sql<{ user_id: string; email: string | null; full_name: string | null }>`
      insert into profiles (user_id, email, full_name, role, country_id, region_id, city_id, onboarded)
      values (${context.userId}, ${data.email ?? null}, ${data.name ?? null}, 'candidate', 1, 1, 1, true)
      on conflict (user_id) do nothing
      returning user_id, email, full_name
    `;
    await sql`
      insert into candidate_profiles (user_id) values (${context.userId})
      on conflict (user_id) do nothing
    `;
    let welcomeEmailSent = false;
    try {
      const pending = await sql<{ email: string | null; full_name: string | null }>`
        select email, full_name from profiles
        where user_id = ${context.userId} and welcome_email_sent_at is null
        limit 1
      `;
      const target = pending[0];
      const to = (data.email ?? target?.email ?? "").trim();
      if (to) {
        const mail = await sendWelcomeEmail({ to, name: data.name ?? target?.full_name });
        if (mail.ok) {
          welcomeEmailSent = true;
          await sql`
            update profiles set welcome_email_sent_at = now()
            where user_id = ${context.userId} and welcome_email_sent_at is null
          `;
        }
      }
    } catch {
      /* column may not exist until migrate; never block sign-up */
    }
    const profile = await loadProfile(context.userId);
    return { profile, welcomeEmailSent, created: inserted.length > 0 };
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => loadProfile(context.userId));

const profileSchema = z.object({
  role: z.enum(["candidate", "employer", "admin"]).optional(),
  fullName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  countryId: z.number().nullable().optional(),
  regionId: z.number().nullable().optional(),
  cityId: z.number().nullable().optional(),
  title: z.string().optional(),
  about: z.string().optional(),
  experienceLevel: z.string().optional(),
  openToRemote: z.boolean().optional(),
  linkedin: z.string().optional(),
  portfolio: z.string().optional(),
  cvName: z.string().optional(),
  onboarded: z.boolean().optional(),
  interests: z.array(z.number()).optional(),
  companyName: z.string().optional(),
  companyIndustry: z.string().optional(),
  companyDescription: z.string().optional(),
  companyWebsite: z.string().optional(),
  companySize: z.string().optional(),
  defaultCoverLetter: z.string().optional(),
  salaryExpectation: z.string().optional(),
  availability: z.string().optional(),
  desiredRole: z.string().optional(),
  avatarUrl: z.string().optional(),
});

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => profileSchema.parse(d))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const existing = await loadProfile(context.userId);
    if (!existing) throw new Error("Perfil em falta");
    const role = data.role && existing.role !== "admin" ? data.role : existing.role;
    await sql`
      update profiles set
        full_name = coalesce(${data.fullName ?? null}, full_name),
        phone = coalesce(${data.phone ?? null}, phone),
        email = coalesce(${data.email ?? null}, email),
        country_id = coalesce(${data.countryId ?? null}, country_id),
        region_id = coalesce(${data.regionId ?? null}, region_id),
        city_id = coalesce(${data.cityId ?? null}, city_id),
        role = ${role},
        onboarded = coalesce(${data.onboarded ?? null}, onboarded),
        avatar_url = coalesce(${data.avatarUrl ?? null}, avatar_url)
      where user_id = ${context.userId}
    `;
    await sql`
      insert into candidate_profiles (user_id) values (${context.userId})
      on conflict (user_id) do nothing
    `;
    await sql`
      update candidate_profiles set
        title = coalesce(${data.title ?? null}, title),
        about = coalesce(${data.about ?? null}, about),
        experience_level = coalesce(${data.experienceLevel ?? null}, experience_level),
        open_to_remote = coalesce(${data.openToRemote ?? null}, open_to_remote),
        linkedin = coalesce(${data.linkedin ?? null}, linkedin),
        portfolio = coalesce(${data.portfolio ?? null}, portfolio),
        cv_name = coalesce(${data.cvName ?? null}, cv_name),
        default_cover_letter = coalesce(${data.defaultCoverLetter ?? null}, default_cover_letter),
        salary_expectation = coalesce(${data.salaryExpectation ?? null}, salary_expectation),
        availability = coalesce(${data.availability ?? null}, availability),
        desired_role = coalesce(${data.desiredRole ?? null}, desired_role)
      where user_id = ${context.userId}
    `;
    if (data.interests) {
      await sql`delete from candidate_interests where user_id = ${context.userId}`;
      for (const id of data.interests) {
        await sql`insert into candidate_interests (user_id, category_id) values (${context.userId}, ${id}) on conflict do nothing`;
      }
    }
    if (role === "employer" && data.companyName) {
      const owned = await sql<{ id: number }>`
        select id from companies where owner_id = ${context.userId} limit 1
      `;
      let companyId = owned[0]?.id;
      if (!companyId) {
        const created = await sql<{ id: number }>`
          insert into companies (owner_id, name, industry, description, website, size, country_id, region_id, city_id, approved)
          values (${context.userId}, ${data.companyName}, ${data.companyIndustry ?? ""}, ${data.companyDescription ?? ""},
            ${data.companyWebsite ?? ""}, ${data.companySize ?? "1-10"},
            ${data.countryId ?? existing.countryId}, ${data.regionId ?? existing.regionId}, ${data.cityId ?? existing.cityId}, true)
          returning id
        `;
        companyId = created[0].id;
      } else {
        await sql`
          update companies set
            name = ${data.companyName},
            industry = coalesce(${data.companyIndustry ?? null}, industry),
            description = coalesce(${data.companyDescription ?? null}, description),
            website = coalesce(${data.companyWebsite ?? null}, website),
            size = coalesce(${data.companySize ?? null}, size)
          where id = ${companyId} and owner_id = ${context.userId}
        `;
      }
      await sql`
        insert into employer_profiles (user_id, company_id) values (${context.userId}, ${companyId})
        on conflict (user_id) do update set company_id = excluded.company_id
      `;
    }
    await recalcCompleteness(context.userId);
    return loadProfile(context.userId);
  });

export const toggleSaveJob = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((jobId: number) => jobId)
  .handler(async ({ context, data: jobId }) => {
    const sql = await getSql();
    const existing = await sql<{ job_id: number }>`
      select job_id from saved_jobs where user_id = ${context.userId} and job_id = ${jobId}
    `;
    if (existing[0]) {
      await sql`delete from saved_jobs where user_id = ${context.userId} and job_id = ${jobId}`;
      return { saved: false };
    }
    await sql`insert into saved_jobs (user_id, job_id) values (${context.userId}, ${jobId})`;
    return { saved: true };
  });

export const listSavedJobs = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return sql<{ id: number }>`
      select job_id as id from saved_jobs where user_id = ${context.userId}
    `;
  });

export const applyToJob = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) =>
    z
      .object({
        jobId: z.number(),
        coverLetter: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        cvName: z.string().optional(),
        confirmCorrect: z.boolean().optional(),
        consentAccepted: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const result = await executeSubmit(context.userId, data);
    return {
      id: result.applicationId ?? 0,
      already: result.outcome === "already",
      ...result,
    };
  });

export const listMyApplications = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ApplicationRow[]> => {
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      job_id: number;
      title: string;
      company_name: string;
      status: string;
      created_at: string;
      method: string | null;
      source_name: string | null;
      country_name: string | null;
      official_url: string | null;
      status_note: string | null;
      external_status: string | null;
      submitted_at: string | null;
      answers: unknown;
      company_email: string | null;
    }>`
      select a.id, a.job_id, j.title, co.name as company_name, a.status, a.created_at,
        a.method, a.source_name, a.country_name, a.official_url, a.status_note,
        a.external_status, a.submitted_at,
        coalesce(a.company_email, j.apply_email) as company_email,
        (select json_agg(json_build_object('key', q.question_key, 'question', q.question_text, 'answer', q.answer) order by q.id)
         from application_answers q where q.application_id = a.id) as answers
      from applications a
      join jobs j on j.id = a.job_id
      join companies co on co.id = j.company_id
      where a.candidate_id = ${context.userId}
      order by a.created_at desc
    `;
    return rows.map((r) => ({
      id: r.id,
      jobId: r.job_id,
      jobTitle: r.title,
      companyName: r.company_name,
      status: r.status,
      createdAt: String(r.created_at),
      candidateName: null,
      candidateEmail: null,
      coverLetter: null,
      phone: null,
      method: r.method,
      sourceName: r.source_name,
      countryName: r.country_name,
      officialUrl: r.official_url,
      statusNote: r.status_note,
      externalStatus: r.external_status,
      submittedAt: r.submitted_at ? String(r.submitted_at) : null,
      answers: parseStoredAnswers(r.answers),
      companyEmail: r.company_email,
    }));
  });

export const listEmployerApplications = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ApplicationRow[]> => {
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      job_id: number;
      title: string;
      company_name: string;
      status: string;
      created_at: string;
      full_name: string | null;
      email: string | null;
      cover_letter: string | null;
      phone: string | null;
      answers: unknown;
    }>`
      select a.id, a.job_id, j.title, co.name as company_name, a.status, a.created_at,
        p.full_name, a.email, a.cover_letter, a.phone,
        (select json_agg(json_build_object('key', q.question_key, 'question', q.question_text, 'answer', q.answer) order by q.id)
         from application_answers q where q.application_id = a.id) as answers
      from applications a
      join jobs j on j.id = a.job_id
      join companies co on co.id = j.company_id
      join profiles p on p.user_id = a.candidate_id
      where co.owner_id = ${context.userId}
      order by a.created_at desc
    `;
    return rows.map((r) => ({
      id: r.id,
      jobId: r.job_id,
      jobTitle: r.title,
      companyName: r.company_name,
      status: r.status,
      createdAt: String(r.created_at),
      candidateName: r.full_name,
      candidateEmail: r.email,
      coverLetter: r.cover_letter,
      phone: r.phone,
      answers: parseStoredAnswers(r.answers),
    }));
  });

export const setApplicationStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) =>
    z.object({ id: z.number(), status: z.string() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const owned = await sql<{ candidate_id: string; title: string }>`
      select a.candidate_id, j.title
      from applications a
      join jobs j on j.id = a.job_id
      join companies co on co.id = j.company_id
      where a.id = ${data.id} and co.owner_id = ${context.userId}
    `;
    if (!owned[0]) throw new Error("Não encontrado");
    await sql`update applications set status = ${data.status} where id = ${data.id}`;
    await sql`
      insert into notifications (user_id, title, body)
      values (${owned[0].candidate_id}, ${"O estado da sua candidatura foi atualizado"}, ${owned[0].title + " · " + data.status})
    `;
    return { ok: true };
  });

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<NotificationRow[]> => {
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      title: string;
      body: string | null;
      read: boolean;
      created_at: string;
    }>`
      select id, title, body, read, created_at from notifications
      where user_id = ${context.userId} order by created_at desc limit 40
    `;
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      read: Boolean(r.read),
      createdAt: String(r.created_at),
    }));
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await sql`update notifications set read = true where user_id = ${context.userId}`;
    return { ok: true };
  });

export const createAlert = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) =>
    z
      .object({
        keyword: z.string().optional(),
        cityId: z.number().nullable().optional(),
        regionId: z.number().nullable().optional(),
        countryId: z.number().nullable().optional(),
        frequency: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      insert into job_alerts (user_id, keyword, city_id, region_id, country_id, frequency)
      values (
        ${context.userId},
        ${data.keyword ?? ""},
        ${data.cityId ?? null},
        ${data.regionId ?? null},
        ${data.countryId ?? null},
        ${data.frequency ?? "weekly"}
      )
    `;
    return { ok: true };
  });

export const listAlerts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<JobAlertRow[]> => {
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      keyword: string | null;
      city_id: number | null;
      city_name: string | null;
      region_id: number | null;
      region_name: string | null;
      country_id: number | null;
      country_name: string | null;
      frequency: string;
    }>`
      select a.id, a.keyword, a.city_id, c.name as city_name, a.frequency,
        a.region_id, r.name as region_name, a.country_id, co.name as country_name
      from job_alerts a
      left join cities c on c.id = a.city_id
      left join regions r on r.id = a.region_id
      left join countries co on co.id = a.country_id
      where a.user_id = ${context.userId}
      order by a.id desc
    `;
    return rows.map((r) => ({
      id: r.id,
      keyword: r.keyword,
      cityId: r.city_id,
      cityName: r.city_name,
      regionId: r.region_id,
      regionName: r.region_name,
      countryId: r.country_id,
      countryName: r.country_name,
      frequency: r.frequency,
    }));
  });

export const recommendedJobs = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const p = await loadProfile(context.userId);
    const rows = await sql<{ id: number }>`
      select j.id from jobs j
      where j.status = 'published'
      order by
        case when j.city_id = ${p?.cityId ?? 0} then 0 else 1 end,
        j.published_at desc
      limit 6
    `;
    return rows.map((r) => r.id);
  });
