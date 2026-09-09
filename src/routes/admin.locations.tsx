import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { AuthSplash } from "@/components/require-auth";
import { Shell } from "@/components/site-header";
import { DashShell, DashPage } from "@/components/dash-nav";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { useProfile } from "@/hooks/use-profile";
import { useGeo } from "@/hooks/use-geo";
import { adminAddLocation } from "@/lib/server/admin";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/locations")({ component: Locs });

function Locs() {
  const { profile, loading, user, isPending } = useProfile();
  const geo = useGeo();
  const [kind, setKind] = useState<"country" | "region" | "city" | "category">("city");
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState(1);
  if (isPending) return <AuthSplash />;
  if (!user) return <RedirectToSignIn />;
  if (loading) return <AuthSplash />;
  return (
    <Shell>
      <DashShell profile={profile} active="/admin/locations">
        <DashPage title="Localizações e categorias">
        <div className="mt-4 space-y-3 dash-card p-5">
          <Select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            <option value="country">País</option>
            <option value="region">Província / distrito</option>
            <option value="city">Cidade / município / concelho</option>
            <option value="category">Categoria</option>
          </Select>
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {kind === "region" ? (
            <Select value={String(parentId)} onChange={(e) => setParentId(Number(e.target.value))}>
              {geo.countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          ) : null}
          {kind === "city" ? (
            <Select value={String(parentId)} onChange={(e) => setParentId(Number(e.target.value))}>
              {geo.regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          ) : null}
          <Button
            onClick={async () => {
              await adminAddLocation({ data: { kind, name, parentId } });
              toast.success("Adicionado");
              setName("");
            }}
          >
            Adicionar
          </Button>
        </div>
        <div className="mt-6 text-sm text-muted">
          {geo.countries.length} países · {geo.regions.length} regiões · {geo.cities.length} cidades ·{" "}
          {geo.categories.length} categorias
        </div>
        </DashPage>
      </DashShell>
    </Shell>
  );
}
