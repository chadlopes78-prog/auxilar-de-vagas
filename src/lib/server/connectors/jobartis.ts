import type { JobConnector, ConnectorCapabilities, PreparedApplication, SubmitResult, StatusSyncResult, FetchJobsResult } from "./types";
import { getOfficialStatus, pair, postOfficialApplication } from "./http";
import { fetchAuthorizedJobs } from "./rss";
import { env } from "@/lib/env.server";

const SLUG = "jobartis";
const NAME = "Jobartis";

function caps(): ConnectorCapabilities {
  const jobsImport = Boolean(env("JOBARTIS_JOBS_API_URL") || env("JOBARTIS_JOBS_FEED_URL"));
  const apps = pair("JOBARTIS_APPLICATIONS_API_URL", "JOBARTIS_API_KEY");
  const statusApi = pair("JOBARTIS_STATUS_API_URL", "JOBARTIS_API_KEY");
  return {
    slug: SLUG,
    sourceName: NAME,
    country: "AO",
    integrationType: apps.ready ? "api" : jobsImport ? "rss" : "official_redirect",
    supportsJobsImport: jobsImport,
    supportsJobPublish: false,
    supportsApplicationSubmission: apps.ready,
    supportsApplicationStatus: statusApi.ready,
    supportsCvUpload: apps.ready,
    supportsProfileSync: false,
    enabled: apps.ready || jobsImport,
    status: apps.ready || jobsImport ? "ready" : "awaiting_credentials",
    reason: apps.ready || jobsImport
      ? "Documentação e credenciais oficiais da Jobartis configuradas."
      : "Integração pendente. A integração só é activada após documentação e credenciais oficiais da Jobartis.",
    credentialsReference: "JOBARTIS_API_KEY",
    redirectTitle: "Candidatura no portal oficial",
    redirectMessage: "A candidatura para esta vaga é concluída no portal oficial.",
    redirectCta: "Continuar candidatura no portal oficial",
  };
}

export const jobartisConnector: JobConnector = {
  slug: SLUG,
  sourceName: NAME,
  country: "AO",
  capabilities: caps,
  async fetchJobs(): Promise<FetchJobsResult> {
    const got = await fetchAuthorizedJobs({
      country: "AO",
      apiUrlKey: "JOBARTIS_JOBS_API_URL",
      apiKeyKey: "JOBARTIS_API_KEY",
      feedUrlKey: "JOBARTIS_JOBS_FEED_URL",
    });
    if (got.method === "pending") {
      return { jobs: [], method: "pending", pending: true, message: caps().reason };
    }
    return { jobs: got.jobs, method: got.method, pending: false };
  },
  async submitApplication(payload: PreparedApplication): Promise<SubmitResult> {
    const apps = pair("JOBARTIS_APPLICATIONS_API_URL", "JOBARTIS_API_KEY");
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
    const statusApi = pair("JOBARTIS_STATUS_API_URL", "JOBARTIS_API_KEY");
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
