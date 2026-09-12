import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { AuthSplash } from "@/components/require-auth";
import { Shell } from "@/components/site-header";
import { DashShell, DashPage, EmptyPanel } from "@/components/dash-nav";
import { useProfile } from "@/hooks/use-profile";
import { listNotifications, markNotificationsRead } from "@/lib/server/account";
import type { NotificationRow } from "@/lib/types";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notificações | Auxiliar de Vagas" }] }),
  component: Notes,
});

function Notes() {
  const { profile, loading, user, isPending } = useProfile();
  const [rows, setRows] = useState<NotificationRow[]>([]);
  useEffect(() => {
    if (!user) return;
    listNotifications()
      .then((r) => {
        setRows(r);
        void markNotificationsRead();
      })
      .catch(() => setRows([]));
  }, [user]);
  if (isPending) return <AuthSplash />;
  if (!user) return <RedirectToSignIn />;
  if (loading) return <AuthSplash />;
  return (
    <Shell>
      <DashShell profile={profile} active="/notifications">
        <DashPage title="Notificações" subtitle="Actualizações sobre as suas candidaturas e alertas.">
          {rows.length === 0 ? (
            <EmptyPanel title="Ainda não tem notificações." hint="Quando houver novidades sobre vagas ou candidaturas, aparecem aqui." />
          ) : (
            <div>
              {rows.map((n) => (
                <div key={n.id} className="border-b border-border py-4">
                  <div className="font-medium">{n.title}</div>
                  <div className="text-sm text-muted">{n.body}</div>
                </div>
              ))}
            </div>
          )}
        </DashPage>
      </DashShell>
    </Shell>
  );
}
