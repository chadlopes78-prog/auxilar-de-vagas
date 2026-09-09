import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Shell } from "@/components/site-header";
import { JobsListing, parseJobSearch } from "@/components/jobs-listing";
import { LocationBrowse, LocationCrumbs } from "@/components/location-browse";
import { usePlacesWithJobs } from "@/hooks/use-places";
import { useLocationStore } from "@/store/location";
import type { PlaceCount } from "@/lib/types";

export const Route = createFileRoute("/vagas/")({
  validateSearch: parseJobSearch,
  head: () => ({
    meta: [
      { title: "Procurar vagas | Auxilar de Vagas" },
      {
        name: "description",
        content: "Pesquise vagas de emprego em Moçambique, Angola e Portugal num só lugar.",
      },
    ],
  }),
  component: VagasIndex,
});

function VagasIndex() {
  const navigate = useNavigate();
  const loc = useLocationStore();
  const countries = usePlacesWithJobs();

  function pickCountry(item: PlaceCount) {
    loc.setLocation({ countryId: item.id, regionId: 0, cityId: 0, confirmed: true });
    navigate({ to: "/vagas/$country", params: { country: item.slug }, search: {} });
  }

  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <LocationCrumbs />
        <h2 className="mb-1 text-2xl">Encontre vagas por localização</h2>
        <p className="mb-4 text-sm text-muted">Países com vagas activas neste momento.</p>
        <LocationBrowse
          items={countries}
          searchPlaceholder="Pesquisar país"
          emptyTitle="Ainda não encontramos vagas disponíveis."
          onPick={pickCountry}
        />
      </div>
      <JobsListing heading="Procurar vagas" subheading="Resultados ordenados pela sua localização." />
    </Shell>
  );
}
