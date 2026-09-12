import { Link, useNavigate } from "@tanstack/react-router";
import { Bookmark } from "lucide-react";
import type { JobCard } from "@/lib/types";
import { isNew, labelOf, timeAgo, EMPLOYMENT, WORK_MODELS } from "@/lib/utils";
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
      className="cursor-pointer border-b border-border py-5"
      onClick={() => navigate({ to: "/jobs/$jobId", params: { jobId: String(job.id) } })}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">{job.companyName}</p>
          <h3 className="mt-1 font-display text-xl leading-snug">{job.title}</h3>
          <p className="mt-2 text-sm text-muted">
            {loc || "Localização a confirmar"} · {labelOf(EMPLOYMENT, job.employmentType)} ·{" "}
            {labelOf(WORK_MODELS, job.workModel)} · {timeAgo(job.publishedAt)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            {isNew(job.publishedAt) ? <span className="text-primary">Nova</span> : null}
            {job.urgent ? <span className="text-danger">Urgente</span> : null}
            {job.featured ? <span>Destaque</span> : null}
            {job.workModel === "remote" ? <span>Remoto</span> : null}
            <ApplyMethodBadge channel={job.applyChannel} />
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-border px-4 text-sm"
          aria-label={isSaved ? "Remover das vagas guardadas" : "Guardar vaga"}
          onClick={() => onSave?.(job.id)}
        >
          <Bookmark className={`size-4 ${isSaved ? "fill-primary text-primary" : "text-muted"}`} />
          {isSaved ? "Guardada" : "Guardar"}
        </button>
        <Link to="/jobs/$jobId" params={{ jobId: String(job.id) }} search={{ apply: "1" }}>
          <Button size="sm" type="button">
            Candidatar-me
          </Button>
        </Link>
      </div>
    </article>
  );
}

export function JobSkeleton() {
  return <div className="mb-1 h-24 animate-pulse border-b border-border bg-transparent" />;
}
