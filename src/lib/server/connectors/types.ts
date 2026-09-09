export type ApplyChannel = "internal" | "official_api" | "email" | "official_redirect";

export type ConnectorStatus =
  | "ready"
  | "awaiting_credentials"
  | "awaiting_partnership"
  | "disabled";

export type ConnectorCapabilities = {
  slug: string;
  sourceName: string;
  country: string;
  integrationType: string;
  supportsJobsImport: boolean;
  supportsJobPublish: boolean;
  supportsApplicationSubmission: boolean;
  supportsApplicationStatus: boolean;
  supportsCvUpload: boolean;
  supportsProfileSync: boolean;
  enabled: boolean;
  status: ConnectorStatus;
  reason: string;
  credentialsReference: string | null;
  redirectTitle: string;
  redirectMessage: string;
  redirectCta: string;
};

export type NormalizedJob = {
  externalId: string;
  title: string;
  company: string;
  companyLogo?: string | null;
  city?: string | null;
  region?: string | null;
  countryCode: string;
  category?: string | null;
  employmentType?: string | null;
  workModel?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string | null;
  description?: string | null;
  requirements?: string | null;
  qualifications?: string | null;
  applyEmail?: string | null;
  applyUrl?: string | null;
  originalUrl?: string | null;
  publishedAt?: string | null;
  expiresAt?: string | null;
};

export type FetchJobsResult = {
  jobs: NormalizedJob[];
  method: "api" | "rss" | "pending" | "direct";
  pending?: boolean;
  message?: string;
};

export type PreparedApplication = {
  jobId: number;
  externalJobId: string | null;
  officialUrl: string | null;
  applyEmail: string | null;
  sourceSlug: string;
  sourceName: string;
  title: string;
  companyName: string;
  countryName: string | null;
  candidate: {
    fullName: string;
    email: string;
    phone: string;
    cvName: string | null;
    coverLetter: string;
    linkedin: string | null;
    title: string | null;
    about: string | null;
  };
  answers?: Record<string, string | string[]>;
};

export type SubmitResult =
  | {
      ok: true;
      channel: "internal" | "official_api" | "email";
      externalApplicationId: string | null;
      externalStatus: string | null;
      httpCode: number | null;
      message: string;
    }
  | {
      ok: false;
      channel: "official_redirect";
      officialUrl: string | null;
      message: string;
    }
  | {
      ok: false;
      channel: "official_api" | "internal" | "email";
      httpCode: number | null;
      message: string;
    };

export type StatusSyncResult = {
  supported: boolean;
  externalStatus: string | null;
  mappedStatus: string | null;
  message: string;
};

export interface JobConnector {
  slug: string;
  sourceName: string;
  country: string;
  capabilities(): ConnectorCapabilities;
  fetchJobs(): Promise<FetchJobsResult>;
  submitApplication(payload: PreparedApplication): Promise<SubmitResult>;
  syncStatus(externalApplicationId: string): Promise<StatusSyncResult>;
}
