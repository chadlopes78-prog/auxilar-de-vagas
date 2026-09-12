import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Shell } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { ApplyModal } from "@/components/apply-modal";
import { ApplyMethodBadge } from "@/components/apply-method-badge";
import { getJob } from "@/lib/server/jobs";
import { toggleSaveJob } from "@/lib/server/account";
import type { JobDetail } from "@/lib/types";
import { isNew, labelOf, money, timeAgo, EMPLOYMENT, EXPERIENCE, WORK_MODELS } from "@/lib/utils";
import { useCurrentUser, useCurrentUserState } from "@/lib/auth/use-current-user";
import { toast } from "sonner";
import { APP_NAME, pageTitle } from "@/lib/brand";

export const Route = createFileRoute("/jobs/$jobId")({
  head: () => ({
    meta: [{ title: pageTitle("Vaga") }],
  }),
  validateSearch: (s: Record<string, unknown>): { apply?: string } => {
    if (s.apply === "1" || s.apply === true) return { apply: "1" };
    return {};
  },
  component: JobDetailPage,
});

function JobDetailPage() {
  const { jobId } = Route.useParams();
  const search = Route.useSearch();
  const id = Number(jobId);
  const [job, setJob] = useState<JobDetail | null | undefined>(undefined);
  const [applyOpen, setApplyOpen] = useState(false);
  const [gate, setGate] = useState(false);
  const user = useCurrentUser();
  const { isPending } = useCurrentUserState();

  useEffect(() => {
    getJob({ data: id })
      .then(setJob)
      .catch(() => setJob(null));
  }, [id]);

  useEffect(() => {
    if (search.apply === "1" && job && !isPending) {
      if (!user) setGate(true);
      else setApplyOpen(true);
    }
  }, [search.apply, job, user, isPending]);

  if (job === undefined) {
    return (
      <Shell>
        <div className="mx-auto max-w-5xl px-4 py-10">
          <div className="h-40 animate-pulse border-b border-border" />
        </div>
      </Shell>
    );
  }
  if (!job) {
    return (
      <Shell>
        <div className="mx-auto max-w-5xl px-4 py-16">Vaga não encontrada.</div>
      </Shell>
    );
  }

  function startApply() {
    if (isPending) return;
    if (!user) {
      setGate(true);
      return;
    }
    setApplyOpen(true);
  }

  async function save() {
    if (!user) {
      setGate(true);
      return;
    }
    await toggleSaveJob({ data: id });
    toast.success("Vagas guardadas atualizadas");
  }

  const applyBtn = (
    <Button className="w-full" size="lg" onClick={startApply}>
      Candidatar-me
    </Button>
  );

  return (
    <Shell>
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-8 md:grid-cols-[1fr_240px]">
        <article>
          <p className="text-xs uppercase tracking-[0.14em] text-muted">{job.companyName}</p>
          <h1 className="mt-2 text-3xl md:text-4xl">{job.title}</h1>
          <p className="mt-3 text-muted">
            {[job.city, job.region, job.country].filter(Boolean).join(", ")} · {timeAgo(job.publishedAt)}
          </p>
          <p className="mt-3 text-sm">
            {labelOf(EMPLOYMENT, job.employmentType)} · {labelOf(WORK_MODELS, job.workModel)} ·{" "}
            {labelOf(EXPERIENCE, job.experienceLevel)}
            {job.salaryMin
              ? ` · ${money(job.salaryMin, job.salaryCurrency)} – ${money(job.salaryMax, job.salaryCurrency)}`
              : " · Salário não indicado"}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
            {isNew(job.publishedAt) ? <span className="text-primary">Nova</span> : null}
            {job.urgent ? <span className="text-danger">Urgente</span> : null}
            {job.featured ? <span>Destaque</span> : null}
            {job.workModel === "remote" ? <span>Remoto</span> : null}
            <ApplyMethodBadge channel={job.applyChannel} />
          </div>
          <p className="mt-4 text-sm text-muted">Prazo de candidatura: {job.deadline ?? "Aberto"}</p>
          <p className="mt-1 text-sm text-muted">Fonte: {job.sourceName}</p>
          {job.applyEmail ? (
            <p className="mt-2 text-sm">
              E-mail oficial da empresa:{" "}
              <a className="font-medium text-primary" href={`mailto:${job.applyEmail}`}>
                {job.applyEmail}
              </a>
            </p>
          ) : null}
          <Section title="Descrição da vaga">{job.description}</Section>
          <Section title="Responsabilidades">{job.responsibilities}</Section>
          <Section title="Requisitos">{job.requirements}</Section>
          <Section title="Qualificações">{job.qualifications}</Section>
          <Section title="Benefícios">{job.benefits}</Section>
          <Section title="Sobre a empresa">{job.companyDescription}</Section>
        </article>
        <aside className="h-fit border-t border-border pt-5 md:sticky md:top-24 md:border-t-0 md:border-l md:pl-6 md:pt-0">
          <div className="font-display text-xl">{job.companyName}</div>
          <p className="mt-1 text-sm text-muted">{job.companyIndustry}</p>
          <p className="mt-3 text-xs text-muted">
            {job.applyEmail
              ? `A candidatura é enviada para o e-mail oficial ${job.applyEmail}.`
              : job.applyChannel === "official_redirect"
                ? "Prepara a candidatura aqui. O envio final é no portal oficial."
                : job.applyChannel === "official_api"
                  ? "Candidatura rápida disponível para esta vaga."
                  : `Candidatura enviada directamente no ${APP_NAME}.`}
          </p>
          <div className="mt-5 hidden space-y-2 md:block">
            {applyBtn}
            <Button variant="outline" className="w-full" onClick={() => void save()}>
              <Bookmark className="size-4" /> Guardar vaga
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                void navigator.clipboard.writeText(window.location.href);
                toast.success("Ligação copiada");
              }}
            >
              <Share2 className="size-4" /> Partilhar
            </Button>
          </div>
        </aside>
      </div>
      <div className="fixed inset-x-0 z-30 border-t border-border bg-bg p-3 md:hidden bottom-[calc(3.5rem+env(safe-area-inset-bottom))]">
        <div className="flex gap-2">
          <Button variant="outline" className="shrink-0" onClick={() => void save()} aria-label="Guardar vaga">
            <Bookmark className="size-4" />
          </Button>
          {applyBtn}
        </div>
      </div>

      {gate ? (
        <Modal onClose={() => setGate(false)}>
          <h3 className="text-xl">Crie a sua conta gratuita para se candidatar.</h3>
          <p className="mt-2 text-sm text-muted">
            Navegar é gratuito. É necessária uma conta para candidatar-se, guardar vagas e enviar o CV.
          </p>
          <div className="mt-4 flex gap-2">
            <Link to="/register">
              <Button>Criar conta</Button>
            </Link>
            <Link to="/login">
              <Button variant="outline">Entrar</Button>
            </Link>
          </div>
        </Modal>
      ) : null}
      {applyOpen ? (
        <ApplyModal
          jobId={id}
          onClose={() => setApplyOpen(false)}
          onDone={() => {
            window.location.href = "/applications";
          }}
        />
      ) : null}
    </Shell>
  );
}

function Section({ title, children }: { title: string; children?: string | null }) {
  return (
    <section className="mt-10 border-t border-border pt-6">
      <h2 className="text-xl">{title}</h2>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-fg/90">{children || "—"}</p>
    </section>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-fg/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
