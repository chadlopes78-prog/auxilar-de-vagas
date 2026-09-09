export const STATUS_PT: Record<string, string> = {
  prepared: "Preparada",
  sending: "Enviando",
  sent: "Enviada",
  applied: "Enviada",
  received: "Recebida",
  viewed: "Recebida",
  under_review: "Em análise",
  "under review": "Em análise",
  interview: "Entrevista",
  accepted: "Aceite",
  rejected: "Não selecionada",
  send_error: "Erro de envio",
  external_managed: "Estado gerido pelo portal externo.",
};

export const METHOD_PT: Record<string, string> = {
  internal: "Candidatura no nosso site",
  official_api: "Candidatura rápida",
  email: "Candidatura por e-mail",
  official_redirect: "Candidatura no portal oficial",
};

export const CANDIDATE_STATUSES = [
  "prepared",
  "sending",
  "sent",
  "received",
  "under_review",
  "interview",
  "accepted",
  "rejected",
  "send_error",
] as const;

export const ROLE_PT: Record<string, string> = {
  candidate: "Candidato",
  employer: "Empregador",
  admin: "Administrador",
};

export const SOURCE_STATUS_PT: Record<string, string> = {
  active: "ATIVA",
  inactive: "INATIVA",
  pending: "PENDENTE",
  error: "ERRO",
};

export const COUNTRY_META: Record<
  string,
  { flag: string; name: string; slug: string; region: string; city: string; hint: string; id: number }
> = {
  MZ: {
    flag: "🇲🇿",
    name: "Moçambique",
    slug: "mocambique",
    region: "Província",
    city: "Cidade",
    hint: "Província e cidade",
    id: 1,
  },
  AO: {
    flag: "🇦🇴",
    name: "Angola",
    slug: "angola",
    region: "Província",
    city: "Município/Cidade",
    hint: "Província e município",
    id: 2,
  },
  PT: {
    flag: "🇵🇹",
    name: "Portugal",
    slug: "portugal",
    region: "Distrito",
    city: "Concelho/Cidade",
    hint: "Distrito e concelho",
    id: 4,
  },
};

export const PRIMARY_COUNTRY_SLUGS = ["mocambique", "angola", "portugal"] as const;

export const CATEGORY_PT: Record<string, string> = {
  administration: "Administração",
  "accounting-finance": "Contabilidade e Finanças",
  agriculture: "Agricultura",
  banking: "Banca",
  "customer-service": "Atendimento ao cliente",
  education: "Educação",
  engineering: "Engenharia",
  healthcare: "Saúde",
  "human-resources": "Recursos humanos",
  "it-technology": "Informática e tecnologia",
  logistics: "Logística",
  marketing: "Marketing",
  sales: "Vendas",
  hospitality: "Hotelaria e restauração",
  construction: "Construção",
  security: "Segurança",
  ngo: "ONG",
  other: "Outros",
};

const REGION_NAME_PT: Record<string, string> = {
  "Maputo City": "Cidade de Maputo",
  "Maputo Province": "Província de Maputo",
  "Western Cape": "Cabo Ocidental",
};

const CITY_NAME_PT: Record<string, string> = {
  Lisbon: "Lisboa",
  Johannesburg: "Joanesburgo",
  Pretoria: "Pretória",
  "Cape Town": "Cidade do Cabo",
};

const REGION_SLUG_ALIASES: Record<string, string> = {
  "Cidade de Maputo": "maputo",
  "Maputo City": "maputo",
  Maputo: "maputo",
  "Província de Maputo": "maputo-provincia",
  "Maputo Province": "maputo-provincia",
};

const CITY_SLUG_ALIASES: Record<string, string> = {
  Lisbon: "lisboa",
  Lisboa: "lisboa",
  "Cidade do Cabo": "cidade-do-cabo",
};

export function regionLabel(code?: string | null) {
  return COUNTRY_META[code ?? ""]?.region ?? "Província";
}

export function cityLabel(code?: string | null) {
  return COUNTRY_META[code ?? ""]?.city ?? "Cidade";
}

export function countryFlag(code?: string | null) {
  return COUNTRY_META[code ?? ""]?.flag ?? "";
}

export function countrySlug(code: string) {
  return COUNTRY_META[code]?.slug ?? code.toLowerCase();
}

export function slugToCountryCode(slug: string) {
  const s = slug.toLowerCase();
  if (s === "mocambique" || s === "mozambique") return "MZ";
  if (s === "angola") return "AO";
  if (s === "portugal") return "PT";
  return null;
}

export function slugToCountryName(slug: string) {
  const code = slugToCountryCode(slug);
  return code ? COUNTRY_META[code].name : titleCaseSlug(slug);
}

export function toSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function titleCaseSlug(slug: string) {
  return slug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function displayPlace(name: string) {
  if (!name) return name;
  if (name === name.toLowerCase()) return titleCaseSlug(name);
  return name;
}

export function localizeRegionName(name: string) {
  return REGION_NAME_PT[name] ?? name;
}

export function localizeCityName(name: string) {
  return CITY_NAME_PT[name] ?? name;
}

export function localizeCategoryName(slug: string, name: string) {
  return CATEGORY_PT[slug] ?? name;
}

export function regionToSlug(name: string) {
  const n = name.trim();
  if (REGION_SLUG_ALIASES[n]) return REGION_SLUG_ALIASES[n];
  return toSlug(n).replace(/^(cidade-de-|provincia-de-|distrito-de-)/, "");
}

export function regionMatchesSlug(name: string, slug: string) {
  const want = toSlug(slug);
  if (!want) return false;
  if (regionToSlug(name) === want) return true;
  if (toSlug(name) === want) return true;
  if (want === "maputo" && /maputo/i.test(name) && !/provinc/i.test(name)) return true;
  return false;
}

export function cityToSlug(name: string) {
  const n = name.trim();
  if (CITY_SLUG_ALIASES[n]) return CITY_SLUG_ALIASES[n];
  return toSlug(n);
}

export function cityMatchesSlug(name: string, slug: string) {
  const want = toSlug(slug);
  if (!want) return false;
  if (cityToSlug(name) === want) return true;
  if (toSlug(name) === want) return true;
  return false;
}

export function formatSyncedAt(iso?: string | null) {
  if (!iso) return "Nunca";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "Nunca";
  const mins = Math.max(0, Math.floor((Date.now() - t) / 60000));
  if (mins < 1) return "Agora mesmo";
  if (mins < 60) return `Há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Ontem";
  return `Há ${days} dias`;
}

export function integrationLabel(type: string) {
  if (type === "rss") return "RSS";
  if (type === "api") return "API";
  if (type === "manual" || type === "direct") return "Manual";
  if (type === "official_redirect") return "Pendente";
  return "Desactivada";
}

export function canSyncSource(source: {
  integrationType?: string;
  feedUrl?: string | null;
  active?: boolean;
  syncable?: boolean;
  supportsJobsImport?: boolean;
}) {
  if (source.syncable) return true;
  if (source.supportsJobsImport) return true;
  return (
    Boolean(source.active) &&
    Boolean(source.feedUrl) &&
    (source.integrationType === "rss" || source.integrationType === "api")
  );
}

export function jobCountLabel(n: number) {
  return n === 1 ? "1 vaga" : `${n} vagas`;
}
