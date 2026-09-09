import type { JobConnector, ConnectorCapabilities, PreparedApplication, SubmitResult, StatusSyncResult, FetchJobsResult } from "./types";

export const nearhireConnector: JobConnector = {
  slug: "nearhire",
  sourceName: "Auxilar de Vagas",
  country: "MZ",
  capabilities(): ConnectorCapabilities {
    return {
      slug: "nearhire",
      sourceName: "Auxilar de Vagas",
      country: "MZ",
      integrationType: "direct",
      supportsJobsImport: false,
      supportsJobPublish: true,
      supportsApplicationSubmission: true,
      supportsApplicationStatus: true,
      supportsCvUpload: true,
      supportsProfileSync: true,
      enabled: true,
      status: "ready",
      reason: "Candidatura interna na plataforma Auxilar de Vagas.",
      credentialsReference: null,
      redirectTitle: "Candidatura no nosso site",
      redirectMessage: "",
      redirectCta: "Enviar candidatura",
    };
  },
  async fetchJobs(): Promise<FetchJobsResult> {
    return { jobs: [], method: "direct", pending: false, message: "Vagas publicadas directamente no Auxilar de Vagas." };
  },
  async submitApplication(_payload: PreparedApplication): Promise<SubmitResult> {
    return {
      ok: true,
      channel: "internal",
      externalApplicationId: null,
      externalStatus: "sent",
      httpCode: null,
      message: "Candidatura enviada com sucesso.",
    };
  },
  async syncStatus(): Promise<StatusSyncResult> {
    return {
      supported: true,
      externalStatus: null,
      mappedStatus: null,
      message: "Estado gerido no Auxilar de Vagas.",
    };
  },
};
