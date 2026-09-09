import { useLocation, useNavigate, useSearch } from "@tanstack/react-router";
import { Filter } from "lucide-react";
import { useEffect, useState } from "react";
import { JobCardView, JobSkeleton } from "@/components/job-card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { searchJobs } from "@/lib/server/jobs";
import { ensurePublicFeedsFresh, listPublicSources, type PublicSource } from "@/lib/server/ingest";
import { toggleSaveJob } from "@/lib/server/account";
import type { SearchResult } from "@/lib/types";
import { EMPLOYMENT, EXPERIENCE, WORK_MODELS } from "@/lib/utils";
import { cityLabel, countryFlag, jobCountLabel, regionLabel } from "@/lib/i18n";
import { useGeo } from "@/hooks/use-geo";
import { usePlacesWithJobs } from "@/hooks/use-places";
import { useLocationStore } from "@/store/location";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { toast } from "sonner";

export type JobSearchParams = {
  q?: string;
  category?: string;
  type?: string;
  workModel?: string;
  exp?: string;
  posted?: string;
  sort?: string;
  country?: string;
  region?: string;
  city?: string;
  company?: string;
  todas?: string;
  source?: string;
};

function emptyResult(): SearchResult {
  return {
    jobs: [],
    total: 0,
    page: 1,
    pageSize: 24,
    cityCount: 0,
    regionCount: 0,
    countryCount: 0,
    remoteCount: 0,
    sourceCounts: [],
  };
}

export function parseJobSearch(s: Record<string, unknown>): JobSearchParams {
  const out: JobSearchParams = {};
  if (typeof s.q === "string") out.q = s.q;
  if (typeof s.category === "string") out.category = s.category;
  if (typeof s.type === "string") out.type = s.type;
  if (typeof s.workModel === "string") out.workModel = s.workModel;
  if (typeof s.exp === "string") out.exp = s.exp;
  if (typeof s.posted === "string") out.posted = s.posted;
  if (typeof s.sort === "string") out.sort = s.sort;
  if (typeof s.country === "string") out.country = s.country;
  if (typeof s.region === "string") out.region = s.region;
  if (typeof s.city === "string") out.city = s.city;
  if (typeof s.company === "string") out.company = s.company;
  if (typeof s.source === "string") out.source = s.source;
  if (s.todas === "1" || s.todas === true) out.todas = "1";
  return out;
}

export function JobsListing({
  lockedCountryId,
  lockedRegionId,
  lockedCityId,
  strictLocation,
  heading,
  subheading,
}: {
  lockedCountryId?: number | null;
  lockedRegionId?: number | null;
  lockedCityId?: number | null;
  strictLocation?: boolean;
  heading?: string | null;
  subheading?: string;
}) {
  const search = useSearch({ strict: false }) as JobSearchParams;
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const loc = useLocationStore();
  const geo = useGeo();
  const user = useCurrentUser();
  const [result, setResult] = useState<SearchResult | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sources, setSources] = useState<PublicSource[]>([]);
  const [q, setQ] = useState(search.q ?? "");
  const [draft, setDraft] = useState({
    country: search.country,
    region: search.region,
    city: search.city,
    category: search.category,
    type: search.type,
    workModel: search.workModel,
    exp: search.exp,
    posted: search.posted,
    company: search.company ?? "",
  });

  useEffect(() => {
    setQ(search.q ?? "");
  }, [search.q]);

  const countryId =
    lockedCountryId ??
    (search.country === undefined ? loc.countryId : search.country ? Number(search.country) : null);
  const regionId =
    lockedRegionId ??
    (search.region === undefined
      ? lockedCountryId
        ? null
        : loc.regionId
      : search.region
        ? Number(search.region)
        : null);
  const cityId =
    lockedCityId ??
    (search.city === undefined
      ? lockedCountryId || lockedRegionId
        ? null
        : loc.cityId
      : search.city
        ? Number(search.city)
        : null);

  useEffect(() => {
    setResult(null);
    setPage(1);
    searchJobs({
      data: {
        q: search.q,
        countryId,
        regionId,
        cityId,
        categoryId: search.category ? Number(search.category) : null,
        employmentType: search.type,
        workModel: search.workModel,
        experienceLevel: search.exp,
        posted: search.posted,
        company: search.company,
        sort: search.sort ?? "relevant",
        strictLocation: Boolean(strictLocation || lockedCityId),
        page: 1,
        pageSize: 24,
        sourceSlug: search.source,
      },
    })
      .then(setResult)
      .catch(() => setResult(emptyResult()));
  }, [search, countryId, regionId, cityId, strictLocation, lockedCityId]);

  useEffect(() => {
    void listPublicSources()
      .then(setSources)
      .catch(() => setSources([]));
    const code = geo.countries.find((c) => c.id === countryId)?.code;
    setRefreshing(true);
    void ensurePublicFeedsFresh({ data: { countryCode: code } })
      .then(async (r) => {
        if (r.imported > 0) {
          const [next, src] = await Promise.all([
            searchJobs({
              data: {
                q: search.q,
                countryId,
                regionId,
                cityId,
                categoryId: search.category ? Number(search.category) : null,
                employmentType: search.type,
                workModel: search.workModel,
                experienceLevel: search.exp,
                posted: search.posted,
                company: search.company,
                sort: search.sort ?? "relevant",
                strictLocation: Boolean(strictLocation || lockedCityId),
                page: 1,
                pageSize: 24,
                sourceSlug: search.source,
              },
            }),
            listPublicSources(),
          ]);
          setResult(next);
          setSources(src);
          setPage(1);
        } else {
          const src = await listPublicSources().catch(() => [] as PublicSource[]);
          setSources(src);
        }
      })
      .finally(() => setRefreshing(false));
  }, [countryId]);

  function applyFilters() {
    navigate({
      to: path,
      search: {
        ...search,
        country: lockedCountryId ? undefined : draft.country,
        region: lockedRegionId ? undefined : draft.region,
        city: draft.city,
        category: draft.category,
        type: draft.type,
        workModel: draft.workModel,
        exp: draft.exp,
        posted: draft.posted,
        company: draft.company || undefined,
      },
    } as never);
    setDrawer(false);
  }

  function clearFilters() {
    setDraft({
      country: lockedCountryId ? String(lockedCountryId) : undefined,
      region: lockedRegionId ? String(lockedRegionId) : undefined,
      city: undefined,
      category: undefined,
      type: undefined,
      workModel: undefined,
      exp: undefined,
      posted: undefined,
      company: "",
    });
    navigate({ to: path, search: { q: search.q, sort: search.sort } } as never);
  }

  async function save(id: number) {
    if (!user) return navigate({ to: "/login" });
    try {
      await toggleSaveJob({ data: id });
      toast.success("Vaga guardada");
    } catch {
      navigate({ to: "/login" });
    }
  }

  async function loadMore() {
    if (!result || loadingMore) return;
    const next = page + 1;
    setLoadingMore(true);
    try {
      const more = await searchJobs({
        data: {
          q: search.q,
          countryId,
          regionId,
          cityId,
          categoryId: search.category ? Number(search.category) : null,
          employmentType: search.type,
          workModel: search.workModel,
          experienceLevel: search.exp,
          posted: search.posted,
          company: search.company,
          sort: search.sort ?? "relevant",
          strictLocation: Boolean(strictLocation || lockedCityId),
          page: next,
          pageSize: 24,
          sourceSlug: search.source,
        },
      });
      setResult({
        ...more,
        jobs: [...result.jobs, ...more.jobs],
      });
      setPage(next);
    } finally {
      setLoadingMore(false);
    }
  }

  const countryCode = geo.countries.find((c) => c.id === (draft.country ? Number(draft.country) : countryId))?.code;
  const cityName = geo.cities.find((c) => c.id === cityId)?.name;
  const regionName = geo.regions.find((r) => r.id === regionId)?.name;
  const countryName = geo.countries.find((c) => c.id === countryId)?.name ?? "país";
  const filterCountryId = Number(draft.country || countryId) || null;
  const filterRegionId = Number(draft.region || regionId) || null;
  const regions = usePlacesWithJobs(filterCountryId);
  const cities = usePlacesWithJobs(null, filterRegionId, Boolean(filterRegionId));

  const filters = (
    <aside className="space-y-4 rounded-xl border border-border bg-surface p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Localização</h3>
      {lockedCountryId ? null : (
        <div>
          <Label>País</Label>
          <Select
            value={draft.country ?? String(countryId ?? "")}
            onChange={(e) => setDraft((d) => ({ ...d, country: e.target.value, region: "", city: "" }))}
          >
            {geo.countries.map((c) => (
              <option key={c.id} value={c.id}>
                {countryFlag(c.code)} {c.name}
              </option>
            ))}
          </Select>
        </div>
      )}
      {lockedRegionId ? null : (
        <div>
          <Label>{regionLabel(countryCode)}</Label>
          <Select
            value={draft.region ?? String(regionId ?? "")}
            onChange={(e) => setDraft((d) => ({ ...d, region: e.target.value, city: "" }))}
          >
            <option value="">Todas</option>
            {(regions ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </div>
      )}
      <div>
        <Label>{cityLabel(countryCode)}</Label>
        <Select value={draft.city ?? String(cityId ?? "")} onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}>
          <option value="">Todas</option>
          {(cities ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Categoria</h3>
      <Select
        value={draft.category ?? ""}
        onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value || undefined }))}
      >
        <option value="">Todas as categorias</option>
        {geo.categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      <Radio
        title="Tipo de emprego"
        value={draft.type}
        onChange={(v) => setDraft((d) => ({ ...d, type: v || undefined }))}
        options={[{ id: "", label: "Qualquer" }, ...EMPLOYMENT]}
      />
      <Radio
        title="Modalidade"
        value={draft.workModel}
        onChange={(v) => setDraft((d) => ({ ...d, workModel: v || undefined }))}
        options={[{ id: "", label: "Qualquer" }, ...WORK_MODELS]}
      />
      <Radio
        title="Experiência"
        value={draft.exp}
        onChange={(v) => setDraft((d) => ({ ...d, exp: v || undefined }))}
        options={[{ id: "", label: "Qualquer" }, ...EXPERIENCE]}
      />
      <Radio
        title="Data de publicação"
        value={draft.posted}
        onChange={(v) => setDraft((d) => ({ ...d, posted: v || undefined }))}
        options={[
          { id: "", label: "Qualquer" },
          { id: "today", label: "Hoje" },
          { id: "3", label: "Últimos 3 dias" },
          { id: "7", label: "Últimos 7 dias" },
          { id: "30", label: "Últimos 30 dias" },
        ]}
      />
      <div>
        <Label>Empresa</Label>
        <Input
          value={draft.company}
          onChange={(e) => setDraft((d) => ({ ...d, company: e.target.value }))}
          placeholder="Nome da empresa"
        />
      </div>
      <Button className="w-full" onClick={applyFilters}>
        Aplicar filtros
      </Button>
      <Button variant="outline" className="w-full" onClick={clearFilters}>
        Limpar filtros
      </Button>
    </aside>
  );

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-3 py-4 sm:px-4 sm:py-6 md:grid-cols-[280px_1fr]">
      <div className="hidden md:block">{filters}</div>
      <div className="min-w-0">
        {heading ? <h1 className="mb-1 text-2xl sm:text-3xl">{heading}</h1> : null}
        {subheading ? <p className="mb-4 text-sm text-muted">{subheading}</p> : null}
        <SourceStrip
          sources={sources}
          countryCode={countryCode}
          selected={search.source}
          counts={result?.sourceCounts ?? []}
          refreshing={refreshing}
          onSelect={(slug) =>
            navigate({
              to: path,
              search: { ...search, source: slug || undefined },
            } as never)
          }
        />
        <form
          className="mb-4 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: path, search: { ...search, q: q || undefined } } as never);
          }}
        >
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cargo ou palavra-chave, ex. Motorista"
            className="min-w-0 flex-1"
          />
          <Button type="submit" className="w-full sm:w-auto">
            Pesquisar
          </Button>
        </form>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            <strong className="text-fg">{result ? jobCountLabel(result.total) : "—"}</strong>
            {search.q ? ` para “${search.q}”` : ""}
            {cityName ? ` · a mostrar primeiro ${cityName}` : regionName ? ` · ${regionName}` : ` · ${countryName}`}
          </p>
          <div className="flex gap-2">
            <Select
              className="w-auto"
              value={search.sort ?? "relevant"}
              onChange={(e) => navigate({ to: path, search: { ...search, sort: e.target.value } } as never)}
            >
              <option value="relevant">Mais relevantes</option>
              <option value="recent">Mais recentes</option>
              <option value="salary">Salário mais alto</option>
              <option value="deadline">Prazo de candidatura</option>
            </Select>
            <Button variant="outline" className="md:hidden" onClick={() => setDrawer(true)}>
              <Filter className="size-4" /> Filtros
            </Button>
          </div>
        </div>
        {result && (cityName || regionName) ? (
          <p className="mb-4 text-xs text-muted">
            {cityName ? `${result.cityCount} em ${cityName}` : null}
            {cityName && regionName ? " · " : null}
            {regionName ? `${result.regionCount} em ${regionName}` : null}
            {" · "}
            {result.countryCount} em {countryName}
            {" · "}
            {result.remoteCount} remotas
          </p>
        ) : null}
        <div className="space-y-3">
          {result == null ? (
            <>
              <JobSkeleton />
              <JobSkeleton />
            </>
          ) : result.jobs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center">
              <h3 className="text-xl">Ainda não há vagas nesta localização.</h3>
              <p className="mt-1 text-sm text-muted">
                {search.q
                  ? `Não encontrámos “${search.q}” aqui. Não mostramos vagas inventadas — as oportunidades entram quando empresas publicam ou quando uma fonte autorizada é sincronizada.`
                  : "Não mostramos vagas inventadas. As oportunidades entram quando empresas publicam aqui ou quando uma fonte autorizada é sincronizada."}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {cityId ? (
                  <Button variant="outline" onClick={() => navigate({ to: path, search: { ...search, city: "" } } as never)}>
                    Pesquisar em {regionName ?? "toda a região"} ({result.regionCount})
                  </Button>
                ) : null}
                {regionId ? (
                  <Button
                    variant="outline"
                    onClick={() => navigate({ to: path, search: { ...search, city: "", region: "" } } as never)}
                  >
                    Pesquisar em {countryName} ({result.countryCount})
                  </Button>
                ) : null}
                <Button onClick={() => navigate({ to: path, search: { ...search, workModel: "remote" } } as never)}>
                  Ver vagas remotas ({result.remoteCount})
                </Button>
              </div>
            </div>
          ) : (
            result.jobs.map((j) => <JobCardView key={j.id} job={j} onSave={save} />)
          )}
        </div>
        {result && result.jobs.length > 0 && result.jobs.length < result.total ? (
          <Button
            variant="outline"
            className="mt-4 w-full"
            disabled={loadingMore}
            onClick={() => void loadMore()}
          >
            {loadingMore ? "A carregar…" : `Carregar mais (${result.jobs.length} de ${result.total})`}
          </Button>
        ) : null}
      </div>
      {drawer ? (
        <div className="fixed inset-0 z-50 bg-fg/40 md:hidden" onClick={() => setDrawer(false)}>
          <div
            className="absolute inset-y-0 left-0 w-[88%] max-w-sm overflow-y-auto bg-bg p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {filters}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const COUNTRY_SOURCE_SLUGS: Record<string, string[]> = {
  MZ: ["nearhire", "emprego-mz", "oemprego-mz", "saplic", "todas-vagas"],
  AO: ["nearhire", "jobartis"],
  PT: ["nearhire", "iefp", "itjobs", "net-empregos"],
};

function SourceStrip({
  sources,
  countryCode,
  selected,
  counts,
  refreshing,
  onSelect,
}: {
  sources: PublicSource[];
  countryCode?: string;
  selected?: string;
  counts: { slug: string; name: string; count: number }[];
  refreshing: boolean;
  onSelect: (slug: string) => void;
}) {
  const slugs = COUNTRY_SOURCE_SLUGS[countryCode ?? ""] ?? [
    "nearhire",
    "emprego-mz",
    "oemprego-mz",
    "saplic",
    "todas-vagas",
    "jobartis",
    "iefp",
    "itjobs",
    "net-empregos",
  ];
  const rows = slugs
    .map((slug) => sources.find((s) => s.slug === slug))
    .filter((s): s is PublicSource => Boolean(s));
  if (!rows.length && !refreshing) return null;
  const countOf = (slug: string, name: string) =>
    counts.find((c) => c.slug === slug || c.name === name)?.count ?? 0;
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        Fontes consultadas{refreshing ? " · a actualizar…" : ""}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
            !selected ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-muted"
          }`}
          onClick={() => onSelect("")}
        >
          Todas
        </button>
        {rows.map((s) => {
          const n = countOf(s.slug, s.name);
          const pending = s.pending && n === 0;
          const active = selected === s.slug;
          return (
            <button
              key={s.slug}
              type="button"
              disabled={pending}
              title={pending ? "Integração pendente — não inventamos vagas desta fonte." : s.name}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                active
                  ? "border-primary bg-primary-soft text-primary"
                  : pending
                    ? "cursor-default border-border bg-bg text-muted"
                    : "border-border bg-surface text-fg"
              }`}
              onClick={() => {
                if (!pending) onSelect(s.slug === selected ? "" : s.slug);
              }}
            >
              {s.name}
              {pending ? " · pendente" : n ? ` · ${n}` : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Radio({
  title,
  value,
  onChange,
  options,
}: {
  title: string;
  value?: string;
  onChange: (v: string) => void;
  options: readonly { id: string; label: string }[];
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
      <div className="mt-1 space-y-1">
        {options.map((o) => (
          <label key={o.id || "any"} className="flex min-h-11 items-center gap-2 text-sm">
            <input type="radio" name={title} checked={(value ?? "") === o.id} onChange={() => onChange(o.id)} />
            {o.label}
          </label>
        ))}
      </div>
    </div>
  );
}
