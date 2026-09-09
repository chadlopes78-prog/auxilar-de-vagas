import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import {
  countrySlug,
  localizeCategoryName,
  localizeCityName,
  localizeRegionName,
  regionToSlug,
  cityToSlug,
} from "@/lib/i18n";
import { isGarbagePlaceName } from "@/lib/server/connectors/rss";
import type { Category, City, Country, GeoBundle, Region } from "@/lib/types";

export const getGeo = createServerFn({ method: "GET" }).handler(
  async (): Promise<GeoBundle> => {
    const { ensureAggregatorReady } = await import("@/lib/server/ingest");
    await ensureAggregatorReady();
    const sql = await getSql();
    const countryRows = await sql<{ id: number; code: string; name: string; currency: string }>`
      select id, code, name, currency from countries
    `;
    const countries: Country[] = countryRows
      .filter((c) => c.code === "MZ" || c.code === "AO" || c.code === "PT")
      .map((c) => ({
        id: c.id,
        code: c.code,
        name: c.code === "MZ" ? "Moçambique" : c.code === "AO" ? "Angola" : c.code === "PT" ? "Portugal" : c.name,
        currency: c.currency,
        slug: countrySlug(c.code),
      }))
      .sort((a, b) => {
        const order: Record<string, number> = { MZ: 1, AO: 2, PT: 3 };
        return (order[a.code] ?? 9) - (order[b.code] ?? 9);
      });
    const countryIds = countries.map((c) => c.id);
    const regionRows = await sql<{ id: number; country_id: number; name: string }>`
      select id, country_id, name from regions
    `;
    const regions: Region[] = regionRows
      .filter((r) => countryIds.includes(r.country_id) && !isGarbagePlaceName(r.name))
      .map((r) => {
        const name = localizeRegionName(r.name);
        return {
          id: r.id,
          countryId: r.country_id,
          name,
          slug: regionToSlug(name),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt"));
    const regionIds = regions.map((r) => r.id);
    const cityRows = await sql<{ id: number; region_id: number; name: string }>`
      select id, region_id, name from cities
    `;
    const cities: City[] = cityRows
      .filter((c) => regionIds.includes(c.region_id) && !isGarbagePlaceName(c.name))
      .map((c) => {
        const name = localizeCityName(c.name);
        return {
          id: c.id,
          regionId: c.region_id,
          name,
          slug: cityToSlug(name),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt"));
    const categories = await sql<
      { id: number; slug: string; name: string; icon: string; job_count: number }
    >`
      select c.id, c.slug, c.name, c.icon,
        coalesce((select count(*) from jobs j where j.category_id = c.id and j.status = 'published' and (j.deadline is null or j.deadline >= current_date)), 0)::int as job_count
      from categories c
      order by c.name
    `;
    return {
      countries,
      regions,
      cities,
      categories: categories
        .map((c) => ({
          id: c.id,
          slug: c.slug,
          name: localizeCategoryName(c.slug, c.name),
          icon: c.icon,
          jobCount: Number(c.job_count),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "pt")),
    };
  },
);
