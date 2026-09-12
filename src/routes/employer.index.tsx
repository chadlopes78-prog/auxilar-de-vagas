import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Briefcase, Building2, FileText } from "lucide-react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { AuthSplash } from "@/components/require-auth";
import { Shell } from "@/components/site-header";
import { DashShell, DashPage, StatCard, EmptyPanel } from "@/components/dash-nav";
import { Select } from "@/components/ui/input";
import { useProfile } from "@/hooks/use-profile";
import { listEmployerApplications, setApplicationStatus } from "@/lib/server/account";
import { listMyJobs } from "@/lib/server/jobs";
import type { ApplicationRow } from "@/lib/types";
import { EMPLOYER_STATUSES } from "@/lib/utils";
import { STATUS_PT } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/employer/")({
  head: () => ({ meta: [{ title: "Painel do empregador | Auxiliar de Vagas" }] }),
  component: Employer,
});

function Employer() {
  const { profile, loading, user, isPending } = useProfile();
  const [jobs, setJobs] = useState(0);
  const [apps, setApps] = useState<ApplicationRow[]>([]);
  useEffect(() => {
    if (!user) return;
    listMyJobs()
      .then((r) => setJobs(r.length))
      .catch(() => setJobs(0));
    listEmployerApplications()
      .then(setApps)
      .catch(() => setApps([]));
  }, [user]);
  if (isPending) return <AuthSplash />;
  if (!user) return <RedirectToSignIn />;
  if (loading) return <AuthSplash />;
  return (
    <Shell>
      <DashShell profile={profile} active="/employer">
        <DashPage title="Visão geral do empregador" subtitle="Acompanhe vagas publicadas e candidaturas recebidas.">
        <div className="grid grid-cols-2 gap-x-6 gap-y-6 border-b border-border pb-8 md:grid-cols-3">
          <StatCard value={jobs} label="Vagas" icon={Briefcase} to="/employer/jobs" />
          <StatCard value={apps.length} label="Candidaturas" icon={FileText} to="/employer/applications" />
          <StatCard value={profile?.companyId ? "Activa" : "—"} label="Empresa" icon={Building2} to="/employer/company" />
        </div>
        <h2 className="mt-8 text-xl">Candidatos recentes</h2>
        <div className="mt-3">
          {apps.length === 0 ? (
            <EmptyPanel title="Ainda não há candidaturas." hint="Quando alguém se candidatar, o estado aparece aqui." />
          ) : (
            apps.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-4">
                <div>
                  <div className="font-medium">{a.candidateName}</div>
                  <div className="text-sm text-muted">
                    {a.jobTitle} · {a.candidateEmail}
                  </div>
                </div>
                <Select
                  className="w-auto"
                  value={a.status === "applied" ? "sent" : a.status === "viewed" ? "received" : a.status === "under review" ? "under_review" : a.status}
                  onChange={async (e) => {
                    await setApplicationStatus({ data: { id: a.id, status: e.target.value } });
                    toast.success("Estado atualizado");
                    setApps(await listEmployerApplications());
                  }}
                >
                  {EMPLOYER_STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {STATUS_PT[s.id] ?? s.label}
                    </option>
                  ))}
                </Select>
              </div>
            ))
          )}
        </div>
        </DashPage>
      </DashShell>
    </Shell>
  );
}
