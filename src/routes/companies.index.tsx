import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/site-header";
import { listCompanies } from "@/lib/server/jobs";
import type { CompanyCard } from "@/lib/types";

export const Route = createFileRoute("/companies/")({
  head: () => ({
    meta: [
      { title: "Empresas | Auxiliar de Vagas" },
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
        <div className="mt-6">
          {rows == null
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse border-b border-border" />
              ))
            : rows.length === 0
              ? (
                <p className="border-t border-border py-10 text-sm text-muted">
                  Ainda não há empresas com vagas publicadas. As empresas entram quando publicam
                  directamente ou quando uma fonte autorizada é sincronizada.
                </p>
              )
              : rows.map((c) => (
                <Link
                  key={c.id}
                  to="/companies/$companyId"
                  params={{ companyId: String(c.id) }}
                  className="flex items-baseline justify-between gap-3 border-b border-border py-4"
                >
                  <span className="min-w-0">
                    <span className="block font-display text-lg">{c.name}</span>
                    <span className="text-sm text-muted">
                      {c.industry} · {[c.city, c.country].filter(Boolean).join(", ")}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm text-muted">
                    {c.jobCount} {c.jobCount === 1 ? "vaga" : "vagas"}
                  </span>
                </Link>
              ))}
        </div>
      </div>
    </Shell>
  );
}
