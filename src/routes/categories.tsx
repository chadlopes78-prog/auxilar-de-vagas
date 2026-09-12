import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/site-header";
import { useGeo } from "@/hooks/use-geo";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Categorias | Auxiliar de Vagas" },
      { name: "description", content: "Explore vagas por categoria em Moçambique, Angola e Portugal." },
    ],
  }),
  component: Categories,
});

function Categories() {
  const geo = useGeo();
  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl">Categorias</h1>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {geo.categories.map((c) => (
            <Link
              key={c.id}
              to="/vagas"
              search={{ category: String(c.id) }}
              className="rounded-xl border border-border bg-surface p-5 hover:shadow-[0_8px_24px_rgba(20,34,28,0.06)]"
            >
              <div className="font-semibold">{c.name}</div>
              <div className="text-sm text-muted">
                {c.jobCount ?? 0} {(c.jobCount ?? 0) === 1 ? "vaga aberta" : "vagas abertas"}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Shell>
  );
}
