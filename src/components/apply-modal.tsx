import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { getApplyContext, giveApplicationConsent, submitApplication } from "@/lib/server/apply";
import { addDocument } from "@/lib/server/candidate";
import {
  buildWizardSteps,
  formatAnswer,
  professionLabel,
  questionVisible,
  questionsForWizardStep,
  type WizardStep,
} from "@/lib/apply-form";
import type { AnswerMap, ApplyContext, ApplyQuestion } from "@/lib/types";
import { toast } from "sonner";
import { supportUrl, WhatsAppIcon } from "@/components/support-whatsapp";

const WA_CV_TEXT =
  "Olá! Estou a candidatar-me a uma vaga e ainda não tenho CV. Preciso de ajuda para preparar o meu currículo.";

function applyHelpText(title: string, company: string) {
  return `Olá! Acabei de me candidatar à vaga ${title} na ${company}. Preciso de auxílio no meu processo.`;
}

export function ApplyModal({
  jobId,
  onClose,
  onDone,
}: {
  jobId: number;
  onClose: () => void;
  onDone?: () => void;
}) {
  const [ctx, setCtx] = useState<ApplyContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [liveLocation, setLiveLocation] = useState("");
  const [editIdentity, setEditIdentity] = useState(false);
  const [cvName, setCvName] = useState("");
  const [useSaved, setUseSaved] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [consentStep, setConsentStep] = useState(false);
  const [step, setStep] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [resultCta, setResultCta] = useState<string | null>(null);
  const [sentDone, setSentDone] = useState(false);

  useEffect(() => {
    getApplyContext({ data: jobId })
      .then((c) => {
        setCtx(c);
        setPhone(c.phone);
        setEmail(c.email);
        setFullName(c.fullName);
        setLiveLocation([c.cityName, c.regionName].filter(Boolean).join(", "));
        setCvName(c.cvName ?? "");
        setUseSaved(Boolean(c.cvName));
        setConsentStep(c.consentNeeded && !c.alreadyApplied);
        setEditIdentity(!c.fullName || ![c.cityName, c.regionName].filter(Boolean).join(", "));
        const initial: AnswerMap = { ...(c.suggestedAnswers ?? {}) };
        if (c.wantsCoverLetter && c.coverLetter) initial.cover_letter = c.coverLetter;
        setAnswers(initial);
      })
      .catch(() => setError("Não foi possível preparar a candidatura. Entre na conta e tente de novo."));
  }, [jobId]);

  const steps = useMemo(() => (ctx ? buildWizardSteps(ctx.questions, answers) : []), [ctx, answers]);
  const current = steps[step] ?? steps[0];
  const currentQuestions = questionsForWizardStep(current, ctx?.questions ?? [], answers);

  useEffect(() => {
    if (step >= steps.length && steps.length) setStep(steps.length - 1);
  }, [step, steps.length]);

  function setAnswer(key: string, value: string | string[]) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function validateStep() {
    if (!ctx || !current) return true;
    if (current.key === "intro") {
      if (!fullName.trim()) {
        toast.error("Indique o nome completo.");
        return false;
      }
      if (!liveLocation.trim()) {
        toast.error("Indique a província / cidade onde vive.");
        return false;
      }
    }
    if (current.key === "cv") return true;
    if (current.key === "review") return confirm;
    for (const q of currentQuestions) {
      if (!q.required) continue;
      const val = answers[q.key];
      const empty = val == null || val === "" || (Array.isArray(val) && val.length === 0);
      if (empty) {
        toast.error(`Responda: ${q.question}`);
        return false;
      }
    }
    return true;
  }

  function next() {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }

  function goTo(key: string) {
    const i = steps.findIndex((s) => s.key === key || s.extraKeys.includes(key));
    if (i >= 0) setStep(i);
  }

  async function send(consentAccepted = false) {
    if (!ctx) return;
    if (!confirm) {
      toast.error("Confirme que as informações fornecidas são verdadeiras.");
      return;
    }
    setBusy(true);
    try {
      const cover = typeof answers.cover_letter === "string" ? answers.cover_letter : "";
      const res = await submitApplication({
        data: {
          jobId,
          coverLetter: cover || undefined,
          phone,
          email,
          fullName,
          liveLocation,
          cvName: cvName || undefined,
          confirmCorrect: confirm,
          consentAccepted,
          answers,
          answersConfirmed: confirm,
        },
      });
      if (res.outcome === "consent_required") {
        setConsentStep(true);
        setBusy(false);
        return;
      }
      if (res.outcome === "already") {
        toast.message("Já se candidatou a esta vaga.");
        if (res.officialUrl) {
          setResultUrl(res.officialUrl);
          setResultMsg("Já se candidatou a esta vaga.");
          setResultCta(ctx.redirectCta);
        } else {
          onDone?.();
          onClose();
        }
        setBusy(false);
        return;
      }
      if (res.outcome === "redirect") {
        setResultUrl(res.officialUrl ?? null);
        setResultMsg(res.message);
        setResultCta(res.redirectCta ?? ctx.redirectCta);
        setBusy(false);
        return;
      }
      if (res.outcome === "sent") {
        setSentDone(true);
        setResultMsg("A sua candidatura foi enviada à empresa. Aguarde 2 dias de resposta.");
        onDone?.();
        return;
      }
      toast.error(res.message);
    } catch {
      toast.error("Não foi possível enviar. Verifique a sessão e tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  async function onPickFile(file: File | undefined) {
    if (!file) return;
    const ok = /\.(pdf|doc|docx)$/i.test(file.name);
    if (!ok) {
      toast.error("Formatos aceites: PDF, DOC, DOCX.");
      return;
    }
    setCvName(file.name);
    setUseSaved(false);
    try {
      await addDocument({ data: { fileName: file.name, kind: "cv", isPrimary: true } });
    } catch {
      /* guest session — keep local name */
    }
  }

  const wizardOpen = Boolean(ctx) && !error && !resultMsg && !ctx?.alreadyApplied && !consentStep;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-fg/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 overflow-y-auto p-6">
          {error ? (
            <>
              <h3 className="text-xl">Candidatar-me</h3>
              <p className="mt-2 text-sm text-muted">{error}</p>
              <div className="mt-4 flex gap-2">
                <Link to="/login">
                  <Button>Entrar</Button>
                </Link>
                <Button variant="outline" onClick={onClose}>
                  Fechar
                </Button>
              </div>
            </>
          ) : !ctx ? (
            <div className="h-32 animate-pulse rounded-xl bg-border/60" />
          ) : resultMsg && sentDone && ctx ? (
            <SentDone
              title={ctx.title}
              company={ctx.companyName}
              companyEmail={ctx.applyEmail}
              message={resultMsg}
              onClose={onClose}
            />
          ) : resultMsg ? (
            <>
              <h3 className="text-xl">{ctx.redirectTitle}</h3>
              <p className="mt-2 text-sm">{resultMsg}</p>
              {resultUrl ? (
                <a href={resultUrl} target="_blank" rel="noreferrer" className="mt-4 block">
                  <Button className="w-full" size="lg">
                    <ExternalLink className="size-4" />
                    {resultCta ?? "Continuar para candidatura oficial"}
                  </Button>
                </a>
              ) : null}
              <Button variant="outline" className="mt-2 w-full" onClick={onClose}>
                Fechar
              </Button>
            </>
          ) : ctx.alreadyApplied ? (
            <>
              <h3 className="text-xl">Já se candidatou a esta vaga.</h3>
              <p className="mt-2 text-sm text-muted">
                {ctx.companyName} · {ctx.title}
              </p>
              {ctx.existingOfficialUrl && ctx.channel !== "internal" ? (
                <a href={ctx.existingOfficialUrl} target="_blank" rel="noreferrer" className="mt-4 block">
                  <Button className="w-full">
                    <ExternalLink className="size-4" />
                    {ctx.redirectCta}
                  </Button>
                </a>
              ) : (
                <Link to="/applications" className="mt-4 block">
                  <Button className="w-full">Ver minhas candidaturas</Button>
                </Link>
              )}
              <Button variant="outline" className="mt-2 w-full" onClick={onClose}>
                Fechar
              </Button>
            </>
          ) : consentStep ? (
            <>
              <h3 className="text-xl">Partilha de dados</h3>
              <p className="mt-2 text-sm">
                Para enviar a sua candidatura, precisamos partilhar os dados profissionais selecionados com a
                empresa ou plataforma responsável por esta vaga.
              </p>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted">Dados a partilhar</p>
              <ul className="mt-1 list-disc pl-5 text-sm">
                {ctx.consentFields.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <Button
                className="mt-4 w-full"
                size="lg"
                disabled={busy}
                onClick={async () => {
                  await giveApplicationConsent({ data: { sourceSlug: ctx.sourceSlug, fields: ctx.consentFields } });
                  setConsentStep(false);
                }}
              >
                Concordo e continuar
              </Button>
              <Button variant="outline" className="mt-2 w-full" onClick={onClose}>
                Cancelar
              </Button>
            </>
          ) : (
            <>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Etapa {step + 1} de {steps.length}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-200"
                  style={{ width: `${((step + 1) / Math.max(steps.length, 1)) * 100}%` }}
                />
              </div>
              <h3 className="mt-4 text-xl">{current?.label}</h3>
              <p className="text-sm text-muted">
                {ctx.title} · {ctx.companyName}
              </p>
              <p className="mt-1 text-xs text-muted">Perguntas adaptadas a {professionLabel(ctx.profession)}.</p>

              {current?.key === "intro" ? (
                <IdentityBlock
                  ctx={ctx}
                  fullName={fullName}
                  setFullName={setFullName}
                  liveLocation={liveLocation}
                  setLiveLocation={setLiveLocation}
                  editIdentity={editIdentity}
                  setEditIdentity={setEditIdentity}
                />
              ) : null}

              {currentQuestions.length > 0 && current?.key !== "cv" && current?.key !== "review" ? (
                <div className="mt-4 space-y-4">
                  {currentQuestions.map((q) => (
                    <QuestionField key={q.id} q={q} value={answers[q.key]} onChange={(v) => setAnswer(q.key, v)} />
                  ))}
                </div>
              ) : null}

              {current?.key === "cv" ? (
                <CvStep
                  ctx={ctx}
                  cvName={cvName}
                  useSaved={useSaved}
                  setUseSaved={setUseSaved}
                  setCvName={setCvName}
                  onPickFile={onPickFile}
                />
              ) : null}
              {current?.key === "review" ? (
                <ReviewStep
                  ctx={ctx}
                  answers={answers}
                  fullName={fullName}
                  liveLocation={liveLocation}
                  cvName={cvName}
                  confirm={confirm}
                  setConfirm={setConfirm}
                  onEdit={goTo}
                  steps={steps}
                />
              ) : null}

              {ctx.applyEmail && current?.key === "review" ? (
                <p className="mt-3 text-sm text-muted">
                  A candidatura vai para o e-mail oficial da empresa: <strong>{ctx.applyEmail}</strong>
                </p>
              ) : null}
              {ctx.channel === "official_redirect" && !ctx.applyEmail && current?.key === "review" ? (
                <p className="mt-3 text-sm text-muted">{ctx.redirectMessage}</p>
              ) : null}
            </>
          )}
        </div>
        {wizardOpen ? (
          <div className="flex gap-2 border-t border-border bg-surface p-4">
            {step > 0 ? (
              <Button variant="outline" className="flex-1" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft className="size-4" />
                Voltar
              </Button>
            ) : (
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Cancelar
              </Button>
            )}
            {current?.key === "review" ? (
              <Button className="flex-1" size="lg" disabled={busy || !confirm} onClick={() => void send(true)}>
                {busy ? "A enviar…" : "ENVIAR CANDIDATURA"}
              </Button>
            ) : (
              <Button className="flex-1" size="lg" onClick={next}>
                Próximo
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SentDone({
  title,
  company,
  companyEmail,
  message,
  onClose,
}: {
  title: string;
  company: string;
  companyEmail?: string | null;
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-primary-soft text-2xl font-semibold text-primary">
        ✓
      </div>
      <h3 className="text-2xl">Candidatura enviada</h3>
      <p className="mt-3 text-base leading-relaxed">{message}</p>
      <p className="mt-2 text-sm text-muted">
        {title} · {company}
      </p>
      {companyEmail ? (
        <p className="mt-3 text-sm">
          E-mail da empresa: <strong>{companyEmail}</strong>
        </p>
      ) : null}
      <a
        href={supportUrl(applyHelpText(title, company))}
        target="_blank"
        rel="noreferrer"
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-whatsapp px-4 text-sm font-medium text-whatsapp-fg"
      >
        <WhatsAppIcon className="size-5" />
        Contacte-nos no WhatsApp para mais auxílio ao seu processo
      </a>
      <Link to="/applications" className="mt-3 block">
        <Button variant="outline" className="w-full">
          Ver minhas candidaturas
        </Button>
      </Link>
      <Button variant="ghost" className="mt-2 w-full" onClick={onClose}>
        Fechar
      </Button>
    </div>
  );
}

function IdentityBlock({
  ctx,
  fullName,
  setFullName,
  liveLocation,
  setLiveLocation,
  editIdentity,
  setEditIdentity,
}: {
  ctx: ApplyContext;
  fullName: string;
  setFullName: (v: string) => void;
  liveLocation: string;
  setLiveLocation: (v: string) => void;
  editIdentity: boolean;
  setEditIdentity: (v: boolean) => void;
}) {
  const filled = Boolean(fullName.trim() && liveLocation.trim());
  return (
    <div className="mt-4 space-y-4">
      {!editIdentity && filled ? (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-bg px-4 py-3">
          <div>
            <p className="font-medium">{fullName}</p>
            <p className="text-sm text-muted">{liveLocation}</p>
          </div>
          <button type="button" className="text-xs font-medium text-primary" onClick={() => setEditIdentity(true)}>
            Alterar
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <Label>Nome completo</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
          </div>
          <div>
            <Label>Província / cidade onde vive</Label>
            <Input
              value={liveLocation}
              onChange={(e) => setLiveLocation(e.target.value)}
              placeholder="Ex.: Sofala, Beira"
            />
          </div>
        </div>
      )}
      {ctx.requirements || ctx.qualifications ? (
        <details className="rounded-xl border border-border p-3">
          <summary className="cursor-pointer text-sm font-medium">Ver requisitos originais da vaga</summary>
          {ctx.requirements ? <p className="mt-2 whitespace-pre-wrap text-sm">{ctx.requirements}</p> : null}
          {ctx.qualifications ? <p className="mt-2 whitespace-pre-wrap text-sm">{ctx.qualifications}</p> : null}
        </details>
      ) : null}
    </div>
  );
}

function CvStep({
  ctx,
  cvName,
  useSaved,
  setUseSaved,
  setCvName,
  onPickFile,
}: {
  ctx: ApplyContext;
  cvName: string;
  useSaved: boolean;
  setUseSaved: (v: boolean) => void;
  setCvName: (v: string) => void;
  onPickFile: (file: File | undefined) => void;
}) {
  return (
    <div className="mt-4 space-y-4">
      <div>
        <h4 className="font-semibold">Envie o seu CV</h4>
        <p className="mt-1 text-sm text-muted">Adicione o seu currículo atualizado para concluir a candidatura.</p>
      </div>
      {ctx.documents.length > 0 ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              setUseSaved(true);
              setCvName(ctx.cvName || ctx.documents[0]?.fileName || "");
            }}
            className={`flex min-h-11 w-full items-center rounded-xl border px-4 text-left text-sm ${
              useSaved ? "border-primary bg-primary-soft" : "border-border"
            }`}
          >
            Usar CV guardado{ctx.cvName ? ` (${ctx.cvName})` : ""}
          </button>
          <button
            type="button"
            onClick={() => setUseSaved(false)}
            className={`flex min-h-11 w-full items-center rounded-xl border px-4 text-left text-sm ${
              !useSaved ? "border-primary bg-primary-soft" : "border-border"
            }`}
          >
            Enviar outro CV
          </button>
        </div>
      ) : null}
      {!useSaved || ctx.documents.length === 0 ? (
        <div>
          <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-[10px] bg-primary px-4 text-sm font-medium text-primary-fg hover:bg-[#0c5c3f]">
            Selecionar CV
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf"
              className="sr-only"
              onChange={(e) => onPickFile(e.target.files?.[0])}
            />
          </label>
          <p className="mt-2 text-xs text-muted">Formatos: PDF, DOC, DOCX{cvName ? ` · ${cvName}` : ""}</p>
        </div>
      ) : null}
      <div className="rounded-xl border border-border bg-bg p-4">
        <p className="font-semibold">Não tem CV?</p>
        <p className="mt-1 text-sm text-muted">Fale connosco pelo WhatsApp e ajudamos a preparar o seu currículo.</p>
        <a
          href={supportUrl(WA_CV_TEXT)}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-[#25D366] text-sm font-medium text-white hover:bg-[#1ebe5d]"
        >
          <WhatsAppIcon className="size-5" />
          Falar connosco
        </a>
      </div>
    </div>
  );
}

function ReviewStep({
  ctx,
  answers,
  fullName,
  liveLocation,
  cvName,
  confirm,
  setConfirm,
  onEdit,
  steps,
}: {
  ctx: ApplyContext;
  answers: AnswerMap;
  fullName: string;
  liveLocation: string;
  cvName: string;
  confirm: boolean;
  setConfirm: (v: boolean) => void;
  onEdit: (key: string) => void;
  steps: WizardStep[];
}) {
  const visible = ctx.questions.filter((q) => questionVisible(q, answers));
  const location = liveLocation || [ctx.cityName, ctx.regionName, ctx.countryName].filter(Boolean).join(", ");
  function stepKeyFor(questionStep: string) {
    const found = steps.find((s) => s.key === questionStep || s.extraKeys.includes(questionStep));
    return found?.key ?? questionStep;
  }
  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm font-medium">Rever candidatura</p>
      <div className="divide-y divide-border rounded-xl border border-border">
        <ReviewRow k="Nome" v={fullName || ctx.fullName || "—"} onEdit={() => onEdit("intro")} />
        <ReviewRow k="Localização" v={location || "—"} onEdit={() => onEdit("intro")} />
        {visible.map((q) => (
          <ReviewRow
            key={q.id}
            k={q.question}
            v={formatAnswer(answers[q.key])}
            onEdit={() => onEdit(stepKeyFor(q.stepKey))}
          />
        ))}
        <ReviewRow k="CV" v={cvName || "Ainda não enviado"} onEdit={() => onEdit("cv")} />
      </div>
      <label className="flex min-h-11 items-start gap-2 text-sm">
        <input className="mt-1" type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
        Confirmo que as informações fornecidas são verdadeiras.
      </label>
    </div>
  );
}

function ReviewRow({ k, v, onEdit }: { k: string; v: string; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
      <div>
        <div className="text-muted">{k}</div>
        <div className="font-medium">{v}</div>
      </div>
      <button type="button" className="shrink-0 text-xs font-medium text-primary" onClick={onEdit}>
        Editar
      </button>
    </div>
  );
}

function QuestionField({
  q,
  value,
  onChange,
}: {
  q: ApplyQuestion;
  value: string | string[] | undefined;
  onChange: (v: string | string[]) => void;
}) {
  const selected = Array.isArray(value) ? value : [];
  return (
    <div>
      <Label>
        {q.question}
        {q.required ? "" : " (opcional)"}
      </Label>
      {q.helpText ? <p className="mb-1 text-xs text-muted">{q.helpText}</p> : null}
      {q.questionType === "yes_no" || q.questionType === "single" ? (
        <div className="mt-1 grid gap-2">
          {(q.options ?? []).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`flex min-h-11 items-center rounded-xl border px-4 text-left text-sm ${
                value === opt ? "border-primary bg-primary-soft" : "border-border hover:border-primary"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : q.questionType === "multi" ? (
        <div className="mt-1 grid gap-2">
          {(q.options ?? []).map((opt) => {
            const on = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(on ? selected.filter((x) => x !== opt) : [...selected, opt])}
                className={`flex min-h-11 items-center rounded-xl border px-4 text-left text-sm ${
                  on ? "border-primary bg-primary-soft" : "border-border hover:border-primary"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      ) : q.questionType === "number" ? (
        <Input type="number" value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} />
      ) : q.questionType === "date" ? (
        <Input type="date" value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} />
      ) : q.questionType === "text" && q.key === "cover_letter" ? (
        <Textarea rows={4} value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} />
      ) : q.questionType === "file" ? (
        <input
          type="file"
          className="mt-1 block w-full text-sm"
          onChange={(e) => onChange(e.target.files?.[0]?.name ?? "")}
        />
      ) : (
        <Input value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}
