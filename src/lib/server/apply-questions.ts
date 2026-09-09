import { getSql } from "@/lib/db";
import type { ApplyQuestion, QuestionStep, QuestionType, VisibleIf } from "@/lib/types";

type Draft = {
  key: string;
  question: string;
  type: QuestionType;
  required?: boolean;
  options?: string[];
  step: QuestionStep;
  help?: string;
  visibleIf?: VisibleIf;
};

const YES_NO = ["Sim", "Não"];
const YEARS = ["Menos de 1 ano", "1–2 anos", "3–5 anos", "Mais de 5 anos"];
const AVAIL = ["Imediata", "15 dias", "30 dias", "Outro"];
const ACADEMIC = ["Ensino Médio", "Técnico Profissional", "Licenciatura", "Mestrado", "Outro"];

type JobHint = {
  id: number;
  title: string;
  category: string | null;
  requirements: string | null;
  qualifications: string | null;
  description: string | null;
  custom?: unknown;
};

export function detectProfession(job: JobHint): string {
  const title = (job.title ?? "").toLowerCase();
  const cat = (job.category ?? "").toLowerCase();
  const t = `${title} ${cat}`;

  if (/motorista|condutor|camionista|chauffeur|táxi|taxi driver|heavy vehicle/.test(t)) return "driver";
  if (/contabil|accountant|tesourar|auditor fiscal|técnico de contas/.test(t)) return "accounting";
  if (
    /programad|desenvolvedor|developer|software|frontend|backend|full.?stack|devops|engenheiro de software|informátic|data analyst|web design/.test(
      t,
    )
  )
    return "it";
  if (/enfermeir|\bnurse\b|parteira/.test(t)) return "nursing";
  if (/médic|clinic|farmacêut|health/.test(t) && /healthcare|saúde|médic/.test(t)) return "health";
  if (/professor|docente|educador|\bteacher\b|formador|leccion/.test(t)) return "teaching";
  if (/comercial|vended|\bsales\b|representante|caixa\b/.test(t)) return "sales";
  if (/\bchef\b|cozinheir|restauração|hotelaria|garçon|empregado de mesa/.test(t)) return "hospitality";
  if (/armazém|warehouse|logístic|expedi|estafeta/.test(t)) return "logistics";
  if (/pedreiro|servente|electricista|eletricista|canalizador|soldador|construção/.test(t)) return "construction";
  if (/recepcion|assistente|administr|secretár|escritur/.test(t)) return "admin";

  if (/accounting|finance|contabil/.test(cat)) return "accounting";
  if (/it & technology|informát/.test(cat) && /program|develop|software|dados|web/.test(title)) return "it";
  if (/education/.test(cat) && /professor|docente|leccion/.test(title)) return "teaching";
  if (/logistics/.test(cat)) return "logistics";
  if (/hospitality/.test(cat)) return "hospitality";
  if (/sales/.test(cat)) return "sales";
  if (/healthcare|saúde/.test(cat) && /enfermeir|médic/.test(title)) return "nursing";
  if (/administration|customer service/.test(cat)) return "admin";
  if (/construction|engenharia/.test(cat)) return "construction";
  return "general";
}

export function jobWantsCoverLetter(job: JobHint) {
  const blob = `${job.requirements ?? ""} ${job.qualifications ?? ""}`;
  return /carta de apresenta|cover letter|motivation letter/i.test(blob);
}

function fromOfficial(raw: unknown): Draft[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: Draft[] = [];
  raw.forEach((item, i) => {
    if (!item || typeof item !== "object") return;
    const q = item as Record<string, unknown>;
    const question = String(q.question ?? q.label ?? "").trim();
    if (!question) return;
    const type = (String(q.question_type ?? q.type ?? "text") as QuestionType) || "text";
    const options = Array.isArray(q.options) ? q.options.map((o) => String(o)).filter(Boolean) : undefined;
    const stepRaw = String(q.step_key ?? q.step ?? "specific");
    const step = (["experience", "qualifications", "specific"].includes(stepRaw)
      ? stepRaw
      : "specific") as QuestionStep;
    out.push({
      key: String(q.key ?? `official_${i}`),
      question,
      type: ["yes_no", "single", "multi", "text", "number", "date", "file"].includes(type) ? type : "text",
      required: q.required !== false,
      options: type === "yes_no" ? options ?? YES_NO : options,
      step,
    });
  });
  return out.length ? out : null;
}

function extrasFromRequirements(job: JobHint, profession: string): Draft[] {
  const extra: Draft[] = [];
  const req = `${job.requirements ?? ""} ${job.qualifications ?? ""}`.toLowerCase();
  if (!req.trim()) return extra;

  if (profession !== "driver" && /carta de condu|carta [abcd]\b|licen[cç]a de condu/.test(req)) {
    extra.push({
      key: "has_licence",
      question: "Tem carta de condução?",
      type: "yes_no",
      options: YES_NO,
      step: "qualifications",
    });
    extra.push({
      key: "licence_category",
      question: "Categoria da carta",
      type: "single",
      options: ["A", "B", "C", "D", "Outra"],
      step: "qualifications",
      visibleIf: { questionKey: "has_licence", equals: "Sim" },
    });
  }
  if (profession !== "it" && profession !== "accounting" && /\bexcel\b/.test(req)) {
    extra.push({
      key: "excel",
      question: "Tem experiência com Excel?",
      type: "yes_no",
      options: YES_NO,
      step: "qualifications",
      required: false,
    });
  }
  if (/ingl[eê]s/.test(req)) {
    extra.push({
      key: "english_level",
      question: "Qual o seu nível de inglês?",
      type: "single",
      options: ["Nenhum", "Básico", "Intermédio", "Avançado", "Fluente"],
      step: "qualifications",
      required: false,
    });
  }
  if (profession !== "nursing" && /cédula profissional|ordem dos/.test(req)) {
    extra.push({
      key: "has_professional_licence",
      question: "Tem cédula / licença profissional válida?",
      type: "yes_no",
      options: YES_NO,
      step: "qualifications",
    });
  }
  if (profession !== "nursing" && profession !== "hospitality" && /turnos|noiturno|fins?-de-semana/.test(req)) {
    extra.push({
      key: "shift_ready",
      question: "Tem disponibilidade para turnos (incluindo noites ou fins-de-semana)?",
      type: "yes_no",
      options: YES_NO,
      step: "specific",
    });
  }
  return extra;
}

function template(profession: string, job: JobHint): Draft[] {
  const role = job.title;
  if (profession === "driver") {
    return [
      {
        key: "driver_years",
        question: "Quantos anos de experiência como motorista?",
        type: "single",
        options: YEARS,
        step: "experience",
      },
      {
        key: "driver_professional",
        question: "Já trabalhou como motorista profissional?",
        type: "yes_no",
        options: YES_NO,
        step: "experience",
      },
      {
        key: "has_licence",
        question: "Tem carta de condução?",
        type: "yes_no",
        options: YES_NO,
        step: "experience",
      },
      {
        key: "licence_category",
        question: "Categoria da carta",
        type: "single",
        options: ["A", "B", "C", "D", "Outra"],
        step: "experience",
        visibleIf: { questionKey: "has_licence", equals: "Sim" },
      },
      {
        key: "availability",
        question: "Tem disponibilidade imediata?",
        type: "yes_no",
        options: YES_NO,
        step: "specific",
      },
      {
        key: "relocate",
        question: "Está disponível para trabalhar noutra província?",
        type: "yes_no",
        options: YES_NO,
        step: "specific",
      },
    ];
  }
  if (profession === "accounting") {
    return [
      {
        key: "education_field",
        question: "Qual é a sua formação?",
        type: "single",
        options: ["Contabilidade", "Gestão", "Economia", "Finanças", "Outra"],
        step: "experience",
      },
      {
        key: "education_level",
        question: "Qual o seu nível académico?",
        type: "single",
        options: ACADEMIC,
        step: "experience",
      },
      {
        key: "acc_years",
        question: "Quantos anos de experiência em contabilidade?",
        type: "single",
        options: YEARS,
        step: "experience",
      },
      {
        key: "acc_tools",
        question: "Tem experiência com:",
        type: "multi",
        options: ["SAGE", "Primavera", "Excel", "ERP", "Outro"],
        step: "qualifications",
        required: false,
        help: "Pode seleccionar várias opções.",
      },
      {
        key: "acc_reports",
        question: "Tem experiência em preparação de relatórios financeiros?",
        type: "yes_no",
        options: YES_NO,
        step: "qualifications",
      },
      {
        key: "acc_tax",
        question: "Tem experiência em impostos?",
        type: "yes_no",
        options: YES_NO,
        step: "qualifications",
      },
      { key: "availability", question: "Disponibilidade", type: "single", options: AVAIL, step: "specific" },
    ];
  }
  if (profession === "it") {
    return [
      {
        key: "it_area",
        question: "Área principal",
        type: "single",
        options: ["Frontend", "Backend", "Full Stack", "Mobile", "DevOps", "Suporte", "Outra"],
        step: "experience",
      },
      {
        key: "it_stack",
        question: "Tecnologias que domina",
        type: "multi",
        options: ["JavaScript", "TypeScript", "React", "Node.js", "Python", "PHP", "Java", "C#", "SQL", "Outras"],
        step: "experience",
        help: "Pode seleccionar várias opções.",
      },
      {
        key: "it_years",
        question: "Quantos anos de experiência na área?",
        type: "single",
        options: YEARS,
        step: "experience",
      },
      {
        key: "has_portfolio",
        question: "Possui portfólio?",
        type: "yes_no",
        options: YES_NO,
        step: "specific",
      },
      {
        key: "portfolio_url",
        question: "Link do portfólio",
        type: "text",
        step: "specific",
        required: false,
        visibleIf: { questionKey: "has_portfolio", equals: "Sim" },
      },
      {
        key: "has_github",
        question: "Possui GitHub?",
        type: "yes_no",
        options: YES_NO,
        step: "specific",
      },
      {
        key: "github_url",
        question: "Link do GitHub",
        type: "text",
        step: "specific",
        required: false,
        visibleIf: { questionKey: "has_github", equals: "Sim" },
      },
      { key: "availability", question: "Disponibilidade", type: "single", options: AVAIL, step: "specific" },
    ];
  }
  if (profession === "nursing" || profession === "health") {
    return [
      {
        key: "nurse_years",
        question: profession === "health" ? "Quantos anos de experiência na área da saúde?" : "Quantos anos de experiência em enfermagem?",
        type: "single",
        options: YEARS,
        step: "experience",
      },
      {
        key: "nurse_licence",
        question: "Tem cédula / licença profissional?",
        type: "yes_no",
        options: YES_NO,
        step: "experience",
      },
      {
        key: "education_level",
        question: "Qual o seu nível académico?",
        type: "single",
        options: ["Curso médio", "Técnico", "Licenciatura", "Mestrado", "Outro"],
        step: "qualifications",
      },
      {
        key: "nurse_area",
        question: "Área em que tem mais experiência",
        type: "single",
        options:
          profession === "health"
            ? ["Clínica geral", "Pediatria", "Urgências", "Farmácia", "Laboratório", "Outra"]
            : ["Geral", "Pediatria", "Maternidade", "Urgências", "Comunitária", "Outra"],
        step: "specific",
        required: false,
      },
      {
        key: "nurse_shifts",
        question: "Tem disponibilidade para turnos (incluindo noites)?",
        type: "yes_no",
        options: YES_NO,
        step: "specific",
      },
      { key: "availability", question: "Disponibilidade", type: "single", options: AVAIL, step: "specific" },
    ];
  }
  if (profession === "teaching") {
    return [
      {
        key: "teach_years",
        question: "Quantos anos de experiência a leccionar?",
        type: "single",
        options: YEARS,
        step: "experience",
      },
      {
        key: "teach_level",
        question: "Níveis que lecciona",
        type: "multi",
        options: ["Primário", "Secundário", "Técnico", "Superior", "Formação de adultos"],
        step: "qualifications",
      },
      {
        key: "teach_subject",
        question: "Disciplina / área principal",
        type: "text",
        step: "qualifications",
      },
      {
        key: "education_level",
        question: "Qual o seu nível académico?",
        type: "single",
        options: ACADEMIC,
        step: "qualifications",
      },
      { key: "availability", question: "Disponibilidade", type: "single", options: AVAIL, step: "specific" },
    ];
  }
  if (profession === "sales") {
    return [
      {
        key: "sales_years",
        question: "Quantos anos de experiência em vendas?",
        type: "single",
        options: YEARS,
        step: "experience",
      },
      {
        key: "sales_targets",
        question: "Já trabalhou com metas de vendas?",
        type: "yes_no",
        options: YES_NO,
        step: "experience",
      },
      {
        key: "sales_channel",
        question: "Em que canal tem mais experiência?",
        type: "single",
        options: ["Presencial / loja", "Telefone", "Digital", "Mista"],
        step: "specific",
        required: false,
      },
      {
        key: "availability",
        question: "Tem disponibilidade imediata?",
        type: "yes_no",
        options: YES_NO,
        step: "specific",
      },
      {
        key: "relocate",
        question: "Está disponível para trabalhar noutra província?",
        type: "yes_no",
        options: YES_NO,
        step: "specific",
      },
    ];
  }
  if (profession === "hospitality") {
    return [
      {
        key: "hosp_years",
        question: "Quantos anos de experiência na área?",
        type: "single",
        options: YEARS,
        step: "experience",
      },
      {
        key: "hosp_languages",
        question: "Idiomas que fala",
        type: "multi",
        options: ["Português", "Inglês", "Francês", "Outro"],
        step: "qualifications",
      },
      {
        key: "hosp_shifts",
        question: "Tem disponibilidade para fins-de-semana e turnos?",
        type: "yes_no",
        options: YES_NO,
        step: "specific",
      },
      { key: "availability", question: "Disponibilidade", type: "single", options: AVAIL, step: "specific" },
    ];
  }
  if (profession === "logistics") {
    return [
      {
        key: "log_years",
        question: "Quantos anos de experiência em logística ou armazém?",
        type: "single",
        options: YEARS,
        step: "experience",
      },
      {
        key: "log_systems",
        question: "Tem experiência com sistemas de armazém / inventário?",
        type: "yes_no",
        options: YES_NO,
        step: "experience",
        required: false,
      },
      {
        key: "log_physical",
        question: "Tem disponibilidade para trabalho físico e turnos?",
        type: "yes_no",
        options: YES_NO,
        step: "specific",
      },
      { key: "availability", question: "Disponibilidade", type: "single", options: AVAIL, step: "specific" },
    ];
  }
  if (profession === "construction") {
    return [
      {
        key: "cons_years",
        question: "Quantos anos de experiência na construção?",
        type: "single",
        options: YEARS,
        step: "experience",
      },
      {
        key: "cons_tools",
        question: "Que trabalhos consegue executar?",
        type: "multi",
        options: ["Alvenaria", "Acabamentos", "Electricidade", "Canalização", "Soldadura", "Outro"],
        step: "qualifications",
        required: false,
      },
      {
        key: "cons_height",
        question: "Tem disponibilidade para trabalho em altura?",
        type: "yes_no",
        options: YES_NO,
        step: "specific",
        required: false,
      },
      { key: "availability", question: "Disponibilidade", type: "single", options: AVAIL, step: "specific" },
    ];
  }
  if (profession === "admin") {
    return [
      {
        key: "admin_years",
        question: "Quantos anos de experiência em funções semelhantes?",
        type: "single",
        options: YEARS,
        step: "experience",
      },
      {
        key: "admin_tools",
        question: "Ferramentas que utiliza",
        type: "multi",
        options: ["Excel", "Word", "E-mail", "Sistemas de facturação", "Outro"],
        step: "qualifications",
        required: false,
      },
      {
        key: "admin_languages",
        question: "Idiomas que fala",
        type: "multi",
        options: ["Português", "Inglês", "Outro"],
        step: "qualifications",
        required: false,
      },
      { key: "availability", question: "Disponibilidade", type: "single", options: AVAIL, step: "specific" },
    ];
  }
  return [
    {
      key: "role_years",
      question: `Quantos anos de experiência relevantes para “${role}”?`,
      type: "single",
      options: YEARS,
      step: "experience",
    },
    {
      key: "education_level",
      question: "Qual o seu nível académico?",
      type: "single",
      options: ACADEMIC,
      step: "qualifications",
      required: false,
    },
    { key: "availability", question: "Disponibilidade", type: "single", options: AVAIL, step: "specific" },
    {
      key: "relocate",
      question: "Está disponível para trabalhar noutra província?",
      type: "yes_no",
      options: YES_NO,
      step: "specific",
      required: false,
    },
  ];
}

function mergeDrafts(base: Draft[], extra: Draft[]) {
  const seen = new Set(base.map((d) => d.key));
  const out = base.slice();
  for (const d of extra) {
    if (seen.has(d.key)) continue;
    seen.add(d.key);
    out.push(d);
  }
  return out;
}

export function buildQuestionDrafts(job: JobHint): Draft[] {
  const official = fromOfficial(job.custom);
  const profession = detectProfession(job);
  const generated = mergeDrafts(template(profession, job), extrasFromRequirements(job, profession));
  const drafts = official ? mergeDrafts(official, generated) : generated;
  if (jobWantsCoverLetter(job)) {
    drafts.push({
      key: "cover_letter",
      question: "Carta de apresentação",
      type: "text",
      required: true,
      step: "specific",
      help: "Esta vaga pede carta de apresentação.",
    });
  }
  return drafts;
}

export async function ensureJobQuestions(jobId: number): Promise<ApplyQuestion[]> {
  const sql = await getSql();
  const rows = await sql<JobHint & { custom_application_questions: unknown }>`
    select j.id, j.title, cat.name as category, j.requirements, j.qualifications, j.description,
      j.custom_application_questions
    from jobs j
    left join categories cat on cat.id = j.category_id
    where j.id = ${jobId}
  `;
  const job = rows[0];
  if (!job) return [];
  job.custom = job.custom_application_questions;
  const drafts = buildQuestionDrafts(job);
  const existing = await loadQuestions(jobId);
  const expected = drafts.map((d) => `${d.key}:${d.step}:${d.question}`).join("|");
  const actual = existing.map((q) => `${q.key}:${q.stepKey}:${q.question}`).join("|");
  if (existing.length && expected === actual) return existing;

  await sql`delete from job_application_questions where job_id = ${jobId}`;
  let order = 0;
  for (const d of drafts) {
    order += 1;
    await sql`
      insert into job_application_questions (
        job_id, question_key, question, question_type, required, options, sort_order, step_key, help_text, visible_if
      ) values (
        ${jobId}, ${d.key}, ${d.question}, ${d.type}, ${d.required !== false},
        ${d.options ? JSON.stringify(d.options) : null}::jsonb,
        ${order}, ${d.step}, ${d.help ?? null},
        ${d.visibleIf ? JSON.stringify(d.visibleIf) : null}::jsonb
      )
      on conflict (job_id, question_key) do nothing
    `;
  }
  return loadQuestions(jobId);
}

export async function loadQuestions(jobId: number): Promise<ApplyQuestion[]> {
  const sql = await getSql();
  const rows = await sql<{
    id: number;
    job_id: number;
    question_key: string;
    question: string;
    question_type: string;
    required: boolean;
    options: unknown;
    sort_order: number;
    step_key: string;
    help_text: string | null;
    visible_if: unknown;
  }>`
    select id, job_id, question_key, question, question_type, required, options, sort_order, step_key, help_text, visible_if
    from job_application_questions
    where job_id = ${jobId}
    order by sort_order, id
  `;
  return rows.map((r) => ({
    id: r.id,
    jobId: r.job_id,
    key: r.question_key,
    question: r.question,
    questionType: r.question_type as QuestionType,
    required: Boolean(r.required),
    options: Array.isArray(r.options) ? (r.options as string[]) : null,
    sortOrder: r.sort_order,
    stepKey: r.step_key as QuestionStep,
    helpText: r.help_text,
    visibleIf: (r.visible_if as VisibleIf | null) ?? null,
  }));
}
