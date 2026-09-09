import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { Bookmark, Briefcase, FileText, MapPin, Search, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { AuthSplash } from "@/components/require-auth";
import { Shell } from "@/components/site-header";
import { DashShell, StatCard } from "@/components/dash-nav";
import { JobCardView } from "@/components/job-card";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/use-profile";
import { listMyApplications, listSavedJobs, toggleSaveJob } from "@/lib/server/account";
import { searchJobs } from "@/lib/server/jobs";
import type { JobCard } from "@/lib/types";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Painel | Auxilar de Vagas" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { profile, loading, user, isPending } = useProfile();
  const [apps, setApps] = useState(0);
  const [saved, setSaved] = useState(0);
  const [jobs, setJobs] = useState<JobCard[]>([]);

  useEffect(() => {
    if (!user) return;
    listMyApplications()
      .then((r) => setApps(r.length))
      .catch(() => setApps(0));
    listSavedJobs()
      .then((r) => setSaved(r.length))
      .catch(() => setSaved(0));
    searchJobs({
      data: {
        cityId: profile?.cityId ?? 1,
        regionId: profile?.regionId ?? 1,
        countryId: profile?.countryId ?? 1,
        categoryId: profile?.interests[0] ?? null,
        sort: "relevant",
      },
    })
      .then((r) => setJobs(r.jobs.slice(0, 4)))
      .catch(() => setJobs([]));
  }, [user, profile?.cityId]);

  if (isPending) return <AuthSplash />;
  if (!user) return <RedirectToSignIn />;
  if (loading) return <AuthSplash />;
  if (profile?.role === "employer") return <Navigate to="/employer" />;
  if (profile?.role === "admin") return <Navigate to="/admin" />;

  const first = profile?.fullName?.split(" ")[0];
  const complete = profile?.completeness ?? 20;
  const place = [profile?.cityName, profile?.regionName, profile?.countryName].filter(Boolean).join(", ");

  return (
    <Shell>
      <DashShell profile={profile} active="/dashboard">
        <section className="dash-hero p-5 md:p-8">
          <p className="text-sm text-primary-fg/70">O seu painel</p>
          <h1 className="mt-1 text-2xl text-primary-fg sm:text-3xl md:text-4xl">Olá{first ? `, ${first}` : ""}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-primary-fg/80">
            <MapPin className="size-4" />
            {place || "Escolha a localização para ver vagas perto de si"}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/vagas">
              <Button className="bg-surface text-fg hover:bg-bg">
                <Search className="size-4" />
                Procurar vagas
              </Button>
            </Link>
            <Link to="/cv">
              <Button variant="outline" className="border-primary-fg/20 bg-transparent text-primary-fg hover:bg-primary-hover">
                Completar o CV
              </Button>
            </Link>
          </div>
        </section>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard value={apps} label="Candidaturas" icon={Briefcase} to="/applications" />
          <StatCard value={saved} label="Vagas guardadas" icon={Bookmark} to="/saved" />
          <StatCard value={`${complete}%`} label="Perfil completo" icon={UserRound} to="/cv" />
          <StatCard value={jobs.length} label="Recomendadas" icon={FileText} />
        </div>

        <div className="dash-card mt-5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl">Complete o seu perfil</h2>
              <p className="mt-1 text-sm text-muted">
                O perfil está {complete}% completo. Quanto mais completo, mais fácil é candidatar-se.
              </p>
            </div>
            <Link to="/cv">
              <Button variant="outline">Editar CV</Button>
            </Link>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-primary" style={{ width: `${complete}%` }} />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl">Recomendadas para si</h2>
            <p className="text-sm text-muted">
              Com base em {profile?.cityName ?? "a sua localização"}, nas suas categorias e na experiência.
            </p>
          </div>
          <Link to="/vagas" className="text-sm font-medium text-primary">
            Ver todas
          </Link>
        </div>
        <div className="mt-3 space-y-3">
          {jobs.length === 0 ? (
            <p className="text-sm text-muted">Ainda não há vagas recomendadas nesta localização.</p>
          ) : (
            jobs.map((j) => (
              <JobCardView key={j.id} job={j} onSave={(id) => toggleSaveJob({ data: id })} />
            ))
          )}
        </div>
      </DashShell>
    </Shell>
  );
}
