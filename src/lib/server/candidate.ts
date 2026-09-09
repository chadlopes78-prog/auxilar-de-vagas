import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import type { CandidateBundle } from "@/lib/types";

export async function loadCandidateBundle(userId: string): Promise<CandidateBundle> {
  const sql = await getSql();
  const experiences = await sql<{
    id: number;
    title: string | null;
    company: string | null;
    period: string | null;
    description: string | null;
  }>`select id, title, company, period, description from experiences where user_id = ${userId} order by id desc`;
  const education = await sql<{
    id: number;
    school: string | null;
    degree: string | null;
    period: string | null;
  }>`select id, school, degree, period from education where user_id = ${userId} order by id desc`;
  const skillRows = await sql<{ name: string }>`
    select s.name from candidate_skills cs join skills s on s.id = cs.skill_id
    where cs.user_id = ${userId} order by s.name
  `;
  const languages = await sql<{ id: number; name: string; level: string | null }>`
    select id, name, level from languages where user_id = ${userId} order by id
  `;
  const certifications = await sql<{
    id: number;
    name: string;
    issuer: string | null;
    year: string | null;
  }>`select id, name, issuer, year from certifications where user_id = ${userId} order by id desc`;
  const documents = await sql<{
    id: number;
    kind: string;
    file_name: string;
    is_primary: boolean;
    created_at: string;
  }>`select id, kind, file_name, is_primary, created_at from candidate_documents where user_id = ${userId} order by is_primary desc, id desc`;
  return {
    experiences: experiences.map((r) => ({
      id: r.id,
      title: r.title,
      company: r.company,
      period: r.period,
      description: r.description,
    })),
    education: education.map((r) => ({
      id: r.id,
      school: r.school,
      degree: r.degree,
      period: r.period,
    })),
    skills: skillRows.map((r) => r.name),
    languages: languages.map((r) => ({ id: r.id, name: r.name, level: r.level })),
    certifications: certifications.map((r) => ({
      id: r.id,
      name: r.name,
      issuer: r.issuer,
      year: r.year,
    })),
    documents: documents.map((r) => ({
      id: r.id,
      kind: r.kind,
      fileName: r.file_name,
      isPrimary: Boolean(r.is_primary),
      createdAt: String(r.created_at),
    })),
  };
}

export function completenessScore(input: {
  fullName?: string | null;
  phone?: string | null;
  email?: string | null;
  countryId?: number | null;
  cityId?: number | null;
  title?: string | null;
  about?: string | null;
  linkedin?: string | null;
  portfolio?: string | null;
  cvName?: string | null;
  coverLetter?: string | null;
  salary?: string | null;
  availability?: string | null;
  avatarUrl?: string | null;
  experiences: number;
  education: number;
  skills: number;
  languages: number;
  certifications: number;
}) {
  const flags = [
    Boolean(input.fullName?.trim()),
    Boolean(input.phone?.trim()),
    Boolean(input.email?.trim()),
    Boolean(input.countryId),
    Boolean(input.cityId),
    Boolean(input.title?.trim()),
    Boolean(input.about?.trim()),
    Boolean(input.linkedin?.trim()),
    Boolean(input.portfolio?.trim()),
    Boolean(input.cvName?.trim()),
    Boolean(input.coverLetter?.trim()),
    Boolean(input.salary?.trim()),
    Boolean(input.availability?.trim()),
    Boolean(input.avatarUrl?.trim()),
    input.experiences > 0,
    input.education > 0,
    input.skills > 0,
    input.languages > 0,
    input.certifications > 0,
  ];
  const n = flags.filter(Boolean).length;
  return Math.round((n / flags.length) * 100);
}

export async function recalcCompleteness(userId: string) {
  const sql = await getSql();
  const bundle = await loadCandidateBundle(userId);
  const p = await sql<{
    full_name: string | null;
    phone: string | null;
    email: string | null;
    country_id: number | null;
    city_id: number | null;
    avatar_url: string | null;
    title: string | null;
    about: string | null;
    linkedin: string | null;
    portfolio: string | null;
    cv_name: string | null;
    default_cover_letter: string | null;
    salary_expectation: string | null;
    availability: string | null;
  }>`
    select p.full_name, p.phone, p.email, p.country_id, p.city_id, p.avatar_url,
      cp.title, cp.about, cp.linkedin, cp.portfolio, cp.cv_name,
      cp.default_cover_letter, cp.salary_expectation, cp.availability
    from profiles p
    left join candidate_profiles cp on cp.user_id = p.user_id
    where p.user_id = ${userId}
  `;
  const row = p[0];
  const score = completenessScore({
    fullName: row?.full_name,
    phone: row?.phone,
    email: row?.email,
    countryId: row?.country_id,
    cityId: row?.city_id,
    title: row?.title,
    about: row?.about,
    linkedin: row?.linkedin,
    portfolio: row?.portfolio,
    cvName: row?.cv_name || bundle.documents[0]?.fileName,
    coverLetter: row?.default_cover_letter,
    salary: row?.salary_expectation,
    availability: row?.availability,
    avatarUrl: row?.avatar_url,
    experiences: bundle.experiences.length,
    education: bundle.education.length,
    skills: bundle.skills.length,
    languages: bundle.languages.length,
    certifications: bundle.certifications.length,
  });
  await sql`update candidate_profiles set completeness = ${score} where user_id = ${userId}`;
  return score;
}

export const getCandidateBundle = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => loadCandidateBundle(context.userId));

export const addExperience = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) =>
    z
      .object({
        title: z.string().min(1),
        company: z.string().min(1),
        period: z.string().optional(),
        description: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      insert into experiences (user_id, title, company, period, description)
      values (${context.userId}, ${data.title}, ${data.company}, ${data.period ?? ""}, ${data.description ?? ""})
    `;
    await recalcCompleteness(context.userId);
    return loadCandidateBundle(context.userId);
  });

export const removeExperience = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => id)
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await sql`delete from experiences where id = ${id} and user_id = ${context.userId}`;
    await recalcCompleteness(context.userId);
    return loadCandidateBundle(context.userId);
  });

export const addEducation = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) =>
    z
      .object({
        school: z.string().min(1),
        degree: z.string().optional(),
        period: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      insert into education (user_id, school, degree, period)
      values (${context.userId}, ${data.school}, ${data.degree ?? ""}, ${data.period ?? ""})
    `;
    await recalcCompleteness(context.userId);
    return loadCandidateBundle(context.userId);
  });

export const removeEducation = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => id)
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await sql`delete from education where id = ${id} and user_id = ${context.userId}`;
    await recalcCompleteness(context.userId);
    return loadCandidateBundle(context.userId);
  });

export const setSkills = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((names: string[]) => names.map((n) => n.trim()).filter(Boolean))
  .handler(async ({ context, data: names }) => {
    const sql = await getSql();
    await sql`delete from candidate_skills where user_id = ${context.userId}`;
    for (const name of names) {
      const existing = await sql<{ id: number }>`select id from skills where lower(name) = lower(${name}) limit 1`;
      let id = existing[0]?.id;
      if (!id) {
        const created = await sql<{ id: number }>`insert into skills (name) values (${name}) returning id`;
        id = created[0].id;
      }
      await sql`insert into candidate_skills (user_id, skill_id) values (${context.userId}, ${id}) on conflict do nothing`;
    }
    await recalcCompleteness(context.userId);
    return loadCandidateBundle(context.userId);
  });

export const addLanguage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ name: z.string().min(1), level: z.string().optional() }).parse(d))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`insert into languages (user_id, name, level) values (${context.userId}, ${data.name}, ${data.level ?? ""})`;
    await recalcCompleteness(context.userId);
    return loadCandidateBundle(context.userId);
  });

export const removeLanguage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => id)
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await sql`delete from languages where id = ${id} and user_id = ${context.userId}`;
    await recalcCompleteness(context.userId);
    return loadCandidateBundle(context.userId);
  });

export const addCertification = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) =>
    z.object({ name: z.string().min(1), issuer: z.string().optional(), year: z.string().optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      insert into certifications (user_id, name, issuer, year)
      values (${context.userId}, ${data.name}, ${data.issuer ?? ""}, ${data.year ?? ""})
    `;
    await recalcCompleteness(context.userId);
    return loadCandidateBundle(context.userId);
  });

export const removeCertification = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => id)
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await sql`delete from certifications where id = ${id} and user_id = ${context.userId}`;
    await recalcCompleteness(context.userId);
    return loadCandidateBundle(context.userId);
  });

export const addDocument = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) =>
    z.object({ fileName: z.string().min(1), kind: z.string().optional(), isPrimary: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const primary = data.isPrimary !== false;
    if (primary) {
      await sql`update candidate_documents set is_primary = false where user_id = ${context.userId}`;
    }
    await sql`
      insert into candidate_documents (user_id, kind, file_name, is_primary)
      values (${context.userId}, ${data.kind ?? "cv"}, ${data.fileName}, ${primary})
    `;
    if (primary) {
      await sql`update candidate_profiles set cv_name = ${data.fileName} where user_id = ${context.userId}`;
    }
    await recalcCompleteness(context.userId);
    return loadCandidateBundle(context.userId);
  });

export const setPrimaryDocument = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => id)
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const doc = await sql<{ file_name: string }>`
      select file_name from candidate_documents where id = ${id} and user_id = ${context.userId}
    `;
    if (!doc[0]) throw new Error("Documento não encontrado");
    await sql`update candidate_documents set is_primary = false where user_id = ${context.userId}`;
    await sql`update candidate_documents set is_primary = true where id = ${id} and user_id = ${context.userId}`;
    await sql`update candidate_profiles set cv_name = ${doc[0].file_name} where user_id = ${context.userId}`;
    return loadCandidateBundle(context.userId);
  });

export const removeDocument = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => id)
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await sql`delete from candidate_documents where id = ${id} and user_id = ${context.userId}`;
    const next = await sql<{ file_name: string }>`
      select file_name from candidate_documents where user_id = ${context.userId} order by is_primary desc, id desc limit 1
    `;
    await sql`update candidate_profiles set cv_name = ${next[0]?.file_name ?? null} where user_id = ${context.userId}`;
    await recalcCompleteness(context.userId);
    return loadCandidateBundle(context.userId);
  });
