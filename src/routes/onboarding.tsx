import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { AuthSplash } from "@/components/require-auth";
import { Shell } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { useProfile } from "@/hooks/use-profile";
import { useGeo } from "@/hooks/use-geo";
import { updateProfile } from "@/lib/server/account";
import { EXPERIENCE } from "@/lib/utils";
import { cityLabel, countryFlag, regionLabel } from "@/lib/i18n";
import { useLocationStore } from "@/store/location";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Configurar perfil | Auxilar de Vagas" }] }),
  component: Onboarding,
});

function Onboarding() {
  const { profile, loading, user, isPending, setProfile } = useProfile();
  const geo = useGeo();
  const loc = useLocationStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [interests, setInterests] = useState<number[]>([]);
  const [exp, setExp] = useState("entry");
  const [cvName, setCvName] = useState("");
  const [countryId, setCountryId] = useState(loc.countryId);
  const [regionId, setRegionId] = useState(loc.regionId);
  const [cityId, setCityId] = useState(loc.cityId);
  const [remote, setRemote] = useState(true);

  if (isPending) return <AuthSplash />;
  if (!user) return <RedirectToSignIn />;
  if (loading) return <AuthSplash />;

  const steps = ["Pessoal", "Título", "Interesses", "Experiência", "CV", "Localização", "Concluir"];
  const country = geo.countries.find((c) => c.id === countryId);

  async function next() {
    if (step === 1) setFullName((n) => n || user?.displayName || "");
    if (step < 7) {
      setStep(step + 1);
      return;
    }
    const updated = await updateProfile({
      data: {
        role: "candidate",
        fullName: fullName || user?.displayName || "",
        phone,
        title,
        interests,
        experienceLevel: exp,
        cvName: cvName || undefined,
        countryId,
        regionId,
        cityId,
        openToRemote: remote,
        onboarded: true,
      },
    });
    setProfile(updated);
    loc.setLocation({ countryId, regionId, cityId, confirmed: true });
    navigate({ to: "/dashboard" });
  }

  return (
    <Shell>
      <div className="mx-auto max-w-lg px-4 py-10">
        <div className="mb-4 flex flex-wrap gap-1">
          {steps.map((s, i) => (
            <span
              key={s}
              className={`rounded-full px-2 py-1 text-xs ${i + 1 === step ? "bg-primary-soft text-primary" : "bg-surface text-muted"}`}
            >
              {i + 1}. {s}
            </span>
          ))}
        </div>
        {step === 1 && (
          <Block title="Informação pessoal">
            <Label>Nome completo</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} defaultValue={profile?.fullName ?? ""} />
            <Label className="mt-3">Telefone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Block>
        )}
        {step === 2 && (
          <Block title="Perfil profissional">
              <>
                <Label>Título profissional</Label>
                <Input placeholder="Representante de vendas" value={title} onChange={(e) => setTitle(e.target.value)} />
              </>
          </Block>
        )}
        {step === 3 && (
          <Block title="Áreas de interesse">
            <div className="grid grid-cols-2 gap-2">
              {geo.categories.map((c) => (
                <label key={c.id} className="flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={interests.includes(c.id)}
                    onChange={() =>
                      setInterests((prev) => (prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id]))
                    }
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </Block>
        )}
        {step === 4 && (
          <Block title="Nível de experiência">
            {EXPERIENCE.map((x) => (
              <label key={x.id} className="flex min-h-11 items-center gap-2 text-sm">
                <input type="radio" name="exp" checked={exp === x.id} onChange={() => setExp(x.id)} />
                {x.label}
              </label>
            ))}
          </Block>
        )}
        {step === 5 && (
          <Block title="Carregar CV">
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setCvName(e.target.files?.[0]?.name ?? "")}
            />
            <p className="mt-2 text-sm text-muted">PDF / DOC / DOCX. {cvName || "Nenhum ficheiro selecionado."}</p>
          </Block>
        )}
        {step === 6 && (
          <Block title="Localização preferida">
            <Label>País</Label>
            <Select
              value={String(countryId)}
              onChange={(e) => {
                const id = Number(e.target.value);
                const r = geo.regions.find((x) => x.countryId === id);
                const c = geo.cities.find((x) => x.regionId === r?.id);
                setCountryId(id);
                setRegionId(r?.id ?? 0);
                setCityId(c?.id ?? 0);
              }}
            >
              {geo.countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {countryFlag(c.code)} {c.name}
                </option>
              ))}
            </Select>
            <Label className="mt-3">{regionLabel(country?.code)}</Label>
            <Select
              value={String(regionId)}
              onChange={(e) => {
                const id = Number(e.target.value);
                const c = geo.cities.find((x) => x.regionId === id);
                setRegionId(id);
                setCityId(c?.id ?? 0);
              }}
            >
              {geo.regions
                .filter((r) => r.countryId === countryId)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </Select>
            <Label className="mt-3">{cityLabel(country?.code)}</Label>
            <Select value={String(cityId)} onChange={(e) => setCityId(Number(e.target.value))}>
              {geo.cities
                .filter((c) => c.regionId === regionId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </Select>
            <label className="mt-3 flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} />
              Oportunidades remotas: {remote ? "SIM" : "NÃO"}
            </label>
          </Block>
        )}
        {step === 7 && (
          <Block title="Concluir perfil">
            <p className="text-sm text-muted">
              Pode continuar a editar mais tarde. As vagas recomendadas usam a sua localização, categorias e
              experiência.
            </p>
          </Block>
        )}
        <Button className="mt-6 w-full" size="lg" onClick={() => void next()}>
          {step === 7 ? "Ir para o painel" : "Continuar"}
        </Button>
      </div>
    </Shell>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <h1 className="mb-4 text-2xl">{title}</h1>
      {children}
    </div>
  );
}
