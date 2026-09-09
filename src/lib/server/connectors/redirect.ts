import type { JobConnector, ConnectorCapabilities, PreparedApplication, SubmitResult, StatusSyncResult, FetchJobsResult } from "./types";

export function redirectConnector(opts: {
  slug: string;
  sourceName: string;
  country: string;
  reason: string;
  redirectTitle?: string;
  redirectMessage?: string;
}): JobConnector {
  const redirectTitle = opts.redirectTitle ?? "Candidatura no portal oficial";
  const redirectMessage =
    opts.redirectMessage ?? "A candidatura para esta vaga é concluída no portal oficial.";
  return {
    slug: opts.slug,
    sourceName: opts.sourceName,
    country: opts.country,
    capabilities(): ConnectorCapabilities {
      return {
        slug: opts.slug,
        sourceName: opts.sourceName,
        country: opts.country,
        integrationType: "official_redirect",
        supportsJobsImport: false,
        supportsJobPublish: false,
        supportsApplicationSubmission: false,
        supportsApplicationStatus: false,
        supportsCvUpload: false,
        supportsProfileSync: false,
        enabled: false,
        status: "awaiting_partnership",
        reason: opts.reason,
        credentialsReference: null,
        redirectTitle,
        redirectMessage,
        redirectCta: "Continuar candidatura no portal oficial",
      };
    },
    async fetchJobs(): Promise<FetchJobsResult> {
      return { jobs: [], method: "pending", pending: true, message: opts.reason };
    },
    async submitApplication(payload: PreparedApplication): Promise<SubmitResult> {
      return {
        ok: false,
        channel: "official_redirect",
        officialUrl: payload.officialUrl,
        message: redirectMessage,
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
}
