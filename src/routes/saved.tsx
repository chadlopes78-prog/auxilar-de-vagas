import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { AuthSplash } from "@/components/require-auth";
import { Shell } from "@/components/site-header";
import { DashShell, DashPage, EmptyPanel } from "@/components/dash-nav";
import { JobCardView } from "@/components/job-card";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/use-profile";
import { listSavedJobs, toggleSaveJob } from "@/lib/server/account";
import { getJob } from "@/lib/server/jobs";
import type { JobCard } from "@/lib/types";

export const Route = createFileRoute("/saved")({
  head: () => ({ meta: [{ title: "Vagas guardadas | Auxiliar de Vagas" }] }),
  component: Saved,
});

function Saved() {
  const { profile, loading, user, isPending } = useProfile();
  const [jobs, setJobs] = useState<JobCard[] | null>(null);
  useEffect(() => {
    if (!user) return;
    listSavedJobs()
      .then(async (ids) => {
        const details = await Promise.all(ids.map((x) => getJob({ data: x.id })));
        setJobs(details.filter(Boolean).map((j) => ({ ...j!, saved: true })));
      })
      .catch(() => setJobs([]));
  }, [user]);
  if (isPending) return <AuthSplash />;
  if (!user) return <RedirectToSignIn />;
  if (loading) return <AuthSplash />;
  return (
    <Shell>
      <DashShell profile={profile} active="/saved">
        <DashPage title="Vagas guardadas" subtitle="As oportunidades que guardou para ver mais tarde.">
        <div>
          {jobs == null ? (
            <div className="h-24 animate-pulse border-b border-border" />
          ) : jobs.length === 0 ? (
            <EmptyPanel
              title="Ainda não guardou nenhuma vaga."
              hint="Toque em Guardar numa vaga para a encontrar aqui."
              action={
                <Link to="/vagas">
                  <Button>Procurar vagas</Button>
                </Link>
              }
            />
          ) : (
            jobs.map((j) => (
              <JobCardView
                key={j.id}
                job={j}
                saved
                onSave={async (id) => {
                  await toggleSaveJob({ data: id });
                  setJobs((prev) => prev?.filter((x) => x.id !== id) ?? []);
                }}
              />
            ))
          )}
        </div>
        </DashPage>
      </DashShell>
    </Shell>
  );
}
