import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { AuthSplash } from "@/components/require-auth";
import { Shell } from "@/components/site-header";
import { DashShell, DashPage } from "@/components/dash-nav";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/use-profile";
import { adminApproveCompany, adminListCompanies } from "@/lib/server/admin";

export const Route = createFileRoute("/admin/companies")({ component: Cos });

function Cos() {
  const { profile, loading, user, isPending } = useProfile();
  const [rows, setRows] = useState<{ id: number; name: string; approved: boolean }[]>([]);
  useEffect(() => {
    if (!user) return;
    adminListCompanies()
      .then(setRows)
      .catch(() => setRows([]));
  }, [user]);
  if (isPending) return <AuthSplash />;
  if (!user) return <RedirectToSignIn />;
  if (loading) return <AuthSplash />;
  return (
    <Shell>
      <DashShell profile={profile} active="/admin/companies">
        <DashPage title="Empresas">
        <div className="mt-4 space-y-2">
          {rows.length === 0 ? (
            <p className="text-sm text-muted">Ainda não há empresas registadas.</p>
          ) : (
            rows.map((c) => (
              <div key={c.id} className="flex items-center justify-between border-b border-border py-4">
                <div>
                  {c.name} · {c.approved ? "aprovada" : "pendente"}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await adminApproveCompany({ data: c.id });
                    setRows(await adminListCompanies());
                  }}
                >
                  {c.approved ? "Desaprovar" : "Aprovar"}
                </Button>
              </div>
            ))
          )}
        </div>
        </DashPage>
      </DashShell>
    </Shell>
  );
}
