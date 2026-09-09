import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { AuthSplash } from "@/components/require-auth";
import { Shell } from "@/components/site-header";
import { DashShell, DashPage } from "@/components/dash-nav";
import { Select } from "@/components/ui/input";
import { useProfile } from "@/hooks/use-profile";
import { adminListUsers, adminSetRole } from "@/lib/server/admin";
import { ROLE_PT } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({ component: Users });

function Users() {
  const { profile, loading, user, isPending } = useProfile();
  const [rows, setRows] = useState<{ user_id: string; full_name: string | null; email: string | null; role: string }[]>([]);
  useEffect(() => {
    if (!user) return;
    adminListUsers()
      .then(setRows)
      .catch(() => setRows([]));
  }, [user]);
  if (isPending) return <AuthSplash />;
  if (!user) return <RedirectToSignIn />;
  if (loading) return <AuthSplash />;
  return (
    <Shell>
      <DashShell profile={profile} active="/admin/users">
        <DashPage title="Utilizadores">
        <div className="mt-4 space-y-2">
          {rows.map((u) => (
            <div key={u.user_id} className="flex flex-wrap items-center justify-between gap-2 dash-card p-3">
              <div>
                <div className="font-medium">{u.full_name || "Sem nome"}</div>
                <div className="text-xs text-muted">{u.email}</div>
              </div>
              <Select
                className="w-auto"
                value={u.role}
                onChange={async (e) => {
                  await adminSetRole({ data: { userId: u.user_id, role: e.target.value } });
                  toast.success("Função atualizada");
                  setRows(await adminListUsers());
                }}
              >
                <option value="candidate">{ROLE_PT.candidate}</option>
                <option value="employer">{ROLE_PT.employer}</option>
                <option value="admin">{ROLE_PT.admin}</option>
              </Select>
            </div>
          ))}
        </div>
        </DashPage>
      </DashShell>
    </Shell>
  );
}
