import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { createAlert } from "@/lib/server/account";
import { jobCountLabel } from "@/lib/i18n";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import type { PlaceCount } from "@/lib/types";
import { toast } from "sonner";

export function LocationCrumbs({
  country,
  region,
  city,
}: {
  country?: { name: string; slug: string } | null;
  region?: { name: string; slug: string } | null;
  city?: { name: string; slug: string } | null;
}) {
  return (
    <nav aria-label="Percurso" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted">
      <Link to="/" className="hover:text-fg">
        Início
      </Link>
      {country ? (
        <>
          <ChevronRight className="size-3.5 shrink-0" aria-hidden />
          {region ? (
            <Link to="/vagas/$country" params={{ country: country.slug }} search={{}} className="hover:text-fg">
              {country.name}
            </Link>
          ) : (
            <span className="font-medium text-fg">{country.name}</span>
          )}
        </>
      ) : null}
      {country && region ? (
        <>
          <ChevronRight className="size-3.5 shrink-0" aria-hidden />
          {city ? (
            <Link
              to="/vagas/$country/$region"
              params={{ country: country.slug, region: region.slug }}
              search={{}}
              className="hover:text-fg"
            >
              {region.name}
            </Link>
          ) : (
            <span className="font-medium text-fg">{region.name}</span>
          )}
        </>
      ) : null}
      {country && region && city ? (
        <>
          <ChevronRight className="size-3.5 shrink-0" aria-hidden />
          <span className="font-medium text-fg">{city.name}</span>
        </>
      ) : null}
    </nav>
  );
}

export function ActivateAlertButton({
  countryId,
  regionId,
  label = "Ativar alerta de vagas",
}: {
  countryId?: number | null;
  regionId?: number | null;
  label?: string;
}) {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function activate() {
    if (!user) {
      navigate({ to: "/register" });
      return;
    }
    setBusy(true);
    try {
      await createAlert({
        data: { countryId: countryId ?? null, regionId: regionId ?? null, frequency: "weekly" },
      });
      toast.success("Alerta activado. Avisamos quando surgirem oportunidades.");
    } catch {
      toast.error("Não foi possível activar o alerta.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button onClick={() => void activate()} disabled={busy}>
      {label}
    </Button>
  );
}

export function LocationBrowse({
  items,
  searchPlaceholder = "Procurar localização…",
  emptyTitle = "Ainda não encontramos vagas disponíveis neste país.",
  emptyHint = "Assim que surgirem oportunidades, pode ser notificado.",
  allLabel,
  allTo,
  allParams,
  onPick,
  countryId,
  regionId,
  compact,
}: {
  items: PlaceCount[] | null;
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyHint?: string;
  allLabel?: string;
  allTo?: "/vagas/$country" | "/vagas/$country/$region" | "/vagas";
  allParams?: { country: string; region?: string };
  onPick?: (item: PlaceCount) => void;
  countryId?: number | null;
  regionId?: number | null;
  compact?: boolean;
}) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"count" | "alpha">("count");

  const filtered = useMemo(() => {
    const list = items ?? [];
    const needle = q.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const matched = needle
      ? list.filter((p) =>
          p.name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .includes(needle),
        )
      : list.slice();
    matched.sort((a, b) =>
      sort === "alpha" ? a.name.localeCompare(b.name, "pt") : b.count - a.count || a.name.localeCompare(b.name, "pt"),
    );
    return matched;
  }, [items, q, sort]);

  if (items == null) {
    return (
      <div>
        <div className="h-16 animate-pulse border-b border-border" />
        <div className="h-16 animate-pulse border-b border-border" />
        <div className="h-16 animate-pulse border-b border-border" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="border-t border-border py-10">
        <p className="font-display text-xl">{emptyTitle}</p>
        <p className="mt-1 text-sm text-muted">{emptyHint}</p>
        <div className="mt-4">
          <ActivateAlertButton countryId={countryId} regionId={regionId} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
            aria-label={searchPlaceholder}
          />
        </div>
        <div className="sm:w-52">
          <Select value={sort} onChange={(e) => setSort(e.target.value as "count" | "alpha")} aria-label="Ordenar por">
            <option value="count">Mais vagas</option>
            <option value="alpha">Ordem alfabética</option>
          </Select>
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="border-t border-border py-8 text-sm text-muted">Nenhuma localização corresponde a “{q}”.</p>
      ) : (
        <div className={compact ? "" : "sm:columns-2 sm:gap-x-10"}>
          {filtered.map((item) => (
            <LocationRow key={item.id} item={item} onPick={onPick} compact={compact} />
          ))}
        </div>
      )}
      {allLabel && allTo ? (
        <div className="mt-4">
          {allTo === "/vagas/$country" && allParams ? (
            <Link
              to="/vagas/$country"
              params={{ country: allParams.country }}
              search={{}}
              hash="todas"
              className="inline-flex h-11 w-full items-center justify-center rounded-full border border-border bg-surface px-4 text-sm font-medium sm:w-auto"
            >
              {allLabel}
            </Link>
          ) : allTo === "/vagas/$country/$region" && allParams?.region ? (
            <Link
              to="/vagas/$country/$region"
              params={{ country: allParams.country, region: allParams.region }}
              search={{}}
              className="inline-flex h-11 w-full items-center justify-center rounded-full border border-border bg-surface px-4 text-sm font-medium sm:w-auto"
            >
              {allLabel}
            </Link>
          ) : (
            <Link
              to="/vagas"
              className="inline-flex h-11 w-full items-center justify-center rounded-full border border-border bg-surface px-4 text-sm font-medium sm:w-auto"
            >
              {allLabel}
            </Link>
          )}
        </div>
      ) : null}
    </div>
  );
}

function LocationRow({
  item,
  onPick,
  compact,
}: {
  item: PlaceCount;
  onPick?: (item: PlaceCount) => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick?.(item)}
      className={`flex w-full items-center justify-between gap-3 border-b border-border text-left ${
        compact ? "min-h-14 py-3" : "min-h-16 py-4"
      }`}
    >
      <span className="min-w-0">
        <span className="block truncate font-display text-lg">{item.name}</span>
        <span className="text-sm text-muted">{jobCountLabel(item.count)}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
    </button>
  );
}
