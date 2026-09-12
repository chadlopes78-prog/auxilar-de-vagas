import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Briefcase, Building2, FileText, Users } from "lucide-react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { AuthSplash } from "@/components/require-auth";
import { Shell } from "@/components/site-header";
import { DashShell, DashPage, StatCard } from "@/components/dash-nav";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/use-profile";
import { adminListJobs, adminStats, adminUpdateJob, claimAdmin } from "@/lib/server/admin";
import { isOwnerAdminEmail } from "@/lib/brand";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Administração | Auxiliar de Vagas" }] }),
  component: Admin,
});

function Admin() {
  const { profile, loading, user, isPending } = useProfile();
  const [stats, setStats] = useState<{
    users: number;
    candidates: number;
    companies: number;
    jobs: number;
    applications: number;
    publishedToday: number;
  } | null>(null);
  const [jobs, setJobs] = useState<{ id: number; title: string; status: string; featured: boolean; company_name: string }[]>([]);

  async function load() {
    try {
      setStats(await adminStats());
      setJobs(await adminListJobs());
    } catch {
      setStats(null);
    }
  }
  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  if (isPending) return <AuthSplash />;
  if (!user) return <RedirectToSignIn />;
  if (loading) return <AuthSplash />;

  if (profile?.role !== "admin") {
    const canClaim = isOwnerAdminEmail(user.primaryEmail);
    return (
      <Shell>
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-2xl">Acesso de administrador</h1>
          <p className="mt-2 text-sm text-muted">
            {canClaim
              ? "Esta conta está autorizada a gerir a plataforma."
              : "Esta área é reservada ao administrador da plataforma."}
          </p>
          {canClaim ? (
            <Button
              className="mt-4"
              onClick={async () => {
                try {
                  await claimAdmin();
                  window.location.reload();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Negado");
                }
              }}
            >
              Assumir administração
            </Button>
          ) : null}
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <DashShell profile={profile} active="/admin">
        <DashPage title="Administração" subtitle="Visão geral da plataforma e gestão de vagas.">
        {stats ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-6 border-b border-border pb-8 md:grid-cols-3">
            <StatCard value={stats.users} label="Utilizadores" icon={Users} to="/admin/users" />
            <StatCard value={stats.candidates} label="Candidatos" icon={Users} />
            <StatCard value={stats.companies} label="Empresas" icon={Building2} to="/admin/companies" />
            <StatCard value={stats.jobs} label="Vagas activas" icon={Briefcase} to="/admin/jobs" />
            <StatCard value={stats.applications} label="Candidaturas" icon={FileText} />
            <StatCard value={stats.publishedToday} label="Publicadas hoje" icon={Briefcase} />
          </div>
        ) : null}
        <h2 className="mt-8 text-xl">Vagas</h2>
        <div className="mt-3 space-y-2">
          {jobs.length === 0 ? (
            <p className="text-sm text-muted">Ainda não há vagas na base de dados.</p>
          ) : (
            jobs.map((j) => (
              <div key={j.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-4">
                <div>
                  <div className="font-medium">{j.title}</div>
                  <div className="text-xs text-muted">
                    {j.company_name} · {j.status === "published" ? "publicada" : j.status} {j.featured ? "· destaque" : ""}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={async () => { await adminUpdateJob({ data: { id: j.id, action: "feature" } }); void load(); }}>
                    Destaque
                  </Button>
                  <Button size="sm" variant="outline" onClick={async () => { await adminUpdateJob({ data: { id: j.id, action: j.status === "published" ? "unpublish" : "publish" } }); void load(); }}>
                    {j.status === "published" ? "Despublicar" : "Publicar"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={async () => { await adminUpdateJob({ data: { id: j.id, action: "delete" } }); void load(); }}>
                    Eliminar
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
        </DashPage>
      </DashShell>
    </Shell>
  );
}
