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
import { initials, isNew, labelOf, money, timeAgo, EMPLOYMENT, EXPERIENCE, WORK_MODELS } from "@/lib/utils";
import { useCurrentUser, useCurrentUserState } from "@/lib/auth/use-current-user";
import { toast } from "sonner";

export const Route = createFileRoute("/jobs/$jobId")({
  head: () => ({
    meta: [{ title: "Vaga | Auxilar de Vagas" }],
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
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="h-40 animate-pulse rounded-xl bg-border/60" />
        </div>
      </Shell>
    );
  }
  if (!job) {
    return (
      <Shell>
        <div className="mx-auto max-w-6xl px-4 py-16">Vaga não encontrada.</div>
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
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 md:grid-cols-[1fr_300px]">
        <article>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {isNew(job.publishedAt) ? <Chip color="green">NOVA</Chip> : null}
            {job.urgent ? <Chip color="red">URGENTE</Chip> : null}
            {job.featured ? <Chip>DESTAQUE</Chip> : null}
            {job.workModel === "remote" ? <Chip color="blue">REMOTO</Chip> : null}
            <ApplyMethodBadge channel={job.applyChannel} />
          </div>
          <h1 className="text-3xl md:text-4xl">{job.title}</h1>
          <p className="mt-2 text-muted">
            {job.companyName} · {[job.city, job.region, job.country].filter(Boolean).join(", ")} ·{" "}
            {timeAgo(job.publishedAt)}
          </p>
          <p className="mt-3 text-sm">
            {labelOf(EMPLOYMENT, job.employmentType)} · {labelOf(WORK_MODELS, job.workModel)} ·{" "}
            {labelOf(EXPERIENCE, job.experienceLevel)}
            {job.salaryMin
              ? ` · ${money(job.salaryMin, job.salaryCurrency)} – ${money(job.salaryMax, job.salaryCurrency)}`
              : " · Salário não indicado"}
          </p>
          <p className="text-sm text-muted">Prazo de candidatura: {job.deadline ?? "Aberto"}</p>
          <p className="mt-2 text-sm">Fonte: {job.sourceName}</p>
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
        <aside className="h-fit rounded-xl border border-border bg-surface p-5 md:sticky md:top-24">
          <div className="mb-3 grid size-12 place-items-center rounded-xl bg-primary-soft font-semibold text-primary">
            {initials(job.companyName)}
          </div>
          <div className="font-semibold">{job.companyName}</div>
          <p className="text-sm text-muted">{job.companyIndustry}</p>
          <p className="mt-3 text-xs text-muted">
            {job.applyEmail
              ? `A candidatura é enviada para o e-mail oficial ${job.applyEmail}.`
              : job.applyChannel === "official_redirect"
                ? "Prepara a candidatura aqui. O envio final é no portal oficial."
                : job.applyChannel === "official_api"
                  ? "Candidatura rápida disponível para esta vaga."
                  : "Candidatura enviada directamente no Auxilar de Vagas."}
          </p>
          <div className="mt-4 space-y-2">
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
      <div className="sticky bottom-0 border-t border-border bg-surface p-3 md:hidden">{applyBtn}</div>

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
    <section className="mt-8">
      <h2 className="text-xl">{title}</h2>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-fg/90">{children || "—"}</p>
    </section>
  );
}

function Chip({ children, color }: { children: string; color?: string }) {
  const cls =
    color === "green"
      ? "bg-primary-soft text-primary"
      : color === "red"
        ? "bg-[#fde8e6] text-danger"
        : color === "blue"
          ? "bg-[#e8eefc] text-info"
          : "bg-bg text-fg";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${cls}`}>{children}</span>;
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
