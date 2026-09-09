import { env } from "@/lib/env.server";
import type { NormalizedJob } from "./types";

export type RssItem = {
  title: string;
  link: string;
  description: string;
  company: string;
  pubDate?: string;
  categories: string[];
  creator: string;
};

const NAMED_ENTITIES: Record<string, string> = {
  lt: "<",
  gt: ">",
  amp: "&",
  quot: '"',
  apos: "'",
  nbsp: " ",
  aacute: "á",
  eacute: "é",
  iacute: "í",
  oacute: "ó",
  uacute: "ú",
  Aacute: "Á",
  Eacute: "É",
  Iacute: "Í",
  Oacute: "Ó",
  Uacute: "Ú",
  agrave: "à",
  egrave: "è",
  igrave: "ì",
  ograve: "ò",
  ugrave: "ù",
  Agrave: "À",
  atilde: "ã",
  otilde: "õ",
  Atilde: "Ã",
  Otilde: "Õ",
  ntilde: "ñ",
  Ntilde: "Ñ",
  auml: "ä",
  euml: "ë",
  iuml: "ï",
  ouml: "ö",
  uuml: "ü",
  ccedil: "ç",
  Ccedil: "Ç",
  rsquo: "'",
  lsquo: "'",
  rdquo: '"',
  ldquo: '"',
  ndash: "–",
  mdash: "—",
  hellip: "…",
  euro: "€",
};

const PLACE_ALIASES: Record<string, string> = {
  lisbon: "Lisboa",
  "ilha da madeira": "Madeira",
  madeira: "Madeira",
  acores: "Açores",
  "regiao autonoma da madeira": "Madeira",
  "regiao autonoma dos acores": "Açores",
  "maputo city": "Cidade de Maputo",
  "cidade de maputo": "Cidade de Maputo",
  "maputo province": "Província de Maputo",
  "maputo provincia": "Província de Maputo",
  setubal: "Setúbal",
  evora: "Évora",
  braganca: "Bragança",
  santarem: "Santarém",
};

const URL_PLACE_HINTS: Record<string, string> = {
  matola: "Matola",
  maputo: "Maputo",
  beira: "Beira",
  nampula: "Nampula",
  pemba: "Pemba",
  tete: "Tete",
  chimoio: "Chimoio",
  quelimane: "Quelimane",
  lichinga: "Lichinga",
  inhambane: "Inhambane",
  maxixe: "Maxixe",
  dondo: "Dondo",
  nacala: "Nacala",
  xai: "Xai-Xai",
  gaza: "Gaza",
  sofala: "Sofala",
  manica: "Manica",
  niassa: "Niassa",
  zambezia: "Zambézia",
  luanda: "Luanda",
  benguela: "Benguela",
  huambo: "Huambo",
  lubango: "Lubango",
  cabinda: "Cabinda",
  lisboa: "Lisboa",
  lisbon: "Lisboa",
  porto: "Porto",
  faro: "Faro",
  coimbra: "Coimbra",
  braga: "Braga",
  aveiro: "Aveiro",
  setubal: "Setúbal",
  leiria: "Leiria",
  santarem: "Santarém",
  viseu: "Viseu",
  madeira: "Madeira",
  acores: "Açores",
  cascais: "Cascais",
  sintra: "Sintra",
  amadora: "Amadora",
};

function decodeEntities(s: string) {
  let out = s;
  for (let i = 0; i < 3; i += 1) {
    const next = out
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
      .replace(/&([a-z]+);/gi, (m, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
    if (next === out) break;
    out = next;
  }
  return out;
}

function stripTags(s: string) {
  return decodeEntities(s)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h\d|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function foldPlace(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isGarbagePlaceName(value?: string | null) {
  if (!value) return true;
  const t = value.trim();
  if (t.length < 2 || t.length > 48) return true;
  if (/[<>{}]|https?:|&(?:lt|gt);|<br|descri|categoria|empresa|todas as zonas/i.test(t)) return true;
  if (!/[A-Za-zÀ-ÿ]/.test(t)) return true;
  return false;
}

export function cleanPlaceName(value?: string | null) {
  if (!value) return null;
  let t = stripTags(value).split("\n")[0].replace(/^[:\-–]+\s*/, "").trim();
  t = t.replace(/\s+/g, " ");
  t = t.replace(/\s*\([^)]*(todas as zonas|todo o pa[ií]s|nacional)[^)]*\)/gi, "").trim();
  t = t.replace(/\s*[-–]\s*(todas as zonas).*$/i, "").trim();
  if (/^(todas as zonas|todo o pa[ií]s|nacional|a definir|portugal|mocambique|moçambique|angola)$/i.test(t)) {
    return null;
  }
  if (t.length < 2 || t.length > 48) return null;
  if (/[<>{}]|https?:|descri|categoria|empresa/i.test(t)) return null;
  if (/\b(lda|unipessoal|limitada|s\.a\.?)\b/i.test(t)) return null;
  if (!/[A-Za-zÀ-ÿ]/.test(t)) return null;
  const aliased = PLACE_ALIASES[foldPlace(t)];
  return aliased || t;
}

export function splitPlace(value?: string | null): { city: string | null; region: string | null } {
  const cleaned = cleanPlaceName(value);
  if (!cleaned) return { city: null, region: null };
  const parts = cleaned.split(/\s*[-–\/,]\s*/).map((p) => cleanPlaceName(p)).filter(Boolean) as string[];
  if (parts.length >= 2) {
    return { region: parts[0], city: parts[parts.length - 1] };
  }
  return { city: cleaned, region: cleaned };
}

export function cleanCompanyName(value?: string | null) {
  if (!value) return "";
  let t = stripTags(value).split("\n")[0].replace(/\s+/g, " ").trim();
  t = t.replace(/\s*[-–]\s*(Lisboa|Porto|Faro|Coimbra|Braga|Aveiro|Setúbal|Madeira|Açores)\s*$/i, "").trim();
  return t.slice(0, 120);
}

export function placeFromUrl(url?: string | null): string | null {
  if (!url) return null;
  let path = url.split("?")[0] ?? url;
  try {
    path = decodeURIComponent(path);
  } catch {
    /* keep raw */
  }
  const tokens = path.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    const two = i > 0 ? `${tokens[i - 1]}-${tokens[i]}` : "";
    if (two && URL_PLACE_HINTS[two]) return URL_PLACE_HINTS[two];
    if (URL_PLACE_HINTS[tokens[i]]) return URL_PLACE_HINTS[tokens[i]];
  }
  return null;
}

export function placeFromJobText(text?: string | null, url?: string | null) {
  const fromField = fieldFromText(text || "", [
    "Zona",
    "Localização",
    "Localizacao",
    "Local",
    "Cidade",
    "Concelho",
    "Distrito",
  ]);
  return splitPlace(fromField || placeFromUrl(url));
}

function tag(block: string, name: string) {
  const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i");
  return block.match(re)?.[1]?.trim() ?? "";
}

export function parseRssItems(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const blocks = xml.split(/<item[\s>]/i).slice(1);
  for (const raw of blocks) {
    const block = raw.split(/<\/item>/i)[0] ?? raw;
    const title = stripTags(tag(block, "title"));
    const link =
      stripTags(tag(block, "link")) ||
      stripTags(tag(block, "guid")) ||
      block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i)?.[1]?.trim() ||
      "";
    const description = stripTags(tag(block, "description") || tag(block, "content:encoded")).slice(0, 4000);
    const creator = cleanCompanyName(tag(block, "dc:creator") || tag(block, "author") || tag(block, "company"));
    const pubDate = tag(block, "pubDate") || tag(block, "published");
    const categories: string[] = [];
    const catRe = /<category[^>]*>([\s\S]*?)<\/category>/gi;
    let cat: RegExpExecArray | null;
    while ((cat = catRe.exec(block))) {
      const label = stripTags(cat[1]);
      if (label && label.length < 60) categories.push(label);
    }
    if (!title || !link) continue;
    items.push({
      title,
      link: decodeEntities(link).trim(),
      description,
      company: creator,
      pubDate: pubDate || undefined,
      categories,
      creator,
    });
  }
  return items;
}

export function extractPublishedEmail(text: string | null | undefined): string | null {
  if (!text) return null;
  const decoded = stripTags(text).replace(/mailto:/gi, " ");
  const junk = /noreply|no-reply|donotreply|unsubscribe|privacy@|sentry@|example\.com|invent@/i;
  const labeled = decoded.match(
    /(?:e-?mails?|candidat\w*|recrutamento|recursos humanos|\brh\b|envie(?:\s+o)?\s+(?:o\s+)?cv|para)[^\n@]{0,80}([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i,
  );
  if (labeled?.[1] && !junk.test(labeled[1])) return labeled[1].toLowerCase();
  const found = decoded.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) ?? [];
  const unique = [...new Set(found.map((e) => e.toLowerCase()))].filter((e) => !junk.test(e));
  const role = unique.find((e) =>
    /^(recrutamento|rh|hr|jobs?|cv|candidatura|carreiras|pessoas|talent|admiss)/i.test(e),
  );
  if (role) return role;
  if (unique.length === 1) return unique[0];
  const companyDomain = unique.find((e) => !/@(gmail|yahoo|hotmail|outlook|live|icloud)\./i.test(e));
  return companyDomain ?? null;
}

export function fieldFromText(text: string, labels: string[]) {
  const cleaned = stripTags(text);
  const lines = cleaned.split("\n");
  for (const line of lines) {
    for (const label of labels) {
      const re = new RegExp(`^${label}\\s*[:\\-–]\\s*(.+)$`, "i");
      const m = line.trim().match(re);
      if (m?.[1]) return m[1].replace(/\s+/g, " ").trim().slice(0, 80);
    }
  }
  const re = new RegExp(`(?:${labels.join("|")})\\s*[:\\-–]\\s*([^\\n]{2,60})`, "i");
  return re.exec(cleaned)?.[1]?.trim() || null;
}

export function mapEmployment(value?: string | null) {
  const v = (value ?? "").toLowerCase();
  if (/est[aá]gio|internship|intern/.test(v)) return "internship";
  if (/parcial|part[-\s]?time|meio\s*per[ií]odo/.test(v)) return "part-time";
  if (/tempor/.test(v)) return "temporary";
  if (/freelance|recibo|prest[aá]/.test(v)) return "freelance";
  if (/contrato/.test(v) && !/sem termo|indetermin/.test(v)) return "contract";
  return "full-time";
}

export function mapWorkModel(value?: string | null) {
  const v = (value ?? "").toLowerCase();
  if (/remot/.test(v)) return "remote";
  if (/h[ií]brid/.test(v)) return "hybrid";
  return "on-site";
}

export function mapCategory(value?: string | null) {
  const v = (value ?? "").toLowerCase();
  if (/inform[aá]tica|programa|software|it |ti |tecnolog/.test(v)) return "Informática e tecnologia";
  if (/contabil|finan[cç]|economia/.test(v)) return "Contabilidade e Finanças";
  if (/sa[uú]de|enferm|cl[ií]nic/.test(v)) return "Saúde";
  if (/educa|professor|ensino/.test(v)) return "Educação";
  if (/engenh/.test(v)) return "Engenharia";
  if (/log[ií]st|armaz[eé]m|motorista|condu/.test(v)) return "Logística";
  if (/venda|comercial/.test(v)) return "Vendas";
  if (/marketing|publicidade/.test(v)) return "Marketing";
  if (/restaura|hotel|cozinha|mesa|bar/.test(v)) return "Hotelaria e restauração";
  if (/constru/.test(v)) return "Construção";
  if (/seguran/.test(v)) return "Segurança";
  if (/ong|humanit/.test(v)) return "ONG";
  if (/rh|recursos humanos/.test(v)) return "Recursos humanos";
  if (/banca|banco/.test(v)) return "Banca";
  if (/atendim|cliente|call.?center/.test(v)) return "Atendimento ao cliente";
  if (/agric/.test(v)) return "Agricultura";
  if (/admin/.test(v)) return "Administração";
  return null;
}

const EMPLOYMENT_LABELS = /tempo inteiro|full[-\s]?time|parcial|part[-\s]?time|est[aá]gio|contrato|freelance|tempor/i;

export function rssItemToJob(item: RssItem, country: string): NormalizedJob {
  const blob = `${item.title}\n${item.description}\n${item.categories.join(" ")}`;
  const company = cleanCompanyName(
    item.company || fieldFromText(item.description, ["Empresa", "Entidade", "Recrutador"]) || "",
  );
  const cityHint =
    item.categories.find((c) => !EMPLOYMENT_LABELS.test(c) && cleanPlaceName(c)) ||
    fieldFromText(item.description, ["Zona", "Localização", "Localizacao", "Local", "Cidade", "Concelho", "Distrito"]) ||
    placeFromUrl(item.link);
  const split = splitPlace(cityHint);
  const employmentRaw =
    item.categories.find((c) => EMPLOYMENT_LABELS.test(c)) ||
    fieldFromText(item.description, ["Tipo", "Contrato", "Regime"]);
  const categoryRaw = fieldFromText(item.description, ["Categoria", "Área", "Area"]) || item.categories[0];
  let title = item.title.replace(/\s+[—–]\s+.+$/, "").trim();
  title = title.replace(/^vaga para\s*(?:\(\d+\))?\s*/i, "").trim() || item.title;
  return {
    externalId: item.link,
    title,
    company,
    city: split.city,
    region: split.region,
    countryCode: country,
    category: mapCategory(categoryRaw),
    employmentType: mapEmployment(employmentRaw || blob),
    workModel: mapWorkModel(blob),
    description: item.description,
    applyEmail: extractPublishedEmail(item.description),
    applyUrl: item.link,
    originalUrl: item.link,
    publishedAt: item.pubDate ?? null,
  };
}

type RawRecord = Record<string, unknown>;

function asString(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number") return String(v);
  return null;
}

function nestedName(v: unknown): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (v && typeof v === "object") {
    const rec = v as RawRecord;
    return asString(rec.name) ?? asString(rec.title) ?? asString(rec.city);
  }
  if (Array.isArray(v) && v[0]) return nestedName(v[0]);
  return null;
}

export function mapApiJob(item: unknown, fallbackCountry: string): NormalizedJob | null {
  if (!item || typeof item !== "object") return null;
  const rec = item as RawRecord;
  const companyObj = rec.company && typeof rec.company === "object" ? (rec.company as RawRecord) : null;
  const title = asString(rec.title) ?? asString(rec.jobTitle) ?? asString(rec.name);
  if (!title) return null;
  const link =
    asString(rec.url) ??
    asString(rec.link) ??
    asString(rec.applyUrl) ??
    asString(rec.original_url) ??
    asString(rec.officialUrl);
  const externalId = asString(rec.id) ?? asString(rec.externalId) ?? asString(rec.external_job_id) ?? link;
  if (!externalId && !link) return null;
  const company = nestedName(rec.company) ?? asString(rec.companyName) ?? asString(rec.employer) ?? "";
  const city =
    nestedName(rec.city) ?? nestedName(rec.location) ?? nestedName(rec.locations) ?? asString(rec.region);
  const description =
    asString(rec.body) ?? asString(rec.description) ?? asString(rec.content) ?? asString(rec.excerpt) ?? "";
  const email =
    asString(rec.applyEmail) ??
    asString(rec.apply_email) ??
    asString(rec.applicationEmail) ??
    asString(companyObj?.email) ??
    extractPublishedEmail(description);
  const published = asString(rec.publishedAt) ?? asString(rec.published) ?? asString(rec.createdAt) ?? asString(rec.updatedAt);
  const expires = asString(rec.expiresAt) ?? asString(rec.expires) ?? asString(rec.deadline);
  const salaryMin = typeof rec.salaryMin === "number" ? rec.salaryMin : typeof rec.salary_min === "number" ? rec.salary_min : null;
  const salaryMax = typeof rec.salaryMax === "number" ? rec.salaryMax : typeof rec.salary_max === "number" ? rec.salary_max : null;
  const logo = asString(companyObj?.logo) ?? asString(rec.company_logo) ?? asString(rec.logo);
  const split = splitPlace(city);
  return {
    externalId: externalId || title,
    title,
    company: cleanCompanyName(company),
    companyLogo: logo,
    city: split.city,
    region: cleanPlaceName(nestedName(rec.region) ?? nestedName(rec.district)) || split.region,
    countryCode: asString(rec.countryCode) ?? asString(rec.country) ?? fallbackCountry,
    category: nestedName(rec.category) ?? nestedName(rec.types),
    employmentType: asString(rec.employmentType) ?? nestedName(rec.types),
    workModel: asString(rec.workModel) ?? asString(rec.remote),
    salaryMin,
    salaryMax,
    currency: asString(rec.currency) ?? asString(rec.salaryCurrency),
    description,
    requirements: asString(rec.requirements),
    qualifications: asString(rec.qualifications),
    applyEmail: email,
    applyUrl: link,
    originalUrl: link,
    publishedAt: published,
    expiresAt: expires,
  };
}

export function jobsFromUnknownPayload(payload: unknown, country: string): NormalizedJob[] {
  const list = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object"
      ? ((payload as RawRecord).results ??
          (payload as RawRecord).jobs ??
          (payload as RawRecord).items ??
          (payload as RawRecord).data ??
          [])
      : [];
  if (!Array.isArray(list)) return [];
  const out: NormalizedJob[] = [];
  for (const row of list) {
    const mapped = mapApiJob(row, country);
    if (mapped) out.push(mapped);
  }
  return out;
}

export async function fetchRssXml(feedUrl: string): Promise<string> {
  const res = await fetch(feedUrl, {
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml, application/atom+xml, */*",
      "User-Agent": "AuxilarDeVagas/1.0 (job aggregator; public RSS)",
    },
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) throw new Error(`RSS HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  const ct = res.headers.get("content-type") ?? "";
  let charset = "utf-8";
  const headerCs = ct.match(/charset=([^\s;]+)/i)?.[1]?.trim().replace(/['"]/g, "").toLowerCase();
  if (headerCs) charset = headerCs;
  const head = new TextDecoder("latin1").decode(new Uint8Array(buf).slice(0, 240));
  const decl = head.match(/encoding=["']([^"']+)["']/i)?.[1]?.toLowerCase();
  if (decl) charset = decl;
  const label =
    charset === "iso-8859-1" || charset === "latin1" || charset === "windows-1252" || charset === "iso-8859-15"
      ? "iso-8859-1"
      : "utf-8";
  const xml = new TextDecoder(label).decode(buf);
  if (/captcha|cloudflare|just a moment/i.test(xml.slice(0, 2000)) && !xml.includes("<item")) {
    throw new Error("Feed bloqueado por protecção anti-bot");
  }
  return xml;
}

export async function fetchRssJobs(feedUrl: string, country: string): Promise<NormalizedJob[]> {
  const xml = await fetchRssXml(feedUrl);
  return parseRssItems(xml).map((item) => rssItemToJob(item, country));
}

export async function fetchJsonJobs(opts: {
  endpoint: string;
  apiKey?: string;
  country: string;
  method?: "GET" | "POST";
}): Promise<NormalizedJob[]> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.apiKey) headers.Authorization = `Bearer ${opts.apiKey}`;
  const res = await fetch(opts.endpoint, {
    method: opts.method ?? "GET",
    headers,
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`API HTTP ${res.status}`);
  const payload = await res.json();
  return jobsFromUnknownPayload(payload, opts.country);
}

export async function fetchAuthorizedJobs(opts: {
  country: string;
  apiUrlKey: string;
  apiKeyKey?: string;
  feedUrlKey: string;
  publicFeedUrl?: string;
}): Promise<{ jobs: NormalizedJob[]; method: "api" | "rss" | "pending" }> {
  const apiUrl = env(opts.apiUrlKey);
  const apiKey = opts.apiKeyKey ? env(opts.apiKeyKey) : undefined;
  const feedUrl = env(opts.feedUrlKey) || opts.publicFeedUrl;
  if (apiUrl) {
    const jobs = await fetchJsonJobs({ endpoint: apiUrl, apiKey, country: opts.country });
    return { jobs, method: "api" };
  }
  if (feedUrl) {
    const jobs = await fetchRssJobs(feedUrl, opts.country);
    return { jobs, method: "rss" };
  }
  return { jobs: [], method: "pending" };
}
