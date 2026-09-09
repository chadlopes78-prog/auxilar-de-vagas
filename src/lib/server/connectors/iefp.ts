import type { JobConnector, ConnectorCapabilities, PreparedApplication, SubmitResult, StatusSyncResult, FetchJobsResult } from "./types";
import { pair, postOfficialApplication } from "./http";
import { fetchAuthorizedJobs } from "./rss";
import { env } from "@/lib/env.server";

const SLUG = "iefp";
const NAME = "IEFP Online";

function caps(): ConnectorCapabilities {
  const jobsImport = Boolean(env("IEFP_JOBS_API_URL") || env("IEFP_JOBS_FEED_URL"));
  const apps = pair("IEFP_APPLICATIONS_API_URL", "IEFP_API_KEY");
  return {
    slug: SLUG,
    sourceName: NAME,
    country: "PT",
    integrationType: apps.ready ? "api" : jobsImport ? "rss" : "official_redirect",
    supportsJobsImport: jobsImport,
    supportsJobPublish: false,
    supportsApplicationSubmission: apps.ready,
    supportsApplicationStatus: false,
    supportsCvUpload: false,
    supportsProfileSync: false,
    enabled: apps.ready || jobsImport,
    status: apps.ready || jobsImport ? "ready" : "awaiting_credentials",
    reason: apps.ready || jobsImport
      ? "API oficial do IEFP configurada. Nunca pedimos a senha IEFP do candidato."
      : "Integração pendente. Sem API ou parceria oficial para submissão. Não pedimos a senha do IEFP nem automatizamos o login.",
    credentialsReference: "IEFP_API_KEY",
    redirectTitle: "Candidatura através do IEFP Online",
    redirectMessage: "Candidatura através do IEFP Online. A oferta é concluída no portal oficial. Nunca pedimos a sua senha do IEFP.",
    redirectCta: "Continuar candidatura no portal oficial",
  };
}

export const iefpConnector: JobConnector = {
  slug: SLUG,
  sourceName: NAME,
  country: "PT",
  capabilities: caps,
  async fetchJobs(): Promise<FetchJobsResult> {
    const got = await fetchAuthorizedJobs({
      country: "PT",
      apiUrlKey: "IEFP_JOBS_API_URL",
      apiKeyKey: "IEFP_API_KEY",
      feedUrlKey: "IEFP_JOBS_FEED_URL",
    });
    if (got.method === "pending") {
      return { jobs: [], method: "pending", pending: true, message: caps().reason };
    }
    return { jobs: got.jobs, method: got.method, pending: false };
  },
  async submitApplication(payload: PreparedApplication): Promise<SubmitResult> {
    const apps = pair("IEFP_APPLICATIONS_API_URL", "IEFP_API_KEY");
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
        candidate: {
          fullName: payload.candidate.fullName,
          email: payload.candidate.email,
          phone: payload.candidate.phone,
          cvName: payload.candidate.cvName,
          coverLetter: payload.candidate.coverLetter,
        },
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
  async syncStatus(): Promise<StatusSyncResult> {
    return {
      supported: false,
      externalStatus: null,
      mappedStatus: null,
      message: "Estado gerido pelo portal externo.",
    };
  },
};
