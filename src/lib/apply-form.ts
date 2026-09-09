import type { AnswerMap, ApplyQuestion } from "@/lib/types";

export type WizardStep = {
  key: string;
  label: string;
  extraKeys: string[];
};

const STEP_LABELS: Record<string, string> = {
  intro: "Informação profissional",
  experience: "Experiência",
  qualifications: "Qualificações",
  specific: "Perguntas específicas",
  cv: "CV",
  review: "Revisão",
};

export function questionVisible(q: ApplyQuestion, answers: AnswerMap) {
  if (!q.visibleIf?.questionKey) return true;
  const v = answers[q.visibleIf.questionKey];
  const want = q.visibleIf.equals;
  if (want == null) return Boolean(v);
  if (Array.isArray(v)) return v.includes(want);
  return v === want;
}

export function formatAnswer(value: string | string[] | undefined) {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  return value;
}

export function professionLabel(profession: string) {
  const map: Record<string, string> = {
    driver: "motorista",
    accounting: "contabilidade",
    it: "informática",
    nursing: "enfermagem",
    teaching: "educação",
    sales: "vendas",
    hospitality: "hotelaria",
    logistics: "logística",
    admin: "administração",
    construction: "construção",
    health: "saúde",
    general: "esta função",
  };
  return map[profession] ?? "esta função";
}

function hasVisible(questions: ApplyQuestion[], stepKey: string, answers: AnswerMap) {
  return questions.some((q) => q.stepKey === stepKey && questionVisible(q, answers));
}

export function buildWizardSteps(questions: ApplyQuestion[], answers: AnswerMap): WizardStep[] {
  const groups = ["experience", "qualifications", "specific"].filter((k) =>
    hasVisible(questions, k, answers),
  );
  const first = groups[0];
  const rest = groups.slice(1);
  return [
    { key: "intro", label: STEP_LABELS.intro, extraKeys: first ? [first] : [] },
    ...rest.map((k) => ({ key: k, label: STEP_LABELS[k] ?? k, extraKeys: [] as string[] })),
    { key: "cv", label: STEP_LABELS.cv, extraKeys: [] },
    { key: "review", label: STEP_LABELS.review, extraKeys: [] },
  ];
}

export function questionsForWizardStep(
  step: WizardStep | undefined,
  questions: ApplyQuestion[],
  answers: AnswerMap,
) {
  if (!step) return [];
  const keys = new Set([step.key, ...step.extraKeys]);
  return questions.filter((q) => keys.has(q.stepKey) && questionVisible(q, answers));
}

function yearsFromExperiences(experiences: { period: string | null }[]) {
  if (!experiences.length) return null;
  const text = experiences.map((e) => e.period ?? "").join(" ");
  const years = [...text.matchAll(/\b(20\d{2})\b/g)].map((m) => Number(m[1]));
  if (years.length >= 2) {
    const span = Math.max(...years) - Math.min(...years);
    if (span >= 5) return "Mais de 5 anos";
    if (span >= 3) return "3–5 anos";
    if (span >= 1) return "1–2 anos";
  }
  if (experiences.length >= 3) return "3–5 anos";
  if (experiences.length >= 1) return "1–2 anos";
  return null;
}

function matchOptions(options: string[] | null | undefined, values: string[]) {
  if (!options?.length || !values.length) return [];
  const lower = values.map((v) => v.toLowerCase());
  return options.filter((opt) => lower.some((v) => v.includes(opt.toLowerCase()) || opt.toLowerCase().includes(v)));
}

export function suggestAnswers(input: {
  questions: ApplyQuestion[];
  availability?: string | null;
  portfolio?: string | null;
  linkedin?: string | null;
  education: { degree: string | null }[];
  skills: string[];
  languages: { name: string; level: string | null }[];
  experiences: { title: string | null; period: string | null }[];
}): AnswerMap {
  const out: AnswerMap = {};
  const years = yearsFromExperiences(input.experiences);
  const degree = (input.education[0]?.degree ?? "").toLowerCase();
  const availability = (input.availability ?? "").toLowerCase();
  const langNames = input.languages.map((l) => l.name);

  for (const q of input.questions) {
    if (years && q.options?.includes("1–2 anos") && /ano|experiênc/.test(q.question.toLowerCase())) {
      out[q.key] = years;
    }
    if (q.key === "education_level" || /nível académico/.test(q.question.toLowerCase())) {
      if (/mestr/.test(degree)) out[q.key] = q.options?.find((o) => /mestr/i.test(o)) ?? "Mestrado";
      else if (/licenc/.test(degree)) out[q.key] = q.options?.find((o) => /licenc/i.test(o)) ?? "Licenciatura";
      else if (/técnic|tecnic/.test(degree))
        out[q.key] = q.options?.find((o) => /técnic|tecnic/i.test(o)) ?? "Técnico Profissional";
    }
    if (q.key === "availability") {
      if (q.questionType === "yes_no") {
        if (/imediat/.test(availability)) out.availability = "Sim";
      } else if (q.options?.length) {
        if (/imediat/.test(availability)) out.availability = q.options.find((o) => /imediat/i.test(o)) ?? "Imediata";
        else if (/15/.test(availability)) out.availability = q.options.find((o) => o.includes("15")) ?? "15 dias";
        else if (/30/.test(availability)) out.availability = q.options.find((o) => o.includes("30")) ?? "30 dias";
      }
    }
    if (q.questionType === "multi" && q.options?.length) {
      const matched = matchOptions(q.options, [...input.skills, ...langNames]);
      if (matched.length) out[q.key] = matched;
    }
  }

  if (input.portfolio) {
    if (input.questions.some((q) => q.key === "has_portfolio")) out.has_portfolio = "Sim";
    if (input.questions.some((q) => q.key === "portfolio_url")) out.portfolio_url = input.portfolio;
    if (/github\.com/i.test(input.portfolio)) {
      if (input.questions.some((q) => q.key === "has_github")) out.has_github = "Sim";
      if (input.questions.some((q) => q.key === "github_url")) out.github_url = input.portfolio;
    }
  }
  return out;
}
