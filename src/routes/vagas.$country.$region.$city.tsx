import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Shell } from "@/components/site-header";
import { JobsListing, parseJobSearch } from "@/components/jobs-listing";
import { LocationCrumbs } from "@/components/location-browse";
import {
  cityMatchesSlug,
  displayPlace,
  regionMatchesSlug,
  slugToCountryCode,
  slugToCountryName,
  titleCaseSlug,
} from "@/lib/i18n";
import { useGeo } from "@/hooks/use-geo";
import { useLocationStore } from "@/store/location";

export const Route = createFileRoute("/vagas/$country/$region/$city")({
  validateSearch: parseJobSearch,
  head: ({ params }) => {
    const country = slugToCountryName(params.country);
    const region = titleCaseSlug(params.region);
    const city = titleCaseSlug(params.city);
    return {
      meta: [
        { title: `Vagas em ${city}, ${region} | Auxiliar de Vagas` },
        {
          name: "description",
          content: `Vagas de emprego em ${city}, ${region}, ${country}.`,
        },
      ],
    };
  },
  component: CityJobs,
});

function CityJobs() {
  const { country: countrySlugParam, region: regionSlug, city: citySlug } = Route.useParams();
  const geo = useGeo();
  const loc = useLocationStore();
  const code = slugToCountryCode(countrySlugParam);
  const country = geo.countries.find((c) => c.code === code || c.slug === countrySlugParam);
  const region =
    geo.regions.find(
      (r) =>
        (!country || r.countryId === country.id) &&
        (r.slug === regionSlug || regionMatchesSlug(r.name, regionSlug)),
    ) ?? null;
  const city =
    geo.cities.find(
      (c) =>
        (!region || c.regionId === region.id) && (c.slug === citySlug || cityMatchesSlug(c.name, citySlug)),
    ) ?? null;
  const countryName = country?.name ?? slugToCountryName(countrySlugParam);
  const regionName = displayPlace(region?.name ?? titleCaseSlug(regionSlug));
  const cityName = displayPlace(city?.name ?? titleCaseSlug(citySlug));

  useEffect(() => {
    if (!country && !region && !city) return;
    loc.setLocation({
      countryId: country?.id ?? loc.countryId,
      regionId: region?.id ?? loc.regionId,
      cityId: city?.id ?? loc.cityId,
      confirmed: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country?.id, region?.id, city?.id]);

  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <LocationCrumbs
          country={{ name: countryName, slug: country?.slug ?? countrySlugParam }}
          region={{ name: regionName, slug: region?.slug ?? regionSlug }}
          city={{ name: cityName, slug: city?.slug ?? citySlug }}
        />
      </div>
      <JobsListing
        lockedCountryId={country?.id ?? null}
        lockedRegionId={region?.id ?? null}
        lockedCityId={city?.id ?? null}
        strictLocation
        heading={`Vagas em ${cityName}`}
        subheading={`${cityName}, ${regionName}, ${countryName}`}
      />
    </Shell>
  );
}
