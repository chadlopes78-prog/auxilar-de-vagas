import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { getConnector, methodLabel, resolveApplyChannel, sourceSlugFrom } from "@/lib/server/connectors";
import { writeIntegrationLog } from "@/lib/server/connectors/log";
import { sendApplicationEmail } from "@/lib/server/mail";
import { loadCandidateBundle } from "@/lib/server/candidate";
import { detectProfession, ensureJobQuestions, jobWantsCoverLetter } from "@/lib/server/apply-questions";
import { extractPublishedEmail } from "@/lib/server/connectors/rss";
import { questionVisible, suggestAnswers } from "@/lib/apply-form";
import type { AnswerMap, ApplyContext, ApplyOutcome, ApplicationRow } from "@/lib/types";

const CONSENT_FIELDS = [
  "Nome",
  "E-mail",
  "Telefone",
  "CV",
  "Experiência",
  "Formação",
];

async function loadJobForApply(jobId: number) {
  const sql = await getSql();
  const rows = await sql<{
    id: number;
    title: string;
    company_name: string;
    city: string | null;
    region: string | null;
    country: string | null;
    apply_method: string | null;
    source_name: string | null;
    source_id: number | null;
    original_url: string | null;
    external_job_id: string | null;
    apply_email: string | null;
    company_email: string | null;
    requirements: string | null;
    qualifications: string | null;
    description: string | null;
    category: string | null;
    custom_application_questions: unknown;
  }>`
    select j.id, j.title, co.name as company_name, ci.name as city, r.name as region,
      ctry.name as country, j.apply_method, j.source_name, j.source_id, j.original_url, j.external_job_id,
      j.apply_email, p.email as company_email, j.requirements, j.qualifications, j.description, cat.name as category, j.custom_application_questions
    from jobs j
    join companies co on co.id = j.company_id
    left join cities ci on ci.id = j.city_id
    left join regions r on r.id = j.region_id
    left join countries ctry on ctry.id = j.country_id
    left join categories cat on cat.id = j.category_id
    left join profiles p on p.user_id = co.owner_id
    where j.id = ${jobId}
  `;
  return rows[0] ?? null;
}

async function persistAnswers(
  applicationId: number,
  questions: Awaited<ReturnType<typeof ensureJobQuestions>>,
  answers: AnswerMap,
) {
  const sql = await getSql();
  for (const q of questions) {
    const val = answers[q.key];
    if (val == null || val === "" || (Array.isArray(val) && !val.length)) continue;
    if (!questionVisible(q, answers)) continue;
    await sql`
      insert into application_answers (application_id, question_id, question_key, question_text, answer)
      values (${applicationId}, ${q.id}, ${q.key}, ${q.question}, ${JSON.stringify(val)}::jsonb)
      on conflict (application_id, question_key) do update set answer = excluded.answer, question_text = excluded.question_text
    `;
  }
}

function usableEmail(value: string | null | undefined) {
  const to = (value ?? "").trim().toLowerCase();
  if (!to.includes("@")) return null;
  if (to.includes("example.com") || to.includes("invent") || to.includes("noreply") || to.includes("no-reply")) {
    return null;
  }
  return to;
}

function officialEmailFromJob(job: {
  apply_email: string | null;
  description: string | null;
  requirements: string | null;
  qualifications: string | null;
}) {
  return (
    usableEmail(job.apply_email) ??
    extractPublishedEmail([job.description, job.requirements, job.qualifications].filter(Boolean).join("\n"))
  );
}

const SENT_MESSAGE = "A sua candidatura foi enviada à empresa. Aguarde 2 dias de resposta.";

async function persistOfficialEmail(jobId: number, email: string) {
  const sql = await getSql();
  await sql`
    update jobs set
      apply_email = coalesce(apply_email, ${email}),
      apply_method = case when apply_method in ('external', 'url') then 'email' else apply_method end
    where id = ${jobId}
  `;
}

async function rememberCompanyEmail(applicationId: number, email: string | null) {
  if (!email) return;
  const sql = await getSql();
  try {
    await sql`update applications set company_email = ${email} where id = ${applicationId}`;
  } catch {
    /* column is added by migration 0017 */
  }
}

async function deliverCompanyMail(input: {
  to: string | null;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  jobTitle: string;
  companyName: string;
  cvName: string | null;
  coverLetter: string;
  answers: Record<string, string>;
}) {
  const to = usableEmail(input.to);
  if (!to) {
    return { ok: false as const, httpCode: 0, message: "Esta vaga não indica um e-mail oficial de candidatura." };
  }
  return sendApplicationEmail({
    to,
    candidateName: input.candidateName,
    candidateEmail: input.candidateEmail,
    candidatePhone: input.candidatePhone,
    jobTitle: input.jobTitle,
    companyName: input.companyName,
    cvName: input.cvName,
    coverLetter: input.coverLetter,
    answers: input.answers,
  });
}

export const getApplyContext = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((jobId: number) => jobId)
  .handler(async ({ context, data: jobId }): Promise<ApplyContext> => {
    const sql = await getSql();
    const job = await loadJobForApply(jobId);
    if (!job) throw new Error("Vaga não encontrada");
    const officialEmail = officialEmailFromJob(job);
    if (officialEmail && officialEmail !== job.apply_email) {
      await persistOfficialEmail(job.id, officialEmail);
      job.apply_email = officialEmail;
    }
    const connector = getConnector(job.source_name, job.source_id);
    const caps = connector.capabilities();
    let channel = resolveApplyChannel({
      applyMethod: job.apply_method,
      sourceName: job.source_name,
      sourceId: job.source_id,
      applyEmail: officialEmail,
    });
    if (officialEmail && channel === "official_redirect") channel = "email";
    const slug = sourceSlugFrom(job.source_name, job.source_id);
    const loc = [job.city, job.region, job.country].filter(Boolean).join(", ");
    const existing = await sql<{ id: number; status: string; official_url: string | null }>`
      select id, status, official_url from applications
      where candidate_id = ${context.userId}
        and (
          job_id = ${jobId}
          or (
            ${job.external_job_id}::text is not null
            and external_job_id = ${job.external_job_id}
            and source_slug = ${slug}
          )
        )
      limit 1
    `;
    const profile = await sql<{
      full_name: string | null;
      email: string | null;
      phone: string | null;
      cv_name: string | null;
      default_cover_letter: string | null;
      title: string | null;
      city_name: string | null;
      region_name: string | null;
      country_name: string | null;
      availability: string | null;
      portfolio: string | null;
      linkedin: string | null;
    }>`
      select p.full_name, p.email, p.phone, cp.cv_name, cp.default_cover_letter, cp.title,
        ci.name as city_name, r.name as region_name, ctry.name as country_name,
        cp.availability, cp.portfolio, cp.linkedin
      from profiles p
      left join candidate_profiles cp on cp.user_id = p.user_id
      left join cities ci on ci.id = p.city_id
      left join regions r on r.id = p.region_id
      left join countries ctry on ctry.id = p.country_id
      where p.user_id = ${context.userId}
    `;
    const bundle = await loadCandidateBundle(context.userId);
    const primaryCv =
      bundle.documents.find((d) => d.isPrimary)?.fileName ??
      profile[0]?.cv_name ??
      bundle.documents[0]?.fileName ??
      null;
    const consent = await sql<{ id: number }>`
      select id from application_consents
      where user_id = ${context.userId} and source_slug = ${slug}
      limit 1
    `;
    const missing: string[] = [];
    if (!profile[0]?.full_name) missing.push("Nome completo");
    if (!profile[0]?.email) missing.push("E-mail");
    if (!profile[0]?.phone) missing.push("Telefone");
    const consentNeeded = channel !== "internal" && !consent[0];
    const questions = await ensureJobQuestions(job.id);
    const wantsCover = jobWantsCoverLetter(job);
    const profession = detectProfession(job);
    const consentFields = wantsCover ? [...CONSENT_FIELDS, "Carta de apresentação"] : CONSENT_FIELDS;
    const suggested = suggestAnswers({
      questions,
      availability: profile[0]?.availability,
      portfolio: profile[0]?.portfolio,
      linkedin: profile[0]?.linkedin,
      education: bundle.education,
      skills: bundle.skills,
      languages: bundle.languages,
      experiences: bundle.experiences,
    });
    return {
      jobId: job.id,
      title: job.title,
      companyName: job.company_name,
      location: loc,
      sourceName: job.source_name || connector.sourceName,
      sourceSlug: slug,
      channel,
      methodLabel: methodLabel(channel),
      officialUrl: job.original_url,
      redirectTitle: caps.redirectTitle,
      redirectMessage: caps.redirectMessage,
      redirectCta: caps.redirectCta,
      alreadyApplied: Boolean(existing[0]),
      existingStatus: existing[0]?.status ?? null,
      existingOfficialUrl: existing[0]?.official_url ?? job.original_url,
      fullName: profile[0]?.full_name ?? "",
      email: profile[0]?.email ?? "",
      phone: profile[0]?.phone ?? "",
      cvName: primaryCv,
      documents: bundle.documents,
      coverLetter: wantsCover ? (profile[0]?.default_cover_letter ?? "") : "",
      desiredRole: profile[0]?.title ?? "",
      missingFields: missing,
      consentNeeded,
      consentFields,
      quickApplyEligible: false,
      profession,
      requirements: job.requirements,
      qualifications: job.qualifications,
      wantsCoverLetter: wantsCover,
      questions,
      cityName: profile[0]?.city_name ?? job.city,
      regionName: profile[0]?.region_name ?? job.region,
      countryName: profile[0]?.country_name ?? job.country,
      suggestedAnswers: suggested,
      applyEmail: officialEmail,
    };
  });

export const giveApplicationConsent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ sourceSlug: z.string(), fields: z.array(z.string()).optional() }).parse(d))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const fields = (data.fields ?? CONSENT_FIELDS).join(", ");
    await sql`
      insert into application_consents (user_id, source_slug, fields_shared)
      values (${context.userId}, ${data.sourceSlug}, ${fields})
      on conflict (user_id, source_slug) do update set fields_shared = excluded.fields_shared
    `;
    return { ok: true };
  });

export const submitApplication = createServerFn({ method: "POST" })
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
        answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
        answersConfirmed: z.boolean().optional(),
        fullName: z.string().optional(),
        liveLocation: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }): Promise<ApplyOutcome> => executeSubmit(context.userId, data));

export async function executeSubmit(
  userId: string,
  data: {
    jobId: number;
    coverLetter?: string;
    phone?: string;
    email?: string;
    cvName?: string;
    confirmCorrect?: boolean;
    consentAccepted?: boolean;
    answers?: AnswerMap;
    answersConfirmed?: boolean;
    fullName?: string;
    liveLocation?: string;
  },
): Promise<ApplyOutcome> {
    const sql = await getSql();
    const job = await loadJobForApply(data.jobId);
    if (!job) throw new Error("Vaga não encontrada");
    const officialEmail = officialEmailFromJob(job);
    if (officialEmail && officialEmail !== job.apply_email) {
      await persistOfficialEmail(job.id, officialEmail);
      job.apply_email = officialEmail;
    }
    const connector = getConnector(job.source_name, job.source_id);
    let channel = resolveApplyChannel({
      applyMethod: job.apply_method,
      sourceName: job.source_name,
      sourceId: job.source_id,
      applyEmail: officialEmail,
    });
    if (officialEmail && channel === "official_redirect") channel = "email";
    const slug = sourceSlugFrom(job.source_name, job.source_id);
    const dup = await sql<{ id: number; status: string; official_url: string | null }>`
      select id, status, official_url from applications
      where candidate_id = ${userId}
        and (
          job_id = ${data.jobId}
          or (
            external_job_id is not null
            and external_job_id = ${job.external_job_id}
            and source_slug = ${slug}
          )
        )
      limit 1
    `;
    if (dup[0]) {
      return {
        outcome: "already",
        message: "Já se candidatou a esta vaga.",
        applicationId: dup[0].id,
        officialUrl: dup[0].official_url ?? job.original_url,
        channel,
      };
    }
    const questions = await ensureJobQuestions(job.id);
    const answers: AnswerMap = data.answers ?? {};
    for (const q of questions) {
      if (!q.required || !questionVisible(q, answers)) continue;
      const val = answers[q.key];
      const empty = val == null || val === "" || (Array.isArray(val) && val.length === 0);
      if (empty) {
        return { outcome: "error", message: `Responda: ${q.question}`, channel };
      }
    }
    if (!data.answersConfirmed && !data.confirmCorrect) {
      return { outcome: "error", message: "Confirme que as informações fornecidas são verdadeiras.", channel };
    }
    if (channel !== "internal") {
      const consent = await sql<{ id: number }>`
        select id from application_consents
        where user_id = ${userId} and source_slug = ${slug} limit 1
      `;
      if (!consent[0] && !data.consentAccepted) {
        return { outcome: "consent_required", message: "É necessário consentimento para partilhar os dados.", channel };
      }
      if (data.consentAccepted && !consent[0]) {
        await sql`
          insert into application_consents (user_id, source_slug, fields_shared)
          values (${userId}, ${slug}, ${CONSENT_FIELDS.join(", ")})
          on conflict (user_id, source_slug) do nothing
        `;
      }
    }
    const profile = await sql<{
      full_name: string | null;
      email: string | null;
      phone: string | null;
      cv_name: string | null;
      title: string | null;
      about: string | null;
      linkedin: string | null;
      default_cover_letter: string | null;
    }>`
      select p.full_name, p.email, p.phone, cp.cv_name, cp.title, cp.about, cp.linkedin, cp.default_cover_letter
      from profiles p
      left join candidate_profiles cp on cp.user_id = p.user_id
      where p.user_id = ${userId}
    `;
    const p = profile[0];
    if (data.phone || data.email || data.fullName) {
      await sql`
        update profiles set
          phone = coalesce(${data.phone || null}, phone),
          email = coalesce(${data.email || null}, email),
          full_name = coalesce(${data.fullName || null}, full_name)
        where user_id = ${userId}
      `;
    }
    const bundle = await loadCandidateBundle(userId);
    const email = data.email || p?.email || "";
    const phone = data.phone || p?.phone || "";
    const cover = jobWantsCoverLetter(job)
      ? data.coverLetter || (typeof answers.cover_letter === "string" ? answers.cover_letter : "") || p?.default_cover_letter || ""
      : "";
    const cvName = data.cvName || bundle.documents.find((d) => d.isPrimary)?.fileName || p?.cv_name || null;
    const snapshot = {
      fullName: data.fullName || p?.full_name,
      email,
      phone,
      cvName,
      coverLetter: cover,
      title: p?.title,
      about: p?.about,
      linkedin: p?.linkedin,
      experiences: bundle.experiences,
      education: bundle.education,
      skills: bundle.skills,
      languages: bundle.languages,
      certifications: bundle.certifications,
      answers,
      liveLocation: data.liveLocation || null,
      companyEmail: officialEmail,
    };
    const method =
      channel === "official_api"
        ? "official_api"
        : channel === "internal"
          ? "internal"
          : channel === "email"
            ? "email"
            : "official_redirect";

    if (channel === "official_redirect") {
      const inserted = await sql<{ id: number }>`
        insert into applications (
          job_id, candidate_id, cover_letter, phone, email, cv_name, status,
          method, source_slug, source_name, country_name, external_job_id,
          official_url, snapshot, status_note, answers, answers_confirmed
        ) values (
          ${data.jobId}, ${userId}, ${cover}, ${phone}, ${email}, ${cvName},
          'prepared', ${method}, ${slug}, ${job.source_name || connector.sourceName},
          ${job.country}, ${job.external_job_id}, ${job.original_url},
          ${JSON.stringify(snapshot)}::jsonb,
          ${"Estado gerido pelo portal externo."},
          ${JSON.stringify(answers)}::jsonb,
          ${true}
        ) returning id
      `;
      await persistAnswers(inserted[0].id, questions, answers);
      await rememberCompanyEmail(inserted[0].id, officialEmail);
      await writeIntegrationLog({
        sourceSlug: slug,
        operation: "prepare_redirect",
        applicationId: inserted[0].id,
        externalId: job.external_job_id,
        result: "prepared",
        message: "Candidatura preparada. Envio no portal oficial.",
      });
      await sql`
        insert into notifications (user_id, title, body)
        values (${userId}, ${"Candidatura preparada"}, ${job.title + " · " + (job.source_name || "")})
      `;
      return {
        outcome: "redirect",
        message: connector.capabilities().redirectMessage,
        applicationId: inserted[0].id,
        officialUrl: job.original_url,
        channel,
        redirectCta: connector.capabilities().redirectCta,
      };
    }

    const sending = await sql<{ id: number }>`
      insert into applications (
        job_id, candidate_id, cover_letter, phone, email, cv_name, status,
        method, source_slug, source_name, country_name, external_job_id,
        official_url, snapshot, status_note, answers, answers_confirmed
      ) values (
        ${data.jobId}, ${userId}, ${cover}, ${phone}, ${email}, ${cvName},
        'sending', ${method}, ${slug}, ${job.source_name || connector.sourceName},
        ${job.country}, ${job.external_job_id}, ${job.original_url},
        ${JSON.stringify(snapshot)}::jsonb, ${null},
        ${JSON.stringify(answers)}::jsonb,
        ${true}
      ) returning id
    `;
    const applicationId = sending[0].id;
    await persistAnswers(applicationId, questions, answers);
    await rememberCompanyEmail(applicationId, officialEmail);

    if (channel === "email") {
      const answerLines: Record<string, string> = {};
      for (const [k, v] of Object.entries(answers)) {
        answerLines[k] = Array.isArray(v) ? v.join(", ") : String(v);
      }
      const mailed = await deliverCompanyMail({
        to: officialEmail,
        candidateName: data.fullName || p?.full_name || "",
        candidateEmail: email,
        candidatePhone: phone,
        jobTitle: job.title,
        companyName: job.company_name,
        cvName,
        coverLetter: cover,
        answers: answerLines,
      });
      if (mailed.ok) {
        await sql`
          update applications set
            status = 'sent',
            submitted_at = now(),
            external_status = 'sent',
            last_status_sync = now(),
            status_note = ${null}
          where id = ${applicationId}
        `;
        await writeIntegrationLog({
          sourceSlug: slug,
          operation: "submit_email",
          applicationId,
          result: "sent",
          httpCode: mailed.httpCode,
          message: mailed.message,
        });
        await sql`
          insert into notifications (user_id, title, body)
          values (${userId}, ${SENT_MESSAGE}, ${job.title})
        `;
        return {
          outcome: "sent",
          message: SENT_MESSAGE,
          applicationId,
          channel: "email",
        };
      }
      await sql`
        update applications set status = 'send_error', status_note = ${mailed.message}
        where id = ${applicationId}
      `;
      await writeIntegrationLog({
        sourceSlug: slug,
        operation: "submit_email",
        applicationId,
        result: "error",
        httpCode: mailed.httpCode,
        message: mailed.message,
      });
      return {
        outcome: "error",
        message: mailed.message,
        applicationId,
        channel: "email",
      };
    }

    const result = await connector.submitApplication({
      jobId: job.id,
      externalJobId: job.external_job_id,
      officialUrl: job.original_url,
      applyEmail: officialEmail,
      sourceSlug: slug,
      sourceName: job.source_name || connector.sourceName,
      title: job.title,
      companyName: job.company_name,
      countryName: job.country,
      candidate: {
        fullName: p?.full_name || "",
        email,
        phone,
        cvName,
        coverLetter: cover,
        linkedin: p?.linkedin ?? null,
        title: p?.title ?? null,
        about: p?.about ?? null,
      },
    });

    if (result.ok) {
      const status = "sent";
      await sql`
        update applications set
          status = ${status},
          submitted_at = now(),
          external_application_id = ${result.externalApplicationId},
          external_status = ${result.externalStatus},
          last_status_sync = now(),
          status_note = ${null}
        where id = ${applicationId}
      `;
      await writeIntegrationLog({
        sourceSlug: slug,
        operation: "submit_application",
        applicationId,
        externalId: result.externalApplicationId,
        result: "sent",
        httpCode: result.httpCode,
        message: result.message,
      });
      await sql`
        insert into notifications (user_id, title, body)
        values (${userId}, ${SENT_MESSAGE}, ${job.title})
      `;
      const owner = await sql<{ owner_id: string | null }>`
        select co.owner_id from jobs j join companies co on co.id = j.company_id where j.id = ${data.jobId}
      `;
      if (owner[0]?.owner_id) {
        await sql`
          insert into notifications (user_id, title, body)
          values (${owner[0].owner_id}, ${"Nova candidatura recebida"}, ${job.title})
        `;
      }
      const answerLines: Record<string, string> = {};
      for (const [k, v] of Object.entries(answers)) {
        answerLines[k] = Array.isArray(v) ? v.join(", ") : String(v);
      }
      await deliverCompanyMail({
        to: officialEmail,
        candidateName: data.fullName || p?.full_name || "",
        candidateEmail: email,
        candidatePhone: phone,
        jobTitle: job.title,
        companyName: job.company_name,
        cvName,
        coverLetter: cover,
        answers: answerLines,
      });
      return {
        outcome: "sent",
        message: SENT_MESSAGE,
        applicationId,
        channel,
      };
    }

    if (result.channel === "official_redirect") {
      await sql`
        update applications set
          status = 'prepared',
          method = 'official_redirect',
          official_url = ${result.officialUrl},
          status_note = ${"Estado gerido pelo portal externo."}
        where id = ${applicationId}
      `;
      await writeIntegrationLog({
        sourceSlug: slug,
        operation: "submit_application",
        applicationId,
        externalId: job.external_job_id,
        result: "prepared",
        message: result.message,
      });
      return {
        outcome: "redirect",
        message: result.message,
        applicationId,
        officialUrl: result.officialUrl,
        channel: "official_redirect",
        redirectCta: connector.capabilities().redirectCta,
      };
    }

    await sql`
      update applications set status = 'send_error', status_note = ${result.message}
      where id = ${applicationId}
    `;
    await writeIntegrationLog({
      sourceSlug: slug,
      operation: "submit_application",
      applicationId,
      externalId: job.external_job_id,
      result: "error",
      httpCode: result.httpCode,
      message: result.message,
    });
    return {
      outcome: "error",
      message: result.message,
      applicationId,
      channel,
    };
}

export const listMyApplicationsFull = createServerFn({ method: "GET" })
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
    }>`
      select a.id, a.job_id, j.title, co.name as company_name, a.status, a.created_at,
        a.method, a.source_name, a.country_name, a.official_url, a.status_note,
        a.external_status, a.submitted_at
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
    }));
  });

export const syncMyApplicationStatuses = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      source_slug: string | null;
      source_name: string | null;
      external_application_id: string | null;
      method: string | null;
    }>`
      select id, source_slug, source_name, external_application_id, method
      from applications
      where candidate_id = ${context.userId}
        and external_application_id is not null
        and method = 'official_api'
    `;
    let updated = 0;
    for (const row of rows) {
      const connector = getConnector(row.source_name, null);
      if (!row.external_application_id) continue;
      const sync = await connector.syncStatus(row.external_application_id);
      if (!sync.supported) continue;
      if (sync.mappedStatus) {
        await sql`
          update applications set
            status = ${sync.mappedStatus},
            external_status = ${sync.externalStatus},
            last_status_sync = now(),
            status_note = ${null}
          where id = ${row.id} and candidate_id = ${context.userId}
        `;
        updated += 1;
      } else {
        await sql`
          update applications set last_status_sync = now(), external_status = ${sync.externalStatus}
          where id = ${row.id} and candidate_id = ${context.userId}
        `;
      }
    }
    return { updated };
  });
