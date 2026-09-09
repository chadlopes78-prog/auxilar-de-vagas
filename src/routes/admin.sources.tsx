import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { AuthSplash } from "@/components/require-auth";
import { Shell } from "@/components/site-header";
import { DashShell, DashPage } from "@/components/dash-nav";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/use-profile";
import { listJobSources, syncAuthorizedSources, syncJobSource } from "@/lib/server/ingest";
import type { JobSource } from "@/lib/types";
import {
  COUNTRY_META,
  SOURCE_STATUS_PT,
  canSyncSource,
  formatSyncedAt,
  integrationLabel,
} from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/sources")({
  head: () => ({ meta: [{ title: "Fontes de vagas | Auxilar de Vagas" }] }),
  component: Sources,
});

function statusClass(status: string) {
  if (status === "active") return "bg-primary-soft text-primary";
  if (status === "error") return "bg-[#fde8e6] text-danger";
  if (status === "pending") return "bg-[#eef2f6] text-fg";
  return "bg-bg text-muted";
}

function Sources() {
  const { profile, loading, user, isPending } = useProfile();
  const [rows, setRows] = useState<JobSource[]>([]);
  const [busy, setBusy] = useState<number | "all" | null>(null);

  async function load() {
    try {
      setRows(await listJobSources());
    } catch {
      setRows([]);
    }
  }

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  if (isPending) return <AuthSplash />;
  if (!user) return <RedirectToSignIn />;
  if (loading) return <AuthSplash />;

  const primary = rows.filter((s) => s.primary);
  const extra = rows.filter((s) => !s.primary && s.slug !== "nearhire");
  const internal = rows.filter((s) => s.slug === "nearhire");

  function SourceCard(s: JobSource) {
    const syncable = canSyncSource(s);
    const status = SOURCE_STATUS_PT[s.status] ?? s.status.toUpperCase();
    const country = COUNTRY_META[s.countryCode];
    const never = !s.lastSyncedAt;
    return (
      <div key={s.id} className="rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="font-semibold">
              {s.name} — {country?.name ?? s.countryCode}
            </div>
            <a href={s.url} className="text-xs text-primary" target="_blank" rel="noreferrer">
              {s.url}
            </a>
            <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold tracking-wide">
              <span className={`rounded-full px-2 py-0.5 ${statusClass(s.status)}`}>{status}</span>
              <span className="rounded-full bg-bg px-2 py-0.5 text-muted">{integrationLabel(s.integrationType)}</span>
            </div>
            <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
              <div>
                <dt>Última sincronização</dt>
                <dd className="text-fg">{formatSyncedAt(s.lastSyncedAt)}</dd>
              </div>
              <div>
                <dt>Vagas encontradas</dt>
                <dd className="text-fg">{never ? "—" : (s.lastFoundCount ?? 0)}</dd>
              </div>
              <div>
                <dt>Vagas novas</dt>
                <dd className="text-fg">{never ? "—" : (s.lastNewCount ?? 0)}</dd>
              </div>
              <div>
                <dt>Vagas expiradas</dt>
                <dd className="text-fg">{never ? "—" : (s.lastExpiredCount ?? 0)}</dd>
              </div>
              <div>
                <dt>Vagas importadas</dt>
                <dd className="text-fg">{s.importedCount}</dd>
              </div>
              <div>
                <dt>Erros</dt>
                <dd className={s.lastError ? "text-danger" : "text-fg"}>{s.lastError ? "1" : never ? "—" : "0"}</dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-muted">
              Candidaturas:{" "}
              {s.supportsApplicationSubmission
                ? "API oficial activa"
                : "sem submissão automática — o candidato prepara aqui e conclui no portal oficial, ou por e-mail se a vaga o indicar"}
            </p>
            {s.applicationReason ? <p className="mt-1 text-xs text-muted">{s.applicationReason}</p> : null}
            {s.lastError ? <p className="mt-1 text-xs text-danger">{s.lastError}</p> : null}
            {!syncable ? (
              <p className="mt-1 text-xs text-muted">
                Integração pendente até existir autorização, API ou feed permitido. Não inventamos vagas desta fonte.
              </p>
            ) : null}
          </div>
          <Button
            size="sm"
            disabled={!syncable || busy === s.id || busy === "all"}
            onClick={async () => {
              setBusy(s.id);
              try {
                const r = await syncJobSource({ data: s.id });
                toast.success(`${r.imported} vagas novas · ${r.total} encontradas`);
                await load();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Não foi possível sincronizar");
                await load();
              } finally {
                setBusy(null);
              }
            }}
          >
            {busy === s.id ? "A sincronizar…" : "Sincronizar agora"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Shell>
      <DashShell profile={profile} active="/admin/sources">
        <DashPage
          title="Fontes de vagas"
          subtitle="Só sincronizamos portais com API, RSS ou autorização explícita. As restantes ficam preparadas, mas pendentes."
          action={
          <Button
            variant="outline"
            disabled={busy !== null}
            onClick={async () => {
              setBusy("all");
              try {
                const r = await syncAuthorizedSources();
                const n = r.reduce((acc, x) => acc + x.imported, 0);
                toast.success(`${n} vagas novas nas fontes autorizadas`);
                await load();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Nenhuma fonte autorizada");
              } finally {
                setBusy(null);
              }
            }}
          >
            {busy === "all" ? "A sincronizar…" : "Sincronizar autorizadas"}
          </Button>
          }
        >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Fontes principais</h2>
        <div className="mt-2 space-y-3">{primary.map(SourceCard)}</div>
        {internal.length ? (
          <>
            <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted">Publicação directa</h2>
            <div className="mt-2 space-y-3">{internal.map(SourceCard)}</div>
          </>
        ) : null}
        {extra.length ? (
          <>
            <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted">Outras fontes</h2>
            <div className="mt-2 space-y-3">{extra.map(SourceCard)}</div>
          </>
        ) : null}
        </DashPage>
      </DashShell>
    </Shell>
  );
}
