import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { AuthSplash } from "@/components/require-auth";
import { Shell } from "@/components/site-header";
import { DashShell, DashPage, EmptyPanel } from "@/components/dash-nav";
import { Button } from "@/components/ui/button";
import { ApplyMethodBadge } from "@/components/apply-method-badge";
import { useProfile } from "@/hooks/use-profile";
import { listMyApplications } from "@/lib/server/account";
import { syncMyApplicationStatuses } from "@/lib/server/apply";
import type { ApplicationRow, ApplyChannel } from "@/lib/types";
import { CANDIDATE_STATUSES, METHOD_PT, STATUS_PT } from "@/lib/i18n";
import { pageTitle } from "@/lib/brand";

export const Route = createFileRoute("/applications")({
  head: () => ({ meta: [{ title: pageTitle("Minhas candidaturas") }] }),
  component: Apps,
});

function Apps() {
  const { profile, loading, user, isPending } = useProfile();
  const [rows, setRows] = useState<ApplicationRow[] | null>(null);
  useEffect(() => {
    if (!user) return;
    syncMyApplicationStatuses().catch(() => null);
    listMyApplications()
      .then(setRows)
      .catch(() => setRows([]));
  }, [user]);
  if (isPending) return <AuthSplash />;
  if (!user) return <RedirectToSignIn />;
  if (loading) return <AuthSplash />;
  return (
    <Shell>
      <DashShell profile={profile} active="/applications">
        <DashPage
          title="Minhas candidaturas"
          subtitle="Todas as candidaturas, independentemente da fonte."
        >
          <div className="mt-2">
            {rows == null ? (
              <div className="h-24 animate-pulse border-b border-border" />
            ) : rows.length === 0 ? (
              <EmptyPanel
                title="Ainda não tem candidaturas."
                hint="Procure uma vaga e use Candidatar-me para enviar o seu perfil."
                action={
                  <Link to="/vagas">
                    <Button>Procurar vagas</Button>
                  </Link>
                }
              />
            ) : (
              rows.map((a) => {
                const channel = (a.method as ApplyChannel) || "internal";
                const managedExternally = channel === "official_redirect" || Boolean(a.statusNote);
                return (
                  <div key={a.id} className="border-b border-border py-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-muted">{a.companyName}</p>
                        <div className="mt-1 font-display text-xl">{a.jobTitle}</div>
                        <div className="mt-1 text-sm text-muted">
                          {a.countryName ? `${a.countryName} · ` : ""}
                          {a.sourceName ? `${a.sourceName} · ` : ""}
                          {new Date(a.createdAt).toLocaleDateString("pt-PT")}
                        </div>
                        {a.companyEmail ? (
                          <p className="mt-2 text-sm">
                            Enviada para o e-mail da empresa:{" "}
                            <a className="font-medium text-primary" href={`mailto:${a.companyEmail}`}>
                              {a.companyEmail}
                            </a>
                          </p>
                        ) : (
                          <p className="mt-2 text-sm text-muted">
                            Esta vaga ainda não tem um e-mail oficial publicado.
                          </p>
                        )}
                      </div>
                      <ApplyMethodBadge
                        channel={
                          channel === "official_api" ||
                          channel === "internal" ||
                          channel === "official_redirect" ||
                          channel === "email"
                            ? channel
                            : "internal"
                        }
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted">Método: {METHOD_PT[a.method ?? "internal"] ?? a.method}</p>
                    {managedExternally && channel !== "internal" && channel !== "official_api" ? (
                      <p className="mt-2 text-sm">Estado gerido pelo portal externo.</p>
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                        {CANDIDATE_STATUSES.filter((s) => s !== "send_error" || a.status === "send_error").map((s) => (
                          <span
                            key={s}
                            className={
                              a.status === s || rank(a.status) >= rank(s)
                                ? a.status === "send_error"
                                  ? "text-danger"
                                  : "text-primary"
                                : "text-muted"
                            }
                          >
                            {STATUS_PT[s] ?? s}
                          </span>
                        ))}
                      </div>
                    )}
                    {a.answers?.length ? (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm font-medium">Respostas enviadas</summary>
                        <dl className="mt-2 space-y-1 text-sm">
                          {a.answers.map((ans) => (
                            <div key={ans.key || ans.question}>
                              <dt className="text-muted">{ans.question}</dt>
                              <dd className="font-medium">{ans.answer}</dd>
                            </div>
                          ))}
                        </dl>
                      </details>
                    ) : null}
                    {a.status === "send_error" ? (
                      <p className="mt-2 text-sm text-danger">{a.statusNote || "Erro de envio"}</p>
                    ) : null}
                    {a.officialUrl && channel === "official_redirect" ? (
                      <a href={a.officialUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex">
                        <Button size="sm" variant="outline">
                          <ExternalLink className="size-4" />
                          Continuar para candidatura oficial
                        </Button>
                      </a>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </DashPage>
      </DashShell>
    </Shell>
  );
}

function rank(status: string) {
  const order = ["prepared", "sending", "sent", "applied", "received", "viewed", "under_review", "under review", "interview", "accepted"];
  if (status === "rejected" || status === "send_error") return -1;
  const i = order.indexOf(status);
  return i < 0 ? 0 : i;
}
