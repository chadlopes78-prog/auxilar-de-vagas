import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/site-header";
import { listCompanies } from "@/lib/server/jobs";
import type { CompanyCard } from "@/lib/types";
import { initials } from "@/lib/utils";

export const Route = createFileRoute("/companies/")({
  head: () => ({
    meta: [
      { title: "Empresas | Auxilar de Vagas" },
      { name: "description", content: "Empresas que publicam vagas em Moçambique, Angola e Portugal." },
    ],
  }),
  component: Companies,
});

function Companies() {
  const [rows, setRows] = useState<CompanyCard[] | null>(null);
  useEffect(() => {
    listCompanies()
      .then(setRows)
      .catch(() => setRows([]));
  }, []);
  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl">Empresas</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {rows == null
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-36 animate-pulse rounded-xl bg-border/60" />
              ))
            : rows.length === 0
              ? (
                <p className="col-span-full rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
                  Ainda não há empresas com vagas publicadas. As empresas entram quando publicam
                  directamente ou quando uma fonte autorizada é sincronizada.
                </p>
              )
              : rows.map((c) => (
                <Link
                  key={c.id}
                  to="/companies/$companyId"
                  params={{ companyId: String(c.id) }}
                  className="rounded-xl border border-border bg-surface p-5 hover:shadow-[0_8px_24px_rgba(20,34,28,0.06)]"
                >
                  <div className="grid size-12 place-items-center rounded-xl bg-primary-soft font-semibold text-primary">
                    {initials(c.name)}
                  </div>
                  <div className="mt-3 font-semibold">{c.name}</div>
                  <div className="text-sm text-muted">
                    {c.industry} · {[c.city, c.country].filter(Boolean).join(", ")}
                  </div>
                  <div className="mt-2 text-sm">
                    {c.jobCount} {c.jobCount === 1 ? "vaga activa" : "vagas activas"}
                  </div>
                </Link>
              ))}
        </div>
      </div>
    </Shell>
  );
}
