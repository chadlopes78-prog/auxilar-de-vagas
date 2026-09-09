import { useEffect, useState } from "react";
import { listLocationsWithJobs } from "@/lib/server/jobs";
import type { PlaceCount } from "@/lib/types";

export function usePlacesWithJobs(
  countryId?: number | null,
  regionId?: number | null,
  enabled = true,
) {
  const [items, setItems] = useState<PlaceCount[] | null>(enabled ? null : []);
  useEffect(() => {
    if (!enabled) {
      setItems([]);
      return;
    }
    let cancelled = false;
    setItems(null);
    listLocationsWithJobs({ data: { countryId: countryId ?? null, regionId: regionId ?? null } })
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [countryId, regionId, enabled]);
  return items;
}
