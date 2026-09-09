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

export const Route = createFileRoute("/applications")({
  head: () => ({ meta: [{ title: "Minhas candidaturas | Auxilar de Vagas" }] }),
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
        <div className="mt-4 space-y-3">
          {rows == null ? (
            <div className="h-24 animate-pulse rounded-2xl bg-border/60" />
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
                <div key={a.id} className="dash-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{a.jobTitle}</div>
                      <div className="text-sm text-muted">
                        {a.companyName}
                        {a.countryName ? ` · ${a.countryName}` : ""}
                        {a.sourceName ? ` · ${a.sourceName}` : ""}
                        {" · "}
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
                    <div className="mt-2 flex flex-wrap gap-1">
                      {CANDIDATE_STATUSES.filter((s) => s !== "send_error" || a.status === "send_error").map((s) => (
                        <span
                          key={s}
                          className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                            a.status === s || rank(a.status) >= rank(s)
                              ? a.status === "send_error"
                                ? "bg-[#fde8e6] text-danger"
                                : "bg-primary-soft text-primary"
                              : "bg-bg text-muted"
                          }`}
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
