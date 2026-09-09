import { useEffect, useState } from "react";
import { getGeo } from "@/lib/server/geo";
import type { GeoBundle } from "@/lib/types";

const EMPTY: GeoBundle = { countries: [], regions: [], cities: [], categories: [] };
const PRIMARY = new Set(["MZ", "AO", "PT"]);
let cache: GeoBundle | null = null;

function onlyPrimary(g: GeoBundle): GeoBundle {
  const countries = g.countries.filter((c) => PRIMARY.has(c.code));
  const countryIds = new Set(countries.map((c) => c.id));
  const regions = g.regions.filter((r) => countryIds.has(r.countryId));
  const regionIds = new Set(regions.map((r) => r.id));
  const cities = g.cities.filter((c) => regionIds.has(c.regionId));
  return { countries, regions, cities, categories: g.categories };
}

export function useGeo() {
  const [geo, setGeo] = useState<GeoBundle>(EMPTY);
  useEffect(() => {
    let cancelled = false;
    const apply = (g: GeoBundle) => {
      if (!cancelled) setGeo(g);
    };
    if (cache) {
      apply(cache);
      return () => {
        cancelled = true;
      };
    }
    getGeo()
      .then((g) => {
        cache = onlyPrimary(g);
        apply(cache);
      })
      .catch(() => apply(EMPTY));
    return () => {
      cancelled = true;
    };
  }, []);
  return geo;
}
