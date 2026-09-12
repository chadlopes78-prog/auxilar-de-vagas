import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { AuthSplash } from "@/components/require-auth";
import { Shell } from "@/components/site-header";
import { DashShell, DashPage } from "@/components/dash-nav";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { useProfile } from "@/hooks/use-profile";
import { useGeo } from "@/hooks/use-geo";
import { updateProfile } from "@/lib/server/account";
import {
  addCertification,
  addDocument,
  addEducation,
  addExperience,
  addLanguage,
  getCandidateBundle,
  removeCertification,
  removeDocument,
  removeEducation,
  removeExperience,
  removeLanguage,
  setPrimaryDocument,
  setSkills,
} from "@/lib/server/candidate";
import type { CandidateBundle } from "@/lib/types";
import { cityLabel, countryFlag, regionLabel } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/cv")({
  head: () => ({ meta: [{ title: "O meu CV | Auxiliar de Vagas" }] }),
  component: CV,
});

function CV() {
  const { profile, loading, user, isPending, setProfile } = useProfile();
  const geo = useGeo();
  const [bundle, setBundle] = useState<CandidateBundle | null>(null);
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [about, setAbout] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [cover, setCover] = useState("");
  const [salary, setSalary] = useState("");
  const [availability, setAvailability] = useState("");
  const [skillDraft, setSkillDraft] = useState("");
  const [exp, setExp] = useState({ title: "", company: "", period: "", description: "" });
  const [edu, setEdu] = useState({ school: "", degree: "", period: "" });
  const [lang, setLang] = useState({ name: "", level: "Conversação" });
  const [cert, setCert] = useState({ name: "", issuer: "", year: "" });

  useEffect(() => {
    if (!user) return;
    getCandidateBundle()
      .then(setBundle)
      .catch(() =>
        setBundle({ experiences: [], education: [], skills: [], languages: [], certifications: [], documents: [] }),
      );
  }, [user]);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.fullName ?? "");
    setTitle(profile.title ?? profile.desiredRole ?? "");
    setAbout(profile.about ?? "");
    setPhone(profile.phone ?? "");
    setLinkedin(profile.linkedin ?? "");
    setPortfolio(profile.portfolio ?? "");
    setCover(profile.defaultCoverLetter ?? "");
    setSalary(profile.salaryExpectation ?? "");
    setAvailability(profile.availability ?? "");
  }, [profile]);

  if (isPending) return <AuthSplash />;
  if (!user) return <RedirectToSignIn />;
  if (loading) return <AuthSplash />;

  async function saveBasics() {
    const p = await updateProfile({
      data: {
        fullName,
        title,
        desiredRole: title,
        about,
        phone,
        linkedin,
        portfolio,
        defaultCoverLetter: cover,
        salaryExpectation: salary,
        availability,
      },
    });
    setProfile(p);
    toast.success("Perfil guardado");
  }

  async function refresh() {
    setBundle(await getCandidateBundle());
    const p = await updateProfile({ data: {} });
    setProfile(p);
  }

  const country = geo.countries.find((c) => c.id === profile?.countryId);

  return (
    <Shell>
      <DashShell profile={profile} active="/cv">
        <DashPage
          title="Perfil profissional"
          subtitle="Preencha uma vez. Estes dados são reutilizados em todas as candidaturas."
        >
        <p className="text-sm text-muted">O seu perfil está {profile?.completeness ?? 20}% completo.</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-primary" style={{ width: `${profile?.completeness ?? 20}%` }} />
        </div>

        <Card title="Dados pessoais">
          <Field label="Nome completo">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="Fotografia">
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 200_000) {
                  toast.error("Use uma imagem até 200 KB.");
                  return;
                }
                const url = await fileToDataUrl(file);
                const p = await updateProfile({ data: { avatarUrl: url } });
                setProfile(p);
                toast.success("Fotografia actualizada");
              }}
            />
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="mt-2 size-16 rounded-xl object-cover" />
            ) : null}
          </Field>
          <Field label="Telefone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="E-mail">
            <Input defaultValue={profile?.email ?? user.primaryEmail ?? ""} disabled />
          </Field>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="País">
              <Input value={profile?.countryName ?? ""} disabled />
            </Field>
            <Field label={regionLabel(country?.code)}>
              <Input value={profile?.regionName ?? ""} disabled />
            </Field>
            <Field label={cityLabel(country?.code)}>
              <Input value={profile?.cityName ?? ""} disabled />
            </Field>
          </div>
          <p className="text-xs text-muted">
            {countryFlag(country?.code)} A localização altera-se no seletor do cabeçalho ou nas definições.
          </p>
        </Card>

        <Card title="Perfil">
          <Field label="Cargo pretendido">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Resumo profissional">
            <Textarea rows={4} value={about} onChange={(e) => setAbout(e.target.value)} />
          </Field>
          <Field label="LinkedIn">
            <Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
          </Field>
          <Field label="Portefólio">
            <Input value={portfolio} onChange={(e) => setPortfolio(e.target.value)} />
          </Field>
          <Field label="Pretensão salarial">
            <Input value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="Ex.: 45.000 MZN" />
          </Field>
          <Field label="Disponibilidade">
            <Select value={availability} onChange={(e) => setAvailability(e.target.value)}>
              <option value="">Selecionar</option>
              <option value="Imediata">Imediata</option>
              <option value="2 semanas">2 semanas</option>
              <option value="1 mês">1 mês</option>
              <option value="A combinar">A combinar</option>
            </Select>
          </Field>
          <Button onClick={() => void saveBasics()}>Guardar dados</Button>
        </Card>

        <Card title="Experiência profissional">
          <div className="space-y-2">
            {bundle?.experiences.map((row) => (
              <Line
                key={row.id}
                title={`${row.title} · ${row.company}`}
                sub={row.period}
                onRemove={() => removeExperience({ data: row.id }).then(setBundle)}
              />
            ))}
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <Input placeholder="Cargo" value={exp.title} onChange={(e) => setExp({ ...exp, title: e.target.value })} />
            <Input placeholder="Empresa" value={exp.company} onChange={(e) => setExp({ ...exp, company: e.target.value })} />
            <Input placeholder="Período" value={exp.period} onChange={(e) => setExp({ ...exp, period: e.target.value })} />
            <Input
              placeholder="Descrição"
              value={exp.description}
              onChange={(e) => setExp({ ...exp, description: e.target.value })}
            />
          </div>
          <Button
            className="mt-2"
            variant="outline"
            onClick={async () => {
              if (!exp.title || !exp.company) return;
              setBundle(await addExperience({ data: exp }));
              setExp({ title: "", company: "", period: "", description: "" });
              await refresh();
            }}
          >
            Adicionar experiência
          </Button>
        </Card>

        <Card title="Formação académica">
          <div className="space-y-2">
            {bundle?.education.map((row) => (
              <Line
                key={row.id}
                title={`${row.degree || row.school}`}
                sub={[row.school, row.period].filter(Boolean).join(" · ")}
                onRemove={() => removeEducation({ data: row.id }).then(setBundle)}
              />
            ))}
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <Input placeholder="Escola / universidade" value={edu.school} onChange={(e) => setEdu({ ...edu, school: e.target.value })} />
            <Input placeholder="Grau / curso" value={edu.degree} onChange={(e) => setEdu({ ...edu, degree: e.target.value })} />
            <Input placeholder="Período" value={edu.period} onChange={(e) => setEdu({ ...edu, period: e.target.value })} />
          </div>
          <Button
            className="mt-2"
            variant="outline"
            onClick={async () => {
              if (!edu.school) return;
              setBundle(await addEducation({ data: edu }));
              setEdu({ school: "", degree: "", period: "" });
              await refresh();
            }}
          >
            Adicionar formação
          </Button>
        </Card>

        <Card title="Competências">
          <div className="flex flex-wrap gap-1.5">
            {bundle?.skills.map((s) => (
              <span key={s} className="rounded-full bg-primary-soft px-2 py-1 text-xs text-primary">
                {s}
              </span>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              placeholder="Ex.: Excel, Vendas"
              value={skillDraft}
              onChange={(e) => setSkillDraft(e.target.value)}
            />
            <Button
              variant="outline"
              onClick={async () => {
                const next = [...(bundle?.skills ?? [])];
                for (const part of skillDraft.split(/[,;]+/)) {
                  const n = part.trim();
                  if (n && !next.includes(n)) next.push(n);
                }
                setBundle(await setSkills({ data: next }));
                setSkillDraft("");
                await refresh();
              }}
            >
              Adicionar
            </Button>
          </div>
        </Card>

        <Card title="Idiomas">
          {bundle?.languages.map((row) => (
            <Line
              key={row.id}
              title={row.name}
              sub={row.level}
              onRemove={() => removeLanguage({ data: row.id }).then(setBundle)}
            />
          ))}
          <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
            <Input placeholder="Idioma" value={lang.name} onChange={(e) => setLang({ ...lang, name: e.target.value })} />
            <Select value={lang.level} onChange={(e) => setLang({ ...lang, level: e.target.value })}>
              <option>Nativo</option>
              <option>Fluente</option>
              <option>Conversação</option>
              <option>Básico</option>
            </Select>
            <Button
              variant="outline"
              onClick={async () => {
                if (!lang.name) return;
                setBundle(await addLanguage({ data: lang }));
                setLang({ name: "", level: "Conversação" });
                await refresh();
              }}
            >
              Adicionar
            </Button>
          </div>
        </Card>

        <Card title="Certificações">
          {bundle?.certifications.map((row) => (
            <Line
              key={row.id}
              title={row.name}
              sub={[row.issuer, row.year].filter(Boolean).join(" · ")}
              onRemove={() => removeCertification({ data: row.id }).then(setBundle)}
            />
          ))}
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <Input placeholder="Nome" value={cert.name} onChange={(e) => setCert({ ...cert, name: e.target.value })} />
            <Input placeholder="Entidade" value={cert.issuer} onChange={(e) => setCert({ ...cert, issuer: e.target.value })} />
            <Input placeholder="Ano" value={cert.year} onChange={(e) => setCert({ ...cert, year: e.target.value })} />
          </div>
          <Button
            className="mt-2"
            variant="outline"
            onClick={async () => {
              if (!cert.name) return;
              setBundle(await addCertification({ data: cert }));
              setCert({ name: "", issuer: "", year: "" });
              await refresh();
            }}
          >
            Adicionar certificação
          </Button>
        </Card>

        <Card title="Carta de apresentação padrão">
          <Textarea rows={5} value={cover} onChange={(e) => setCover(e.target.value)} />
          <Button className="mt-3" onClick={() => void saveBasics()}>
            Guardar carta
          </Button>
        </Card>

        <Card title="CV principal e adicionais">
          <div className="space-y-2">
            {bundle?.documents.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-2 border-b border-border py-3 text-sm">
                <span>
                  {d.fileName} {d.isPrimary ? "· principal" : ""}
                </span>
                <span className="flex gap-2">
                  {!d.isPrimary ? (
                    <button
                      type="button"
                      className="text-primary"
                      onClick={() => setPrimaryDocument({ data: d.id }).then(setBundle)}
                    >
                      Tornar principal
                    </button>
                  ) : null}
                  <button type="button" className="text-danger" onClick={() => removeDocument({ data: d.id }).then(setBundle)}>
                    Remover
                  </button>
                </span>
              </div>
            ))}
          </div>
          <input
            className="mt-3"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const next = await addDocument({
                data: { fileName: file.name, kind: "cv", isPrimary: !bundle?.documents.length },
              });
              setBundle(next);
              await refresh();
              toast.success("CV adicionado ao perfil");
            }}
          />
          <p className="mt-1 text-xs text-muted">PDF / DOC / DOCX. O ficheiro seleccionado fica associado ao perfil.</p>
        </Card>
        </DashPage>
      </DashShell>
    </Shell>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="section-block space-y-3">
      <h2 className="text-2xl">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Line({ title, sub, onRemove }: { title: string; sub?: string | null; onRemove: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border py-3">
      <div>
        <div className="text-sm font-medium">{title}</div>
        {sub ? <div className="text-xs text-muted">{sub}</div> : null}
      </div>
      <button type="button" className="text-xs text-danger" onClick={onRemove}>
        Remover
      </button>
    </div>
  );
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
