import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { AuthSplash } from "@/components/require-auth";
import { Shell } from "@/components/site-header";
import { DashShell, DashPage, EmptyPanel } from "@/components/dash-nav";
import { JobCardView } from "@/components/job-card";
import { useProfile } from "@/hooks/use-profile";
import { listMyJobs } from "@/lib/server/jobs";
import type { JobCard } from "@/lib/types";

export const Route = createFileRoute("/employer/jobs")({ component: MyJobs });

function MyJobs() {
  const { profile, loading, user, isPending } = useProfile();
  const [jobs, setJobs] = useState<JobCard[]>([]);
  useEffect(() => {
    if (!user) return;
    listMyJobs()
      .then(setJobs)
      .catch(() => setJobs([]));
  }, [user]);
  if (isPending) return <AuthSplash />;
  if (!user) return <RedirectToSignIn />;
  if (loading) return <AuthSplash />;
  return (
    <Shell>
      <DashShell profile={profile} active="/employer/jobs">
        <DashPage title="As minhas vagas">
        <div className="mt-4">
          {jobs.length === 0 ? (
            <EmptyPanel
              title="Ainda não há vagas publicadas por si."
              hint="Este site reúne oportunidades para candidatos. As vagas entram pelas fontes autorizadas."
            />
          ) : (
            jobs.map((j) => <JobCardView key={j.id} job={j} />)
          )}
        </div>
        </DashPage>
      </DashShell>
    </Shell>
  );
}
