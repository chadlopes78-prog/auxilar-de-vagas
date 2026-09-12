import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Shell } from "@/components/site-header";
import { JobsListing, parseJobSearch } from "@/components/jobs-listing";
import { LocationBrowse, LocationCrumbs } from "@/components/location-browse";
import { slugToCountryCode, slugToCountryName, regionLabel } from "@/lib/i18n";
import { useGeo } from "@/hooks/use-geo";
import { usePlacesWithJobs } from "@/hooks/use-places";
import { useLocationStore } from "@/store/location";
import type { PlaceCount } from "@/lib/types";

export const Route = createFileRoute("/vagas/$country/")({
  validateSearch: parseJobSearch,
  head: ({ params }) => {
    const name = slugToCountryName(params.country);
    return {
      meta: [
        { title: `Vagas em ${name} | Auxiliar de Vagas` },
        {
          name: "description",
          content: `Pesquise vagas de emprego em ${name}. Agregamos oportunidades de fontes autorizadas e de empresas que publicam directamente.`,
        },
      ],
    };
  },
  component: CountryJobs,
});

function CountryJobs() {
  const { country: slug } = Route.useParams();
  const navigate = useNavigate();
  const geo = useGeo();
  const loc = useLocationStore();
  const code = slugToCountryCode(slug);
  const country = geo.countries.find((c) => c.code === code || c.slug === slug);
  const name = country?.name ?? slugToCountryName(slug);
  const places = usePlacesWithJobs(country?.id ?? null);
  const noun = regionLabel(code);

  function pick(item: PlaceCount) {
    loc.setLocation({
      countryId: country?.id ?? loc.countryId,
      regionId: item.id,
      cityId: 0,
      confirmed: true,
    });
    navigate({
      to: "/vagas/$country/$region",
      params: { country: slug, region: item.slug },
      search: {},
    });
  }

  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <LocationCrumbs country={{ name, slug }} />
        <h1 className="text-3xl">Escolha onde procura emprego</h1>
        <p className="mt-1 mb-5 text-sm text-muted">
          {code === "PT"
            ? `Distritos e regiões com vagas disponíveis em ${name}.`
            : `${noun}s com vagas disponíveis em ${name}.`}{" "}
          Só mostramos locais com oportunidades activas.
        </p>
        <LocationBrowse
          items={places}
          searchPlaceholder={`Pesquisar ${noun.toLowerCase()} ou região`}
          emptyTitle="Ainda não encontramos vagas disponíveis neste país."
          allLabel={`Ver todas as vagas em ${name}`}
          allTo="/vagas/$country"
          allParams={{ country: slug }}
          onPick={pick}
          countryId={country?.id ?? null}
        />
      </div>
      <div id="todas">
        <JobsListing
          lockedCountryId={country?.id ?? null}
          heading={`Todas as vagas em ${name}`}
          subheading={
            code === "MZ"
              ? "Pesquisa única em Emprego.co.mz, O Emprego, Saplic, TodasVagas e Auxiliar de Vagas. Fontes sem autorização ficam pendentes — não inventamos vagas."
              : code === "AO"
                ? "Pesquisa única em Jobartis e Auxiliar de Vagas. Fontes sem autorização ficam pendentes — não inventamos vagas."
                : "Pesquisa única em IEFP Online, ITJobs, Net-Empregos e Auxiliar de Vagas. Fontes sem autorização ficam pendentes — não inventamos vagas."
          }
        />
      </div>
    </Shell>
  );
}
