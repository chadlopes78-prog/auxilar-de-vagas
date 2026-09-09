import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { JobCardView, JobSkeleton } from "@/components/job-card";
import { LocationBrowse } from "@/components/location-browse";
import { countJobsByCountry, listLocationsWithJobs, searchJobs } from "@/lib/server/jobs";
import { ensurePublicFeedsFresh } from "@/lib/server/ingest";
import { toggleSaveJob } from "@/lib/server/account";
import type { JobCard, PlaceCount } from "@/lib/types";
import { useGeo } from "@/hooks/use-geo";
import { useLocationStore } from "@/store/location";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { COUNTRY_META, countryFlag, regionLabel } from "@/lib/i18n";
import { toast } from "sonner";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${APP_NAME} — ${APP_TAGLINE}` },
      {
        name: "description",
        content: "Pesquise vagas em Moçambique, Angola e Portugal num só lugar.",
      },
    ],
  }),
  loader: async () => {
    try {
      const counts = await countJobsByCountry();
      return { counts };
    } catch {
      return { counts: [] as { code: string; slug: string; name: string; count: number }[] };
    }
  },
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const loaded = Route.useLoaderData();
  const [q, setQ] = useState("");
  const [jobs, setJobs] = useState<JobCard[] | null>(null);
  const [counts, setCounts] = useState<{ code: string; slug: string; name: string; count: number }[] | null>(
    loaded.counts.length ? loaded.counts : null,
  );
  const [openCountry, setOpenCountry] = useState<string | null>(null);
  const [regionPlaces, setRegionPlaces] = useState<PlaceCount[] | null>(null);
  const loc = useLocationStore();
  const geo = useGeo();
  const user = useCurrentUser();
  const [ready, setReady] = useState(false);
  const [countryId, setCountryId] = useState(loc.countryId || 1);
  const [cityId, setCityId] = useState(loc.cityId);
  const city = ready ? (geo.cities.find((c) => c.id === loc.cityId)?.name ?? "si") : "si";
  const fallbackCountries = [
    { id: 1, code: "MZ", name: "Moçambique" },
    { id: 2, code: "AO", name: "Angola" },
    { id: 4, code: "PT", name: "Portugal" },
  ];
  const countries = geo.countries.length ? geo.countries : fallbackCountries;

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    setCountryId(loc.countryId || 1);
    setCityId(loc.cityId);
  }, [loc.countryId, loc.cityId]);

  const cities = useMemo(() => {
    const regions = geo.regions.filter((r) => r.countryId === countryId).map((r) => r.id);
    return geo.cities.filter((c) => regions.includes(c.regionId));
  }, [geo, countryId]);

  useEffect(() => {
    searchJobs({
      data: { cityId: loc.cityId, regionId: loc.regionId, countryId: loc.countryId, sort: "relevant" },
    })
      .then((r) => setJobs(r.jobs.slice(0, 6)))
      .catch(() => setJobs([]));
  }, [loc.cityId, loc.regionId, loc.countryId]);

  useEffect(() => {
    let cancelled = false;
    countJobsByCountry()
      .then((rows) => {
        if (!cancelled) setCounts(rows);
      })
      .catch(() => {
        if (!cancelled) setCounts((prev) => prev ?? []);
      });
    void ensurePublicFeedsFresh({ data: {} }).then(async (r) => {
      if (cancelled || !r.imported) return;
      const [nextCounts, nextJobs] = await Promise.all([
        countJobsByCountry(),
        searchJobs({
          data: { cityId: loc.cityId, regionId: loc.regionId, countryId: loc.countryId, sort: "relevant" },
        }),
      ]);
      if (cancelled) return;
      setCounts(nextCounts);
      setJobs(nextJobs.jobs.slice(0, 6));
    });
    return () => {
      cancelled = true;
    };
  }, [loc.cityId, loc.regionId, loc.countryId]);

  async function save(id: number) {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    try {
      await toggleSaveJob({ data: id });
      toast.success("Vaga guardada");
    } catch {
      navigate({ to: "/login" });
    }
  }

  const countryCards = [
    { slug: "mocambique", code: "MZ" },
    { slug: "angola", code: "AO" },
    { slug: "portugal", code: "PT" },
  ].map((c) => ({
    ...c,
    name: COUNTRY_META[c.code].name,
    hint: COUNTRY_META[c.code].hint,
    flag: COUNTRY_META[c.code].flag,
    count: counts?.find((x) => x.code === c.code)?.count,
  }));

  return (
    <Shell>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <p className="text-sm font-medium text-primary" suppressHydrationWarning>
            {APP_NAME} · oportunidades perto de {city}
          </p>
          <h1 className="mt-2 max-w-3xl text-4xl md:text-5xl">Encontre oportunidades de emprego perto de si</h1>
          <p className="mt-3 max-w-xl text-muted">
            Pesquise vagas em Moçambique, Angola e Portugal num só lugar.
          </p>
          <form
            className="mt-8 grid gap-2 rounded-2xl border border-border bg-bg p-3 md:grid-cols-[1.3fr_0.9fr_0.9fr_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              navigate({
                to: "/vagas",
                search: { q, country: String(countryId), city: cityId ? String(cityId) : undefined },
              });
            }}
          >
            <div>
              <label className="px-1 text-xs font-medium uppercase tracking-wide text-muted">
                Cargo ou palavra-chave
              </label>
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Motorista, Contabilista, Programador"
              />
            </div>
            <div>
              <label className="px-1 text-xs font-medium uppercase tracking-wide text-muted">País</label>
              <Select
                suppressHydrationWarning
                value={String(countryId)}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setCountryId(id);
                  const firstRegion = geo.regions.find((r) => r.countryId === id);
                  const firstCity = geo.cities.find((c) => c.regionId === firstRegion?.id);
                  setCityId(firstCity?.id ?? 0);
                }}
              >
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {countryFlag(c.code)} {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="px-1 text-xs font-medium uppercase tracking-wide text-muted">Cidade ou região</label>
              <Select suppressHydrationWarning value={String(cityId)} onChange={(e) => setCityId(Number(e.target.value))}>
                {cities.length === 0 ? <option value={String(cityId)}>Cidade ou região</option> : null}
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" size="lg" className="mt-5">
              <Search className="size-4" />
              Pesquisar vagas
            </Button>
          </form>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl">Encontre vagas por localização</h2>
        <p className="mt-1 text-sm text-muted">Escolha o país para ver imediatamente onde existem oportunidades.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {countryCards.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => {
                const next = openCountry === c.slug ? null : c.slug;
                setOpenCountry(next);
                if (next) {
                  const id = geo.countries.find((x) => x.code === c.code)?.id ?? COUNTRY_META[c.code].id;
                  setRegionPlaces(null);
                  listLocationsWithJobs({ data: { countryId: id } })
                    .then(setRegionPlaces)
                    .catch(() => setRegionPlaces([]));
                }
              }}
              className={`rounded-2xl border bg-surface p-6 text-left hover:border-primary hover:shadow-[0_8px_24px_rgba(20,34,28,0.06)] ${
                openCountry === c.slug ? "border-primary" : "border-border"
              }`}
            >
              <div className="text-2xl" aria-hidden>
                {c.flag}
              </div>
              <div className="mt-2 text-xl font-semibold">{c.name}</div>
              <p className="mt-1 text-sm text-muted">{c.hint}</p>
              <p className="mt-3 text-xs text-muted">
                {c.count == null
                  ? "A carregar vagas…"
                  : c.count === 0
                    ? "Ainda sem vagas publicadas"
                    : c.count === 1
                      ? "1 vaga publicada"
                      : `${c.count} vagas publicadas`}
              </p>
            </button>
          ))}
        </div>
        {openCountry ? (
          <HomeRegions
            slug={openCountry}
            card={countryCards.find((c) => c.slug === openCountry)!}
            items={regionPlaces}
            geoId={
              geo.countries.find((x) => x.slug === openCountry)?.id ??
              COUNTRY_META[countryCards.find((c) => c.slug === openCountry)?.code ?? "MZ"].id
            }
            onPick={(item) => {
              const countryIdForPick = geo.countries.find((x) => x.slug === openCountry)?.id ?? loc.countryId;
              loc.setLocation({ countryId: countryIdForPick, regionId: item.id, cityId: 0, confirmed: true });
              navigate({
                to: "/vagas/$country/$region",
                params: { country: openCountry, region: item.slug },
                search: {},
              });
            }}
          />
        ) : null}
      </section>
      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-2xl">Vagas perto de {city}</h2>
            <Link to="/vagas" className="text-sm font-medium text-primary">
              Ver todas
            </Link>
          </div>
          <div className="space-y-3">
            {jobs == null ? (
              <>
                <JobSkeleton />
                <JobSkeleton />
              </>
            ) : jobs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center">
                <p className="font-medium">Ainda não há vagas nesta localização.</p>
                <p className="mt-1 text-sm text-muted">
                  As vagas entram quando uma fonte autorizada é sincronizada. Não mostramos anúncios fictícios.
                </p>
                <Link to="/alerts">
                  <Button className="mt-4">Ativar alerta de vagas</Button>
                </Link>
              </div>
            ) : (
              jobs.map((j) => <JobCardView key={j.id} job={j} onSave={save} />)
            )}
          </div>
        </div>
      </section>
    </Shell>
  );
}

function HomeRegions({
  slug,
  card,
  items,
  geoId,
  onPick,
}: {
  slug: string;
  card: { code: string; name: string };
  items: PlaceCount[] | null;
  geoId: number;
  onPick: (item: PlaceCount) => void;
}) {
  const noun = regionLabel(card.code);
  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface p-4 md:p-6">
      <h3 className="text-xl">Escolha onde procura emprego</h3>
      <p className="mt-1 mb-4 text-sm text-muted">
        {card.code === "PT" ? "Distritos e regiões" : `${noun}s`} com vagas disponíveis em {card.name}.
      </p>
      <LocationBrowse
        items={items}
        searchPlaceholder={`Pesquisar ${noun.toLowerCase()} ou região`}
        emptyTitle="Ainda não encontramos vagas disponíveis neste país."
        allLabel={`Ver todas as vagas em ${card.name}`}
        allTo="/vagas/$country"
        allParams={{ country: slug }}
        countryId={geoId}
        onPick={onPick}
      />
    </div>
  );
}

