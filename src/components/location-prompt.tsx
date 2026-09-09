import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocationBrowse } from "@/components/location-browse";
import { useGeo } from "@/hooks/use-geo";
import { usePlacesWithJobs } from "@/hooks/use-places";
import { useLocationStore } from "@/store/location";
import { updateProfile } from "@/lib/server/account";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { COUNTRY_META, countrySlug, regionLabel } from "@/lib/i18n";
import type { PlaceCount } from "@/lib/types";

const PRIMARY = ["MZ", "AO", "PT"] as const;

export function LocationPrompt() {
  const geo = useGeo();
  const loc = useLocationStore();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const pathname = useLocation({ select: (l) => l.pathname });
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [countryId, setCountryId] = useState(loc.countryId || 1);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setCountryId(loc.countryId || 1);
  }, [loc.countryId]);

  const country =
    geo.countries.find((c) => c.id === countryId) ??
    geo.countries.find((c) => COUNTRY_META[c.code]?.id === countryId);
  const countryCode =
    country?.code ??
    (Object.keys(COUNTRY_META).find((code) => COUNTRY_META[code].id === countryId) as
      | keyof typeof COUNTRY_META
      | undefined);
  const places = usePlacesWithJobs(step === 2 ? countryId : null);
  const countryName = country?.name ?? (countryCode ? COUNTRY_META[countryCode].name : "o país");
  const slug = country?.slug ?? (countryCode ? countrySlug(countryCode) : "mocambique");
  const noun = regionLabel(countryCode);

  if (
    !mounted ||
    loc.confirmed ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/criar-conta") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password")
  ) {
    return null;
  }

  function pickCountry(id: number) {
    setCountryId(id);
    setStep(2);
  }

  async function persist(next: { countryId: number; regionId: number; cityId: number }) {
    loc.setLocation({ ...next, confirmed: true });
    if (user) {
      try {
        await updateProfile({
          data: {
            countryId: next.countryId,
            regionId: next.regionId || null,
            cityId: next.cityId || null,
          },
        });
      } catch {
        /* guest */
      }
    }
  }

  async function pickRegion(item: PlaceCount) {
    const firstCity = geo.cities.find((c) => c.regionId === item.id);
    await persist({ countryId, regionId: item.id, cityId: firstCity?.id ?? 0 });
    navigate({ to: "/vagas/$country/$region", params: { country: slug, region: item.slug }, search: {} });
  }

  async function seeAll() {
    await persist({ countryId, regionId: 0, cityId: 0 });
    navigate({ to: "/vagas/$country", params: { country: slug }, search: {} });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-fg/40 p-4">
      <div
        className={`w-full rounded-2xl bg-surface p-6 shadow-[0_16px_40px_rgba(20,34,28,0.18)] ${
          step === 1 ? "max-w-md" : "max-w-2xl"
        }`}
      >
        <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <MapPin className="size-5" />
        </div>
        {step === 1 ? (
          <>
            <h2 className="text-2xl">Em que país procura emprego?</h2>
            <p className="mt-1 text-sm text-muted">
              Escolha o país. Depois mostramos apenas as regiões com vagas activas.
            </p>
            <div className="mt-5 grid gap-2">
              {PRIMARY.map((code) => {
                const meta = COUNTRY_META[code];
                const c = geo.countries.find((x) => x.code === code);
                const id = c?.id ?? meta.id;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => pickCountry(id)}
                    className="flex min-h-14 items-center gap-3 rounded-xl border border-border px-4 py-3 text-left hover:border-primary hover:bg-primary-soft"
                  >
                    <span className="text-2xl" aria-hidden>
                      {meta.flag}
                    </span>
                    <span>
                      <span className="block font-semibold">{meta.name}</span>
                      <span className="text-xs text-muted">{meta.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl">Escolha onde procura emprego</h2>
            <p className="mt-1 text-sm text-muted">
              {countryCode === "PT" ? "Distritos e regiões" : `${noun}s`} com vagas disponíveis em {countryName}.
            </p>
            <div className="mt-4 max-h-[60vh] overflow-y-auto pr-1">
              <LocationBrowse
                items={places}
                searchPlaceholder={`Pesquisar ${noun.toLowerCase()} ou região`}
                emptyTitle="Ainda não encontramos vagas disponíveis neste país."
                countryId={countryId}
                compact
                onPick={(item) => void pickRegion(item)}
              />
            </div>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button className="flex-1" size="lg" onClick={() => void seeAll()}>
                Ver todas as vagas em {countryName}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
