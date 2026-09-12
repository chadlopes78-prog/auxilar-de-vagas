import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Shell } from "@/components/site-header";
import { JobsListing, parseJobSearch } from "@/components/jobs-listing";
import { LocationBrowse, LocationCrumbs } from "@/components/location-browse";
import {
  cityLabel,
  displayPlace,
  regionMatchesSlug,
  slugToCountryCode,
  slugToCountryName,
  titleCaseSlug,
} from "@/lib/i18n";
import { useGeo } from "@/hooks/use-geo";
import { usePlacesWithJobs } from "@/hooks/use-places";
import { useLocationStore } from "@/store/location";
import type { PlaceCount } from "@/lib/types";

export const Route = createFileRoute("/vagas/$country/$region/")({
  validateSearch: parseJobSearch,
  head: ({ params }) => {
    const country = slugToCountryName(params.country);
    const region = titleCaseSlug(params.region);
    return {
      meta: [
        { title: `Vagas em ${region}, ${country} | Auxiliar de Vagas` },
        {
          name: "description",
          content: `Vagas de emprego em ${region}, ${country}. Pesquise por cargo, cidade e tipo de contrato.`,
        },
      ],
    };
  },
  component: RegionJobs,
});

function RegionJobs() {
  const { country: countrySlugParam, region: regionSlug } = Route.useParams();
  const navigate = useNavigate();
  const geo = useGeo();
  const loc = useLocationStore();
  const code = slugToCountryCode(countrySlugParam);
  const country = geo.countries.find((c) => c.code === code || c.slug === countrySlugParam);
  const region =
    geo.regions.find(
      (r) =>
        (!country || r.countryId === country.id) &&
        (r.slug === regionSlug || regionMatchesSlug(r.name, regionSlug)),
    ) ?? geo.regions.find((r) => r.slug === regionSlug || regionMatchesSlug(r.name, regionSlug));
  const countryName = country?.name ?? slugToCountryName(countrySlugParam);
  const regionName = displayPlace(region?.name ?? titleCaseSlug(regionSlug));
  const places = usePlacesWithJobs(country?.id ?? null, region?.id ?? null);
  const noun = cityLabel(code);

  function pick(item: PlaceCount) {
    loc.setLocation({
      countryId: country?.id ?? loc.countryId,
      regionId: region?.id ?? loc.regionId,
      cityId: item.id,
      confirmed: true,
    });
    navigate({
      to: "/vagas/$country/$region/$city",
      params: { country: countrySlugParam, region: regionSlug, city: item.slug },
      search: {},
    });
  }

  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <LocationCrumbs
          country={{ name: countryName, slug: country?.slug ?? countrySlugParam }}
          region={{ name: regionName, slug: region?.slug ?? regionSlug }}
        />
        <h1 className="text-3xl">
          Vagas em {regionName}, {countryName}
        </h1>
        <p className="mt-1 mb-5 text-sm text-muted">
          {noun}s com vagas disponíveis em {regionName}. Só mostramos locais com oportunidades activas.
        </p>
        {places && places.length > 0 ? (
          <div className="mb-8">
            <LocationBrowse
              items={places}
              searchPlaceholder={`Pesquisar ${noun.toLowerCase()}`}
              emptyTitle="Ainda não encontramos vagas disponíveis nesta região."
              onPick={pick}
              countryId={country?.id ?? null}
              regionId={region?.id ?? null}
            />
          </div>
        ) : places && places.length === 0 ? (
          <div className="mb-8">
            <LocationBrowse
              items={places}
              emptyTitle="Ainda não encontramos vagas disponíveis nesta região."
              countryId={country?.id ?? null}
              regionId={region?.id ?? null}
            />
          </div>
        ) : (
          <div className="mb-8">
            <LocationBrowse items={null} />
          </div>
        )}
      </div>
      <JobsListing
        lockedCountryId={country?.id ?? null}
        lockedRegionId={region?.id ?? null}
        strictLocation
        subheading={`A mostrar apenas oportunidades em ${regionName}.`}
      />
    </Shell>
  );
}
