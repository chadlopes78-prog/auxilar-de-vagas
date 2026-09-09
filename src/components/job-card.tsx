import { Link, useNavigate } from "@tanstack/react-router";
import { Bookmark, MapPin } from "lucide-react";
import type { JobCard } from "@/lib/types";
import { initials, isNew, labelOf, timeAgo, EMPLOYMENT, WORK_MODELS } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ApplyMethodBadge } from "@/components/apply-method-badge";

export function JobCardView({
  job,
  onSave,
  saved,
}: {
  job: JobCard;
  onSave?: (id: number) => void;
  saved?: boolean;
}) {
  const navigate = useNavigate();
  const isSaved = saved ?? job.saved;
  const loc = [job.city, job.region, job.country].filter(Boolean).join(", ");
  return (
    <article
      className="group cursor-pointer rounded-xl border border-border bg-surface p-4 transition-shadow duration-150 hover:shadow-[0_8px_24px_rgba(20,34,28,0.08)]"
      onClick={() => navigate({ to: "/jobs/$jobId", params: { jobId: String(job.id) } })}
    >
      <div className="flex gap-3">
        <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-sm font-semibold text-primary">
          {initials(job.companyName)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-sans text-base font-semibold leading-snug tracking-tight">{job.title}</h3>
          <p className="mt-0.5 truncate text-sm text-muted">{job.companyName}</p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{loc || "Localização a confirmar"}</span>
            </span>
            <span>
              {labelOf(EMPLOYMENT, job.employmentType)} · {labelOf(WORK_MODELS, job.workModel)}
            </span>
            <span>{timeAgo(job.publishedAt)}</span>
          </div>
          <p className="mt-2 text-xs text-muted">Fonte: {job.sourceName}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {isNew(job.publishedAt) ? (
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary">
                NOVA
              </span>
            ) : null}
            {job.urgent ? (
              <span className="rounded-full bg-[#fde8e6] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-danger">
                URGENTE
              </span>
            ) : null}
            {job.featured ? (
              <span className="rounded-full bg-[#eef2f6] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-fg">
                DESTAQUE
              </span>
            ) : null}
            {job.workModel === "remote" ? (
              <span className="rounded-full bg-[#e8eefc] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-info">
                REMOTO
              </span>
            ) : null}
            <ApplyMethodBadge channel={job.applyChannel} />
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] border border-border px-3 text-sm font-medium hover:bg-bg"
          aria-label={isSaved ? "Remover das vagas guardadas" : "Guardar vaga"}
          onClick={() => onSave?.(job.id)}
        >
          <Bookmark className={`size-4 ${isSaved ? "fill-primary text-primary" : "text-muted"}`} />
          {isSaved ? "Guardada" : "Guardar"}
        </button>
        <Link to="/jobs/$jobId" params={{ jobId: String(job.id) }} search={{ apply: "1" }} className="min-w-0">
          <Button size="sm" type="button" className="h-11 w-full">
            Candidatar-me
          </Button>
        </Link>
      </div>
    </article>
  );
}

export function JobSkeleton() {
  return <div className="mb-3 h-28 animate-pulse rounded-xl bg-border/60" />;
}
