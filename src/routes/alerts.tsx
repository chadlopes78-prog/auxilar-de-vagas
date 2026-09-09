import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { AuthSplash } from "@/components/require-auth";
import { Shell } from "@/components/site-header";
import { DashShell, DashPage } from "@/components/dash-nav";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { useProfile } from "@/hooks/use-profile";
import { useGeo } from "@/hooks/use-geo";
import { createAlert, listAlerts } from "@/lib/server/account";
import type { JobAlertRow } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/alerts")({
  head: () => ({ meta: [{ title: "Alertas de vagas | Auxilar de Vagas" }] }),
  component: Alerts,
});

function Alerts() {
  const { profile, loading, user, isPending } = useProfile();
  const geo = useGeo();
  const [keyword, setKeyword] = useState("");
  const [cityId, setCityId] = useState(profile?.cityId ?? 1);
  const [frequency, setFrequency] = useState("weekly");
  const [rows, setRows] = useState<JobAlertRow[]>([]);

  useEffect(() => {
    if (!user) return;
    listAlerts()
      .then(setRows)
      .catch(() => setRows([]));
  }, [user]);

  if (isPending) return <AuthSplash />;
  if (!user) return <RedirectToSignIn />;
  if (loading) return <AuthSplash />;

  return (
    <Shell>
      <DashShell profile={profile} active="/alerts">
        <DashPage title="Alertas de vagas" subtitle="Receba avisos quando surgirem oportunidades na sua localização.">
        <div className="dash-card space-y-3 p-5">
          <div>
            <Label>Palavra-chave</Label>
            <Input placeholder="Contabilista" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </div>
          <div>
            <Label>Cidade</Label>
            <Select value={String(cityId)} onChange={(e) => setCityId(Number(e.target.value))}>
              {geo.cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Frequência</Label>
            <Select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
              <option value="daily">Diário</option>
              <option value="weekly">Semanal</option>
            </Select>
          </div>
          <Button
            onClick={async () => {
              await createAlert({ data: { keyword, cityId, frequency } });
              toast.success("Alerta criado");
              setRows(await listAlerts());
            }}
          >
            Criar alerta
          </Button>
        </div>
        <div className="mt-4 space-y-2">
          {rows.map((a) => (
            <div key={a.id} className="dash-card p-4 text-sm">
              {a.keyword || "Qualquer cargo"} ·{" "}
              {a.cityName ?? a.regionName ?? a.countryName ?? "Qualquer localização"} ·{" "}
              {a.frequency === "daily" ? "Diário" : "Semanal"}
            </div>
          ))}
        </div>
        </DashPage>
      </DashShell>
    </Shell>
  );
}
