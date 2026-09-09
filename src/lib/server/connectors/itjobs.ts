import { env } from "@/lib/env.server";
import { definePortalConnector } from "./define";
import { fetchAuthorizedJobs, jobsFromUnknownPayload } from "./rss";
import type { FetchJobsResult, NormalizedJob } from "./types";

const OFFICIAL_LIST = "https://api.itjobs.pt/job/list.json";

async function fetchItJobsOfficial(apiKey: string): Promise<NormalizedJob[]> {
  const out: NormalizedJob[] = [];
  for (let page = 1; page <= 12; page += 1) {
    const body = new URLSearchParams({
      api_key: apiKey,
      limit: "50",
      page: String(page),
    });
    const res = await fetch(OFFICIAL_LIST, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`ITJobs API HTTP ${res.status}`);
    const payload = (await res.json()) as { total?: number; results?: unknown[] };
    const chunk = jobsFromUnknownPayload(payload, "PT");
    for (const job of chunk) {
      if (!job.originalUrl && job.externalId) {
        job.originalUrl = `https://www.itjobs.pt/oferta/${job.externalId}`;
        job.applyUrl = job.originalUrl;
      }
      out.push(job);
    }
    if (chunk.length < 50) break;
    if (typeof payload.total === "number" && out.length >= payload.total) break;
  }
  return out;
}

async function fetchJobs(): Promise<FetchJobsResult> {
  const apiKey = env("ITJOBS_API_KEY");
  if (apiKey) {
    const jobs = await fetchItJobsOfficial(apiKey);
    return { jobs, method: "api", pending: false };
  }
  const fallback = await fetchAuthorizedJobs({
    country: "PT",
    apiUrlKey: "ITJOBS_JOBS_API_URL",
    apiKeyKey: "ITJOBS_API_KEY",
    feedUrlKey: "ITJOBS_JOBS_FEED_URL",
  });
  if (fallback.method === "pending") {
    return {
      jobs: [],
      method: "pending",
      pending: true,
      message:
        "Integração pendente. A API oficial da ITJobs exige uma chave (ITJOBS_API_KEY). Sem credenciais não importamos vagas.",
    };
  }
  return { jobs: fallback.jobs, method: fallback.method, pending: false };
}

export const itjobsConnector = definePortalConnector({
  slug: "itjobs",
  sourceName: "ITJobs",
  country: "PT",
  envPrefix: "ITJOBS",
  extraImportEnv: "ITJOBS_API_KEY",
  pendingReason:
    "Integração pendente. A ITJobs tem API oficial, mas exige chave. Sem ITJOBS_API_KEY a fonte permanece inactiva.",
  readyReason: "API oficial da ITJobs configurada.",
  fetchJobs,
});
