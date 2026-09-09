import type { ApplyChannel, JobConnector } from "./types";
import { nearhireConnector } from "./nearhire";
import { empregoCoMzConnector } from "./emprego-co-mz";
import { oEmpregoConnector } from "./o-emprego";
import { saplicConnector } from "./saplic";
import { todasVagasConnector } from "./todas-vagas";
import { jobartisConnector } from "./jobartis";
import { iefpConnector } from "./iefp";
import { itjobsConnector } from "./itjobs";
import { netEmpregosConnector } from "./net-empregos";
import { sapoEmpregoConnector } from "./sapo-emprego";
import { redirectConnector } from "./redirect";

export const PRIMARY_SOURCE_SLUGS = [
  "emprego-mz",
  "oemprego-mz",
  "saplic",
  "todas-vagas",
  "jobartis",
  "iefp",
  "itjobs",
  "net-empregos",
] as const;

const PRIMARY: JobConnector[] = [
  empregoCoMzConnector,
  oEmpregoConnector,
  saplicConnector,
  todasVagasConnector,
  jobartisConnector,
  iefpConnector,
  itjobsConnector,
  netEmpregosConnector,
];

const EXTRA = [
  sapoEmpregoConnector,
  redirectConnector({
    slug: "indeed-pt",
    sourceName: "Indeed Portugal",
    country: "PT",
    reason: "Integração pendente. Aguardando parceria ou API oficial.",
  }),
  redirectConnector({
    slug: "expresso-emprego",
    sourceName: "Expresso Emprego",
    country: "PT",
    reason: "Integração pendente. Aguardando parceria ou API oficial.",
  }),
  redirectConnector({
    slug: "linkedin",
    sourceName: "LinkedIn",
    country: "XX",
    reason: "Integração pendente. Aguardando parceria oficial.",
  }),
  redirectConnector({
    slug: "indeed",
    sourceName: "Indeed",
    country: "XX",
    reason: "Integração pendente. Aguardando parceria oficial.",
  }),
  redirectConnector({
    slug: "eures",
    sourceName: "EURES",
    country: "PT",
    reason: "Integração pendente. Aguardando parceria oficial.",
  }),
];

const BY_SLUG: Record<string, JobConnector> = {
  nearhire: nearhireConnector,
};
for (const c of [...PRIMARY, ...EXTRA]) BY_SLUG[c.slug] = c;

const NAME_TO_SLUG: Record<string, string> = {
  nearhire: "nearhire",
  "auxiliar de vagas": "nearhire",
  "auxilar de vagas": "nearhire",
  "emprego.co.mz": "emprego-mz",
  emprego: "emprego-mz",
  "o emprego": "oemprego-mz",
  saplic: "saplic",
  todasvagas: "todas-vagas",
  "todas vagas": "todas-vagas",
  jobartis: "jobartis",
  "iefp online": "iefp",
  iefp: "iefp",
  itjobs: "itjobs",
  "net-empregos": "net-empregos",
  "net empregos": "net-empregos",
  "sapo emprego": "sapo-emprego",
  "indeed portugal": "indeed-pt",
  "expresso emprego": "expresso-emprego",
  linkedin: "linkedin",
  indeed: "indeed",
  eures: "eures",
};

export function sourceSlugFrom(sourceName?: string | null, sourceId?: number | null) {
  if (sourceId === 1) return "nearhire";
  if (sourceId === 2) return "emprego-mz";
  if (sourceId === 3) return "oemprego-mz";
  if (sourceId === 4) return "jobartis";
  if (sourceId === 5) return "iefp";
  if (sourceId === 6) return "net-empregos";
  if (sourceId === 8) return "sapo-emprego";
  if (sourceId === 10) return "itjobs";
  if (sourceId === 14) return "saplic";
  if (sourceId === 15) return "todas-vagas";
  const key = (sourceName ?? "").trim().toLowerCase();
  if (!key || key === "nearhire" || key === "recruiter" || key === "auxiliar de vagas" || key === "auxilar de vagas") return "nearhire";
  return NAME_TO_SLUG[key] ?? key.replace(/\s+/g, "-");
}

export function getConnector(sourceName?: string | null, sourceId?: number | null): JobConnector {
  const slug = sourceSlugFrom(sourceName, sourceId);
  return (
    BY_SLUG[slug] ??
    redirectConnector({
      slug,
      sourceName: sourceName || slug,
      country: "XX",
      reason: "Sem integração oficial de candidaturas para esta fonte.",
    })
  );
}

export function getConnectorBySlug(slug: string): JobConnector | null {
  return BY_SLUG[slug] ?? null;
}

export function listConnectors(): JobConnector[] {
  const seen = new Set<string>();
  const out: JobConnector[] = [];
  for (const c of [nearhireConnector, ...PRIMARY, ...EXTRA]) {
    if (seen.has(c.slug)) continue;
    seen.add(c.slug);
    out.push(c);
  }
  return out;
}

export function listPrimaryConnectors(): JobConnector[] {
  return PRIMARY;
}

export function resolveApplyChannel(input: {
  applyMethod?: string | null;
  sourceName?: string | null;
  sourceId?: number | null;
  applyEmail?: string | null;
}): ApplyChannel {
  if (input.applyMethod === "platform") return "internal";
  if (input.applyMethod === "email") return "email";
  const connector = getConnector(input.sourceName, input.sourceId);
  if (connector.slug === "nearhire") return "internal";
  if (connector.capabilities().supportsApplicationSubmission) return "official_api";
  if (input.applyEmail) return "email";
  return "official_redirect";
}

export function methodLabel(channel: ApplyChannel) {
  if (channel === "official_api") return "Candidatura rápida";
  if (channel === "internal") return "Candidatura no nosso site";
  if (channel === "email") return "Candidatura por e-mail";
  return "Candidatura no portal oficial";
}

export function methodHint(channel: ApplyChannel) {
  return methodLabel(channel);
}

export type { ApplyChannel, ConnectorCapabilities, JobConnector, PreparedApplication, SubmitResult, NormalizedJob, FetchJobsResult } from "./types";
