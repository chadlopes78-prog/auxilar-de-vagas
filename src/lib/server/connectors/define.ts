import { env } from "@/lib/env.server";
import { pair, postOfficialApplication, getOfficialStatus } from "./http";
import { fetchAuthorizedJobs } from "./rss";
import type {
  ConnectorCapabilities,
  FetchJobsResult,
  JobConnector,
  PreparedApplication,
  StatusSyncResult,
  SubmitResult,
} from "./types";

export function definePortalConnector(opts: {
  slug: string;
  sourceName: string;
  country: string;
  envPrefix: string;
  pendingReason: string;
  readyReason?: string;
  extraImportEnv?: string;
  publicFeedUrl?: string;
  redirectTitle?: string;
  redirectMessage?: string;
  redirectCta?: string;
  fetchJobs?: () => Promise<FetchJobsResult>;
}): JobConnector {
  const prefix = opts.envPrefix;
  const jobsApiKey = `${prefix}_JOBS_API_URL`;
  const jobsSecret = `${prefix}_API_KEY`;
  const feedKey = `${prefix}_JOBS_FEED_URL`;
  const appsUrl = `${prefix}_APPLICATIONS_API_URL`;
  const appsSecret = `${prefix}_API_KEY`;
  const statusUrl = `${prefix}_STATUS_API_URL`;

  function caps(): ConnectorCapabilities {
    const jobsImport = Boolean(
      env(jobsApiKey) || env(feedKey) || opts.publicFeedUrl || (opts.extraImportEnv && env(opts.extraImportEnv)),
    );
    const apps = pair(appsUrl, appsSecret);
    const statusApi = pair(statusUrl, appsSecret);
    const viaApi = Boolean(env(jobsApiKey) || (opts.extraImportEnv && env(opts.extraImportEnv)));
    return {
      slug: opts.slug,
      sourceName: opts.sourceName,
      country: opts.country,
      integrationType: apps.ready ? "api" : jobsImport ? (viaApi ? "api" : "rss") : "official_redirect",
      supportsJobsImport: jobsImport,
      supportsJobPublish: false,
      supportsApplicationSubmission: apps.ready,
      supportsApplicationStatus: statusApi.ready,
      supportsCvUpload: apps.ready,
      supportsProfileSync: false,
      enabled: apps.ready || jobsImport,
      status: apps.ready || jobsImport ? "ready" : "awaiting_partnership",
      reason: apps.ready || jobsImport
        ? (opts.readyReason ?? "Integração oficial configurada.")
        : opts.pendingReason,
      credentialsReference: `${prefix}_API_KEY`,
      redirectTitle: opts.redirectTitle ?? "Candidatura no portal oficial",
      redirectMessage:
        opts.redirectMessage ?? "A candidatura para esta vaga é concluída no portal oficial.",
      redirectCta: opts.redirectCta ?? "Continuar candidatura no portal oficial",
    };
  }

  return {
    slug: opts.slug,
    sourceName: opts.sourceName,
    country: opts.country,
    capabilities: caps,
    async fetchJobs(): Promise<FetchJobsResult> {
      if (opts.fetchJobs) return opts.fetchJobs();
      const got = await fetchAuthorizedJobs({
        country: opts.country,
        apiUrlKey: jobsApiKey,
        apiKeyKey: jobsSecret,
        feedUrlKey: feedKey,
        publicFeedUrl: opts.publicFeedUrl,
      });
      if (got.method === "pending") {
        return {
          jobs: [],
          method: "pending",
          pending: true,
          message: opts.pendingReason,
        };
      }
      return { jobs: got.jobs, method: got.method, pending: false };
    },
    async submitApplication(payload: PreparedApplication): Promise<SubmitResult> {
      const apps = pair(appsUrl, appsSecret);
      if (!apps.ready || !apps.endpoint || !apps.apiKey) {
        return {
          ok: false,
          channel: "official_redirect",
          officialUrl: payload.officialUrl,
          message: caps().redirectMessage,
        };
      }
      const posted = await postOfficialApplication({
        endpoint: apps.endpoint,
        apiKey: apps.apiKey,
        body: {
          external_job_id: payload.externalJobId,
          official_url: payload.officialUrl,
          candidate: payload.candidate,
        },
      });
      if (!posted.ok) {
        return { ok: false, channel: "official_api", httpCode: posted.httpCode, message: posted.message };
      }
      const rec = posted.payload && typeof posted.payload === "object" ? (posted.payload as Record<string, unknown>) : {};
      return {
        ok: true,
        channel: "official_api",
        externalApplicationId: rec.externalId ? String(rec.externalId) : null,
        externalStatus: typeof rec.status === "string" ? rec.status : "sent",
        httpCode: posted.httpCode,
        message: posted.message,
      };
    },
    async syncStatus(externalApplicationId: string): Promise<StatusSyncResult> {
      const statusApi = pair(statusUrl, appsSecret);
      if (!statusApi.ready || !statusApi.endpoint || !statusApi.apiKey) {
        return {
          supported: false,
          externalStatus: null,
          mappedStatus: null,
          message: "Estado gerido pelo portal externo.",
        };
      }
      const res = await getOfficialStatus({
        endpoint: `${statusApi.endpoint.replace(/\/$/, "")}/${encodeURIComponent(externalApplicationId)}`,
        apiKey: statusApi.apiKey,
      });
      if (!res.ok) {
        return { supported: true, externalStatus: null, mappedStatus: null, message: "Não foi possível sincronizar o estado." };
      }
      const rec = res.payload && typeof res.payload === "object" ? (res.payload as Record<string, unknown>) : {};
      const raw = typeof rec.status === "string" ? rec.status : null;
      return { supported: true, externalStatus: raw, mappedStatus: raw, message: "Estado sincronizado." };
    },
  };
}
