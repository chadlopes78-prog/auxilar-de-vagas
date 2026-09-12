import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/site-header";
import { JobCardView } from "@/components/job-card";
import { getCompany } from "@/lib/server/jobs";
import type { CompanyCard, JobCard } from "@/lib/types";

export const Route = createFileRoute("/companies/$companyId")({
  component: Company,
});

function Company() {
  const { companyId } = Route.useParams();
  const [data, setData] = useState<{ company: CompanyCard | null; jobs: JobCard[] } | null>(null);
  useEffect(() => {
    getCompany({ data: Number(companyId) })
      .then(setData)
      .catch(() => setData({ company: null, jobs: [] }));
  }, [companyId]);
  const c = data?.company;
  return (
    <Shell>
      <div className="mx-auto max-w-5xl px-4 py-10">
        {!c ? (
          <div className="h-32 animate-pulse border-b border-border" />
        ) : (
          <>
            <p className="text-xs uppercase tracking-[0.14em] text-muted">{c.industry || "Empresa"}</p>
            <h1 className="mt-2 text-3xl">{c.name}</h1>
            <p className="mt-2 text-muted">
              {[c.city, c.country].filter(Boolean).join(", ")}
              {c.size ? ` · ${c.size}` : ""}
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed">{c.description}</p>
            {c.website ? (
              <a className="mt-2 inline-block text-sm text-primary" href={c.website}>
                {c.website}
              </a>
            ) : null}
            <h2 className="mt-10 border-t border-border pt-6 text-2xl">Vagas activas</h2>
            <div className="mt-2">
              {data?.jobs.length === 0 ? (
                <p className="text-sm text-muted">Esta empresa não tem vagas publicadas neste momento.</p>
              ) : (
                data?.jobs.map((j) => <JobCardView key={j.id} job={j} />)
              )}
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
