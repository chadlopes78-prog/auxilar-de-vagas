import { createFileRoute } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { AuthSplash } from "@/components/require-auth";
import { signOut } from "@/lib/auth/client";
import { Shell } from "@/components/site-header";
import { DashShell, DashPage } from "@/components/dash-nav";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/use-profile";
import { claimAdmin } from "@/lib/server/admin";
import { ROLE_PT } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Definições | Auxilar de Vagas" }] }),
  component: Settings,
});

function Settings() {
  const { profile, loading, user, isPending } = useProfile();
  if (isPending) return <AuthSplash />;
  if (!user) return <RedirectToSignIn />;
  if (loading) return <AuthSplash />;
  return (
    <Shell>
      <DashShell profile={profile} active="/settings">
        <DashPage title="Definições" subtitle={`Sessão iniciada como ${user.primaryEmail} (${ROLE_PT[profile?.role ?? ""] ?? profile?.role}).`}>
        <div className="dash-card p-5">
          <p className="text-sm text-muted">Gerir a sua sessão nesta plataforma.</p>
          <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => signOut()}>
            Sair
          </Button>
          {profile?.role !== "admin" ? (
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await claimAdmin();
                  toast.success("É agora administrador");
                  window.location.href = "/admin";
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Não foi possível assumir a administração");
                }
              }}
            >
              Assumir administração (se ainda não existir)
            </Button>
          ) : null}
          </div>
        </div>
        </DashPage>
      </DashShell>
    </Shell>
  );
}
