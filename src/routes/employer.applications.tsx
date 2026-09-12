import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { AuthSplash } from "@/components/require-auth";
import { Shell } from "@/components/site-header";
import { DashShell, DashPage } from "@/components/dash-nav";
import { Select } from "@/components/ui/input";
import { useProfile } from "@/hooks/use-profile";
import { listEmployerApplications, setApplicationStatus } from "@/lib/server/account";
import type { ApplicationRow } from "@/lib/types";
import { EMPLOYER_STATUSES } from "@/lib/utils";
import { STATUS_PT } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/employer/applications")({ component: EmpApps });

function EmpApps() {
  const { profile, loading, user, isPending } = useProfile();
  const [apps, setApps] = useState<ApplicationRow[]>([]);
  useEffect(() => {
    if (!user) return;
    listEmployerApplications()
      .then(setApps)
      .catch(() => setApps([]));
  }, [user]);
  if (isPending) return <AuthSplash />;
  if (!user) return <RedirectToSignIn />;
  if (loading) return <AuthSplash />;
  return (
    <Shell>
      <DashShell profile={profile} active="/employer/applications">
        <DashPage title="Candidatos">
        <div className="mt-4 space-y-2">
          {apps.length === 0 ? (
            <p className="text-sm text-muted">Ainda não há candidaturas.</p>
          ) : (
            apps.map((a) => (
              <div key={a.id} className="border-b border-border py-4">
                <div className="font-medium">{a.candidateName}</div>
                <div className="text-sm text-muted">
                  {a.jobTitle} · {a.phone} · {a.candidateEmail}
                </div>
                {a.coverLetter ? <p className="mt-2 text-sm">{a.coverLetter}</p> : null}
                {a.answers?.length ? (
                  <dl className="mt-3 space-y-1 text-sm">
                    {a.answers.map((ans) => (
                      <div key={ans.key || ans.question}>
                        <dt className="text-muted">{ans.question}</dt>
                        <dd className="font-medium">
                          {Array.isArray(ans.answer) ? ans.answer.join(", ") : String(ans.answer ?? "")}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                <Select
                  className="mt-2 w-auto"
                  value={normalizeStatus(a.status)}
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

function normalizeStatus(status: string) {
  if (status === "applied") return "sent";
  if (status === "viewed") return "received";
  if (status === "under review") return "under_review";
  return status;
}
