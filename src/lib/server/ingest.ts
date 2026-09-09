import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { fingerprint, likelySameJob } from "@/lib/utils";
import { toSlug } from "@/lib/i18n";
import { extractPublishedEmail, cleanPlaceName, cleanCompanyName, placeFromJobText, isGarbagePlaceName } from "@/lib/server/connectors/rss";
import { getConnector, getConnectorBySlug, PRIMARY_SOURCE_SLUGS } from "@/lib/server/connectors";
import { writeIntegrationLog } from "@/lib/server/connectors/log";
import type { NormalizedJob } from "@/lib/server/connectors/types";
import type { JobSource } from "@/lib/types";
import { clearLocationCache } from "@/lib/server/jobs";

async function requireAdmin(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ role: string }>`select role from profiles where user_id = ${userId}`;
  if (rows[0]?.role !== "admin") {
    const admins = await sql<{ n: number }>`select count(*)::int as n from profiles where role = 'admin'`;
    if (Number(admins[0]?.n ?? 0) === 0) return sql;
    throw new Error("Apenas administradores");
  }
  return sql;
}

type SourceRow = {
  id: number;
  slug: string;
  name: string;
  country_code: string;
  url: string;
  integration_type: string;
  feed_url: string | null;
  active: boolean;
  status: string;
  last_synced_at: string | null;
  imported_count: number;
  last_error: string | null;
  last_found_count: number | null;
  last_new_count: number | null;
  last_expired_count: number | null;
};

function mapSource(r: SourceRow): JobSource {
  const connector = getConnector(r.name, r.id);
  const caps = connector.capabilities();
  const syncable = caps.supportsJobsImport || ((r.integration_type === "rss" || r.integration_type === "api") && Boolean(r.feed_url) && r.active);
  let uiStatus = r.status;
  if (r.status === "error") uiStatus = "error";
  else if (caps.enabled && caps.supportsJobsImport) uiStatus = r.status === "active" ? "active" : r.status;
  else if (!caps.enabled) uiStatus = r.status === "error" ? "error" : "pending";
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    countryCode: r.country_code,
    url: r.url,
    integrationType: caps.integrationType || r.integration_type,
    feedUrl: r.feed_url,
    active: Boolean(r.active) || caps.enabled,
    status: uiStatus,
    lastSyncedAt: r.last_synced_at ? String(r.last_synced_at) : null,
    importedCount: Number(r.imported_count),
    lastError: r.last_error,
    lastFoundCount: r.last_found_count == null ? null : Number(r.last_found_count),
    lastNewCount: r.last_new_count == null ? null : Number(r.last_new_count),
    lastExpiredCount: r.last_expired_count == null ? null : Number(r.last_expired_count),
    applicationStatus: caps.status,
    applicationReason: caps.reason,
    supportsApplicationSubmission: caps.supportsApplicationSubmission,
    supportsJobsImport: caps.supportsJobsImport,
    supportsApplicationStatus: caps.supportsApplicationStatus,
    syncable,
    primary: (PRIMARY_SOURCE_SLUGS as readonly string[]).includes(r.slug),
  };
}

const SOURCE_SELECT = `id, slug, name, country_code, url, integration_type, feed_url, active, status,
  last_synced_at, imported_count, last_error, last_found_count, last_new_count, last_expired_count`;

let schemaReady: Promise<void> | null = null;

async function ensureAggregatorSchema() {
  const sql = await getSql();
  await sql.query(`alter table companies add column if not exists logo_url text`);
  await sql.query(`alter table job_sources add column if not exists last_found_count integer`);
  await sql.query(`alter table job_sources add column if not exists last_new_count integer`);
  await sql.query(`alter table job_sources add column if not exists last_expired_count integer`);
  await sql.query(`
    create table if not exists job_source_links (
      id serial primary key,
      job_id integer not null references jobs(id) on delete cascade,
      source_id integer not null references job_sources(id) on delete cascade,
      source_name text not null,
      external_job_id text,
      original_url text,
      last_seen_at timestamptz not null default now()
    )
  `);
  await sql.query(`create index if not exists job_source_links_job_idx on job_source_links (job_id)`);
  await sql.query(`
    create unique index if not exists job_source_links_ext_uniq
    on job_source_links (source_id, external_job_id)
    where external_job_id is not null
  `);
  await sql.query(`create index if not exists jobs_source_status_idx on jobs (source_id, status)`);
  await sql.query(`create index if not exists jobs_country_pub_idx on jobs (country_id, status, published_at desc)`);
  await sql.query(`create index if not exists jobs_region_pub_idx on jobs (region_id, status, published_at desc)`);
  await sql.query(`create index if not exists jobs_city_pub_idx on jobs (city_id, status, published_at desc)`);
  await sql.query(`create index if not exists jobs_title_lower_idx on jobs (lower(title))`);
  await sql.query(`
    insert into job_sources (slug, name, country_code, url, integration_type, feed_url, active, status)
    select 'saplic', 'Saplic', 'MZ', 'https://www.saplic.com/mz', 'disabled', null, false, 'pending'
    where not exists (select 1 from job_sources where slug = 'saplic')
  `);
  await sql.query(`
    insert into job_sources (slug, name, country_code, url, integration_type, feed_url, active, status)
    select 'todas-vagas', 'TodasVagas', 'MZ', 'https://todasvagas.com/', 'disabled', null, false, 'pending'
    where not exists (select 1 from job_sources where slug = 'todas-vagas')
  `);
  await sql.query(`update job_sources set name = 'IEFP Online' where slug = 'iefp' and name = 'IEFP'`);
  await sql.query(`update job_sources set name = 'Auxilar de Vagas' where slug = 'nearhire'`);
  await sql.query(`update jobs set source_name = 'Auxilar de Vagas' where source_name in ('NearHire', 'Auxiliar de Vagas')`);
  await sql.query(`
    update job_sources
    set feed_url = coalesce(feed_url, 'https://todasvagas.com/feed'),
        integration_type = case when integration_type in ('disabled', 'official_redirect') then 'rss' else integration_type end
    where slug = 'todas-vagas'
  `);
  await sql.query(`
    update job_sources
    set feed_url = coalesce(feed_url, 'https://www.net-empregos.com/rss.asp'),
        integration_type = case when integration_type in ('disabled', 'official_redirect') then 'rss' else integration_type end
    where slug = 'net-empregos'
  `);
  const ptDistricts: [string, string][] = [
    ["Santarém", "santarem"],
    ["Leiria", "leiria"],
    ["Viseu", "viseu"],
    ["Vila Real", "vila-real"],
    ["Viana do Castelo", "viana-do-castelo"],
    ["Guarda", "guarda"],
    ["Castelo Branco", "castelo-branco"],
    ["Évora", "evora"],
    ["Beja", "beja"],
    ["Portalegre", "portalegre"],
    ["Bragança", "braganca"],
    ["Madeira", "madeira"],
    ["Açores", "acores"],
  ];
  for (const [name, slug] of ptDistricts) {
    await sql.query(
      `insert into regions (country_id, name, slug)
       select 4, $1, $2
       where not exists (
         select 1 from regions
         where country_id = 4 and (lower(coalesce(slug,'')) = lower($2) or lower(name) = lower($1))
       )`,
      [name, slug],
    );
  }
  await sql.query(`
    update job_sources set status = 'pending'
    where active = false
      and coalesce(status, 'inactive') in ('inactive', '')
      and slug in (
        'emprego-mz', 'oemprego-mz', 'saplic', 'todas-vagas',
        'jobartis', 'iefp', 'itjobs', 'net-empregos',
        'indeed-pt', 'sapo-emprego', 'expresso-emprego',
        'linkedin', 'indeed', 'eures'
      )
  `);
  try {
    await ensureCoreVacancies();
  } catch {
    /* catalog is best-effort so listing still works */
  }
  try {
    await cleanupGarbagePlaces();
    await remapImportedPlaces();
  } catch {
    /* listing still filters garbage names */
  }
  clearLocationCache();
}

function readySchema() {
  if (!schemaReady) {
    schemaReady = ensureAggregatorSchema().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

export function ensureAggregatorReady() {
  return readySchema();
}

type CoreJob = {
  company: string;
  industry: string;
  companyDesc: string;
  country: string;
  region: string;
  city: string;
  title: string;
  categoryId: number;
  employmentType: string;
  workModel: string;
  experienceLevel: string;
  salaryMin: number;
  salaryMax: number;
  currency: string;
  description: string;
  responsibilities: string;
  requirements: string;
  qualifications: string;
  benefits: string;
};

const CORE_JOBS: CoreJob[] = [
  {
    company: "Luanda Retail Group",
    industry: "Retalho",
    companyDesc: "Rede de supermercados e conveniência em Angola.",
    country: "AO",
    region: "Luanda",
    city: "Luanda",
    title: "Gestor de loja",
    categoryId: 13,
    employmentType: "full-time",
    workModel: "on-site",
    experienceLevel: "5+",
    salaryMin: 450000,
    salaryMax: 650000,
    currency: "AOA",
    description: "Liderar uma loja de referência em Luanda, com equipa comercial e metas mensais.",
    responsibilities: "Gerir a equipa. Controlar stocks. Garantir o padrão de atendimento.",
    requirements: "Cinco anos em retalho. Liderança de equipas. Disponibilidade imediata.",
    qualifications: "12ª classe. Formação em gestão é uma vantagem.",
    benefits: "Bónus de desempenho. Seguro de saúde.",
  },
  {
    company: "Banco Kwanza",
    industry: "Banca",
    companyDesc: "Serviços financeiros para empresas e particulares em Luanda.",
    country: "AO",
    region: "Luanda",
    city: "Luanda",
    title: "Contabilista",
    categoryId: 2,
    employmentType: "full-time",
    workModel: "hybrid",
    experienceLevel: "3-5",
    salaryMin: 380000,
    salaryMax: 520000,
    currency: "AOA",
    description: "Fecho mensal, relatórios e apoio fiscal a clientes empresariais em Luanda.",
    responsibilities: "Reconciliar contas. Preparar relatórios. Apoiar auditorias.",
    requirements: "Formação em contabilidade. Excel. Experiência com impostos angolanos.",
    qualifications: "Licenciatura em Contabilidade ou equivalente.",
    benefits: "Modelo híbrido. Formação contínua.",
  },
  {
    company: "Nzinga Digital",
    industry: "Tecnologia",
    companyDesc: "Produto e engenharia de software com base em Luanda.",
    country: "AO",
    region: "Luanda",
    city: "Luanda",
    title: "Programador Full Stack",
    categoryId: 10,
    employmentType: "full-time",
    workModel: "hybrid",
    experienceLevel: "3-5",
    salaryMin: 550000,
    salaryMax: 850000,
    currency: "AOA",
    description: "Desenvolvimento de APIs e interfaces para produtos digitais usados em Angola.",
    responsibilities: "Desenhar APIs. Escrever testes. Rever código.",
    requirements: "JavaScript ou TypeScript. React. Node.js. Experiência em produção.",
    qualifications: "Portfólio ou GitHub. Formação em informática ou experiência equivalente.",
    benefits: "Híbrido. Orçamento de formação.",
  },
  {
    company: "Clínica Sagrada Esperança Luanda",
    industry: "Saúde",
    companyDesc: "Cuidados de saúde em Luanda.",
    country: "AO",
    region: "Luanda",
    city: "Luanda",
    title: "Enfermeiro",
    categoryId: 8,
    employmentType: "full-time",
    workModel: "on-site",
    experienceLevel: "1-2",
    salaryMin: 220000,
    salaryMax: 320000,
    currency: "AOA",
    description: "Cuidados de enfermagem numa clínica em Luanda. Acompanhamento de utentes e apoio à equipa médica.",
    responsibilities: "Administrar medicação. Registar evoluções. Apoiar consultas.",
    requirements: "Cédula profissional de enfermagem. Disponibilidade para turnos.",
    qualifications: "Curso médio ou licenciatura em enfermagem.",
    benefits: "Seguro de saúde. Turnos com suplemento.",
  },
  {
    company: "Corredor Luanda Transportes",
    industry: "Logística",
    companyDesc: "Frota de pesados na região de Luanda.",
    country: "AO",
    region: "Luanda",
    city: "Luanda",
    title: "Motorista de pesados",
    categoryId: 11,
    employmentType: "full-time",
    workModel: "on-site",
    experienceLevel: "1-2",
    salaryMin: 180000,
    salaryMax: 260000,
    currency: "AOA",
    description: "Condução de veículos pesados na área de Luanda e corredores nacionais.",
    responsibilities: "Planear rotas. Inspeccionar o veículo. Cumprir guias de marcha.",
    requirements: "Carta de condução categoria C. Dois anos como motorista profissional.",
    qualifications: "12ª classe. Carta C válida.",
    benefits: "Subsídio de alimentação. Alojamento em viagem.",
  },
  {
    company: "Luanda Retail Group",
    industry: "Retalho",
    companyDesc: "Rede de supermercados e conveniência em Angola.",
    country: "AO",
    region: "Luanda",
    city: "Luanda",
    title: "Recepcionista",
    categoryId: 5,
    employmentType: "full-time",
    workModel: "on-site",
    experienceLevel: "entry",
    salaryMin: 120000,
    salaryMax: 170000,
    currency: "AOA",
    description: "Atendimento na recepção de um escritório comercial em Luanda.",
    responsibilities: "Receber visitantes. Gerir chamadas. Apoiar a agenda.",
    requirements: "Boa comunicação em português. Organização.",
    qualifications: "12ª classe.",
    benefits: "Horário diurno. Subsídio de transporte.",
  },
  {
    company: "Benguela Logística",
    industry: "Logística",
    companyDesc: "Operações portuárias e de carga em Benguela.",
    country: "AO",
    region: "Benguela",
    city: "Benguela",
    title: "Supervisor de armazém",
    categoryId: 11,
    employmentType: "full-time",
    workModel: "on-site",
    experienceLevel: "3-5",
    salaryMin: 250000,
    salaryMax: 360000,
    currency: "AOA",
    description: "Coordenar a recepção e expedição de mercadorias no armazém de Benguela.",
    responsibilities: "Planear turnos. Controlar inventário. Formar operadores.",
    requirements: "Experiência em armazém. Liderança de equipas.",
    qualifications: "12ª classe. Curso de logística é uma vantagem.",
    benefits: "Subsídio de alimentação. Horas extraordinárias pagas.",
  },
  {
    company: "Benguela Logística",
    industry: "Logística",
    companyDesc: "Operações portuárias e de carga em Benguela.",
    country: "AO",
    region: "Benguela",
    city: "Lobito",
    title: "Motorista de pesados",
    categoryId: 11,
    employmentType: "full-time",
    workModel: "on-site",
    experienceLevel: "1-2",
    salaryMin: 170000,
    salaryMax: 240000,
    currency: "AOA",
    description: "Transporte de carga entre o Lobito, Benguela e Luanda.",
    responsibilities: "Conduzir em segurança. Entregar mercadoria. Reportar avarias.",
    requirements: "Carta C. Experiência em percursos longos.",
    qualifications: "Carta de condução válida.",
    benefits: "Ajudas de custo de viagem.",
  },
  {
    company: "Escola do Lubango",
    industry: "Educação",
    companyDesc: "Ensino secundário na Huíla.",
    country: "AO",
    region: "Huíla",
    city: "Lubango",
    title: "Professor de Matemática",
    categoryId: 6,
    employmentType: "full-time",
    workModel: "on-site",
    experienceLevel: "1-2",
    salaryMin: 160000,
    salaryMax: 230000,
    currency: "AOA",
    description: "Leccionar Matemática no ensino secundário no Lubango.",
    responsibilities: "Preparar aulas. Avaliar alunos. Participar em reuniões pedagógicas.",
    requirements: "Formação de professor. Experiência a leccionar Matemática.",
    qualifications: "Licenciatura em Ensino de Matemática ou equivalente.",
    benefits: "Férias escolares. Material didáctico.",
  },
  {
    company: "Clínica Planalto Huíla",
    industry: "Saúde",
    companyDesc: "Cuidados de saúde no Lubango.",
    country: "AO",
    region: "Huíla",
    city: "Lubango",
    title: "Enfermeiro",
    categoryId: 8,
    employmentType: "full-time",
    workModel: "on-site",
    experienceLevel: "1-2",
    salaryMin: 180000,
    salaryMax: 260000,
    currency: "AOA",
    description: "Cuidados de enfermagem numa clínica no Lubango.",
    responsibilities: "Administrar medicação. Acompanhar utentes. Apoiar a equipa médica.",
    requirements: "Cédula profissional. Disponibilidade para turnos.",
    qualifications: "Curso de enfermagem.",
    benefits: "Seguro de saúde.",
  },
  {
    company: "Cabinda Energia Serviços",
    industry: "Energia",
    companyDesc: "Serviços de apoio à indústria em Cabinda.",
    country: "AO",
    region: "Cabinda",
    city: "Cabinda",
    title: "Técnico de segurança",
    categoryId: 16,
    employmentType: "full-time",
    workModel: "on-site",
    experienceLevel: "3-5",
    salaryMin: 320000,
    salaryMax: 450000,
    currency: "AOA",
    description: "Garantir procedimentos de segurança em operações em Cabinda.",
    responsibilities: "Inspeccionar locais. Formar equipas. Reportar incidentes.",
    requirements: "Experiência em HSE. Disponibilidade para trabalho de campo.",
    qualifications: "Curso técnico. Certificação de segurança é uma vantagem.",
    benefits: "Alojamento. Subsídio de isolamento.",
  },
  {
    company: "Cabinda Energia Serviços",
    industry: "Energia",
    companyDesc: "Serviços de apoio à indústria em Cabinda.",
    country: "AO",
    region: "Cabinda",
    city: "Cabinda",
    title: "Motorista de pesados",
    categoryId: 11,
    employmentType: "full-time",
    workModel: "on-site",
    experienceLevel: "1-2",
    salaryMin: 200000,
    salaryMax: 280000,
    currency: "AOA",
    description: "Transporte de materiais e pessoal em Cabinda.",
    responsibilities: "Conduzir em segurança. Manter o veículo. Cumprir horários.",
    requirements: "Carta C. Experiência off-road é uma vantagem.",
    qualifications: "Carta de condução válida.",
    benefits: "Alojamento. Subsídio de refeição.",
  },
  {
    company: "Planalto Agro Huambo",
    industry: "Agricultura",
    companyDesc: "Produção agrícola comercial no Huambo.",
    country: "AO",
    region: "Huambo",
    city: "Huambo",
    title: "Técnico agrícola",
    categoryId: 3,
    employmentType: "full-time",
    workModel: "on-site",
    experienceLevel: "1-2",
    salaryMin: 150000,
    salaryMax: 220000,
    currency: "AOA",
    description: "Acompanhar culturas e equipas de campo no Huambo.",
    responsibilities: "Planear sementeira. Reportar produções. Apoiar a colheita.",
    requirements: "Formação agrária. Disponibilidade para trabalho de campo.",
    qualifications: "Curso técnico agrícola.",
    benefits: "Alojamento na fazenda. Subsídio de alimentação.",
  },
  {
    company: "Planalto Agro Huambo",
    industry: "Agricultura",
    companyDesc: "Produção agrícola comercial no Huambo.",
    country: "AO",
    region: "Huambo",
    city: "Huambo",
    title: "Assistente administrativo",
    categoryId: 1,
    employmentType: "full-time",
    workModel: "on-site",
    experienceLevel: "entry",
    salaryMin: 110000,
    salaryMax: 160000,
    currency: "AOA",
    description: "Apoio administrativo ao escritório da fazenda no Huambo.",
    responsibilities: "Organizar arquivos. Atender chamadas. Apoiar pagamentos simples.",
    requirements: "12ª classe. Informática na óptica do utilizador.",
    qualifications: "Ensino médio.",
    benefits: "Horário diurno.",
  },
  {
    company: "Comercial do Lobito",
    industry: "Comércio",
    companyDesc: "Distribuição comercial no litoral de Benguela.",
    country: "AO",
    region: "Benguela",
    city: "Benguela",
    title: "Assistente comercial",
    categoryId: 13,
    employmentType: "full-time",
    workModel: "on-site",
    experienceLevel: "entry",
    salaryMin: 140000,
    salaryMax: 200000,
    currency: "AOA",
    description: "Apoio às vendas e atendimento a clientes em Benguela.",
    responsibilities: "Atender clientes. Actualizar encomendas. Apoiar a loja.",
    requirements: "Boa comunicação. Disponibilidade imediata.",
    qualifications: "12ª classe.",
    benefits: "Comissão sobre vendas.",
  },
  {
    company: "Minas do Vale Tete",
    industry: "Logística",
    companyDesc: "Operações de transporte no corredor de Tete.",
    country: "MZ",
    region: "Tete",
    city: "Tete",
    title: "Motorista de pesados",
    categoryId: 11,
    employmentType: "full-time",
    workModel: "on-site",
    experienceLevel: "1-2",
    salaryMin: 20000,
    salaryMax: 28000,
    currency: "MZN",
    description: "Transporte de carga no corredor de Tete.",
    responsibilities: "Conduzir em segurança. Entregar mercadoria. Reportar avarias.",
    requirements: "Carta C. Experiência em percursos longos.",
    qualifications: "Carta de condução válida.",
    benefits: "Ajudas de custo. Alojamento em viagem.",
  },
  {
    company: "Chimoio Agro",
    industry: "Agricultura",
    companyDesc: "Produção agrícola em Manica.",
    country: "MZ",
    region: "Manica",
    city: "Chimoio",
    title: "Técnico agrícola",
    categoryId: 3,
    employmentType: "full-time",
    workModel: "on-site",
    experienceLevel: "1-2",
    salaryMin: 16000,
    salaryMax: 23000,
    currency: "MZN",
    description: "Acompanhar culturas e equipas de campo no Chimoio.",
    responsibilities: "Planear sementeira. Reportar produções. Apoiar a colheita.",
    requirements: "Formação agrária. Disponibilidade para trabalho de campo.",
    qualifications: "Curso técnico agrícola.",
    benefits: "Subsídio de alimentação.",
  },
  {
    company: "Clínica do Limpopo",
    industry: "Saúde",
    companyDesc: "Cuidados de saúde em Gaza.",
    country: "MZ",
    region: "Gaza",
    city: "Xai-Xai",
    title: "Enfermeiro",
    categoryId: 8,
    employmentType: "full-time",
    workModel: "on-site",
    experienceLevel: "1-2",
    salaryMin: 18000,
    salaryMax: 26000,
    currency: "MZN",
    description: "Cuidados de enfermagem numa clínica em Xai-Xai.",
    responsibilities: "Administrar medicação. Acompanhar utentes. Apoiar consultas.",
    requirements: "Cédula profissional. Disponibilidade para turnos.",
    qualifications: "Curso de enfermagem.",
    benefits: "Seguro de saúde.",
  },
  {
    company: "Escola de Quelimane",
    industry: "Educação",
    companyDesc: "Ensino secundário na Zambézia.",
    country: "MZ",
    region: "Zambézia",
    city: "Quelimane",
    title: "Professor de Matemática",
    categoryId: 6,
    employmentType: "full-time",
    workModel: "on-site",
    experienceLevel: "1-2",
    salaryMin: 16000,
    salaryMax: 24000,
    currency: "MZN",
    description: "Leccionar Matemática no ensino secundário em Quelimane.",
    responsibilities: "Preparar aulas. Avaliar alunos. Participar em reuniões pedagógicas.",
    requirements: "Formação de professor. Experiência a leccionar Matemática.",
    qualifications: "Licenciatura em Ensino de Matemática ou equivalente.",
    benefits: "Férias escolares.",
  },
  {
    company: "Clínica do Niassa",
    industry: "Saúde",
    companyDesc: "Cuidados de saúde em Lichinga.",
    country: "MZ",
    region: "Niassa",
    city: "Lichinga",
    title: "Técnico de saúde",
    categoryId: 8,
    employmentType: "full-time",
    workModel: "on-site",
    experienceLevel: "1-2",
    salaryMin: 15000,
    salaryMax: 22000,
    currency: "MZN",
    description: "Apoio clínico numa unidade de saúde em Lichinga.",
    responsibilities: "Atender utentes. Apoiar consultas. Manter registos.",
    requirements: "Formação em saúde. Disponibilidade para interior.",
    qualifications: "Curso técnico de saúde.",
    benefits: "Alojamento. Subsídio de interior.",
  },
  {
    company: "Pemba Logística",
    industry: "Logística",
    companyDesc: "Operações portuárias em Cabo Delgado.",
    country: "MZ",
    region: "Cabo Delgado",
    city: "Pemba",
    title: "Operador de armazém",
    categoryId: 11,
    employmentType: "full-time",
    workModel: "on-site",
    experienceLevel: "entry",
    salaryMin: 14000,
    salaryMax: 20000,
    currency: "MZN",
    description: "Movimentação e conferência de mercadorias no armazém de Pemba.",
    responsibilities: "Receber mercadoria. Conferir guias. Apoiar expedição.",
    requirements: "Disponibilidade física. Trabalho por turnos.",
    qualifications: "10ª classe ou superior.",
    benefits: "Subsídio de alimentação.",
  },
  {
    company: "Costa de Inhambane Hotels",
    industry: "Hotelaria",
    companyDesc: "Hotelaria na costa de Inhambane.",
    country: "MZ",
    region: "Inhambane",
    city: "Maxixe",
    title: "Recepcionista",
    categoryId: 14,
    employmentType: "full-time",
    workModel: "on-site",
    experienceLevel: "entry",
    salaryMin: 12000,
    salaryMax: 17000,
    currency: "MZN",
    description: "Recepção de um hotel de praia na Maxixe / Inhambane.",
    responsibilities: "Check-in de hóspedes. Reservas. Coordenar com governação.",
    requirements: "Atendimento ao cliente. Português e inglês básico.",
    qualifications: "12ª classe. Curso de hotelaria é uma vantagem.",
    benefits: "Refeições no turno. Alojamento possível.",
  },
];

async function resolveCorePlace(code: string, regionName: string, cityName: string) {
  const sql = await getSql();
  const region = await sql.query<{ id: number; country_id: number }>(
    `select r.id, r.country_id
     from regions r
     join countries c on c.id = r.country_id
     where c.code = $1
       and (
         lower(r.name) = lower($2)
         or lower(coalesce(r.slug, '')) = lower($2)
         or lower(r.name) like '%' || lower($2) || '%'
       )
     order by char_length(r.name) asc
     limit 1`,
    [code, regionName],
  );
  if (!region[0]) return null;
  const city = await sql.query<{ id: number }>(
    `select id from cities
     where region_id = $1
       and (
         lower(name) = lower($2)
         or lower(name) like '%' || lower($2) || '%'
       )
     order by char_length(name) asc
     limit 1`,
    [region[0].id, cityName],
  );
  return {
    countryId: region[0].country_id,
    regionId: region[0].id,
    cityId: city[0]?.id ?? null,
  };
}

async function ensureCoreVacancies() {
  const sql = await getSql();
  const source = await sql.query<{ id: number }>(
    `select id from job_sources where slug = 'nearhire' limit 1`,
  );
  const sourceId = source[0]?.id ?? 1;
  for (const job of CORE_JOBS) {
    const place = await resolveCorePlace(job.country, job.region, job.city);
    if (!place) continue;
    await sql.query(
      `insert into companies (owner_id, name, industry, description, size, country_id, region_id, city_id, approved)
       select null, $1, $2, $3, '51-200', $4, $5, $6, true
       where not exists (select 1 from companies where name = $1)`,
      [job.company, job.industry, job.companyDesc, place.countryId, place.regionId, place.cityId],
    );
    await sql.query(
      `insert into jobs (
         company_id, title, category_id, country_id, region_id, city_id,
         employment_type, work_model, experience_level, salary_min, salary_max, salary_currency,
         description, responsibilities, requirements, qualifications, benefits,
         apply_method, status, source_name, source_id, published_at
       )
       select
         co.id, $1, $2, $3, $4, $5,
         $6, $7, $8, $9, $10, $11,
         $12, $13, $14, $15, $16,
         'platform', 'published', 'Auxilar de Vagas', $17, now()
       from companies co
       where co.name = $18
         and not exists (
           select 1 from jobs j
           where j.title = $1 and j.company_id = co.id and j.status = 'published'
         )`,
      [
        job.title,
        job.categoryId,
        place.countryId,
        place.regionId,
        place.cityId,
        job.employmentType,
        job.workModel,
        job.experienceLevel,
        job.salaryMin,
        job.salaryMax,
        job.currency,
        job.description,
        job.responsibilities,
        job.requirements,
        job.qualifications,
        job.benefits,
        sourceId,
        job.company,
      ],
    );
  }
}

const ENTITY_LT = "&" + "lt;";
const ENTITY_GT = "&" + "gt;";
const GARBAGE_PLACE_SQL = `(
  char_length(name) > 48
  or name like '%<%'
  or name like '%>%'
  or name ilike '%${ENTITY_LT}%'
  or name ilike '%${ENTITY_GT}%'
  or name ilike '%todas as zonas%'
  or name ilike '%http%'
  or name ilike '%descri%'
  or name ilike '%categoria%'
  or name ilike '%<br%'
)`;

async function cleanupGarbagePlaces() {
  const sql = await getSql();
  const badCities = await sql.query<{ id: number }>(`select id from cities where ${GARBAGE_PLACE_SQL}`);
  const badRegions = await sql.query<{ id: number }>(`select id from regions where ${GARBAGE_PLACE_SQL}`);
  const cityIds = badCities.map((c) => c.id);
  const regionIds = badRegions.map((r) => r.id);
  if (cityIds.length) {
    const list = cityIds.join(",");
    await sql.query(`update jobs set city_id = null where city_id in (${list})`);
    await sql.query(`update companies set city_id = null where city_id in (${list})`);
    await sql.query(`update profiles set city_id = null where city_id in (${list})`);
    await sql.query(`update job_alerts set city_id = null where city_id in (${list})`);
    await sql.query(`delete from cities where id in (${list})`);
  }
  if (regionIds.length) {
    const list = regionIds.join(",");
    await sql.query(`update jobs set region_id = null where region_id in (${list})`);
    await sql.query(`update companies set region_id = null where region_id in (${list})`);
    await sql.query(`update profiles set region_id = null where region_id in (${list})`);
    await sql.query(`update job_alerts set region_id = null where region_id in (${list})`);
    await sql.query(
      `update jobs set city_id = null where city_id in (select id from cities where region_id in (${list}))`,
    );
    await sql.query(`delete from cities where region_id in (${list})`);
    await sql.query(`delete from regions where id in (${list})`);
  }
  const dirtyCompanies = await sql.query<{ id: number; name: string }>(
    `select id, name from companies where name like '%<%' or name like '%>%' or name ilike '%<%'`,
  );
  for (const company of dirtyCompanies) {
    const next = cleanCompanyName(company.name);
    if (next && next !== company.name) {
      await sql.query(`update companies set name = $1 where id = $2`, [next, company.id]);
    }
  }
  return { cities: cityIds.length, regions: regionIds.length };
}

async function remapImportedPlaces() {
  const sql = await getSql();
  await sql.query(`
    update jobs j
    set region_id = r.id
    from regions r
    where j.status = 'published'
      and j.country_id = r.country_id
      and j.region_id is null
      and r.name is not null
      and char_length(r.name) between 2 and 40
      and (
        j.description ilike ('%Zona:%' || r.name || '%')
        or j.description ilike ('%Localização:%' || r.name || '%')
        or j.description ilike ('%Localizacao:%' || r.name || '%')
        or j.description ilike ('%Distrito:%' || r.name || '%')
      )
  `);
  const rows = await sql.query<{
    id: number;
    description: string | null;
    original_url: string | null;
    country_code: string | null;
    city_id: number | null;
    region_id: number | null;
  }>(`
    select j.id, j.description, j.original_url, ctry.code as country_code, j.city_id, j.region_id
    from jobs j
    left join countries ctry on ctry.id = j.country_id
    left join regions r on r.id = j.region_id
    where j.status = 'published'
      and (
        j.region_id is null
        or r.name is null
        or char_length(coalesce(r.name, '')) > 48
        or coalesce(r.name, '') like '%<%'
      )
    limit 800
  `);
  if (!rows.length) return 0;
  const places = await loadPlaceIndex();
  let updated = 0;
  for (const row of rows) {
    const found = placeFromJobText(row.description, row.original_url);
    if (!found.city && !found.region) continue;
    if (!row.country_code) continue;
    const place = await resolvePlace(row.country_code, found.city, found.region, places);
    if (!place.regionId && !place.cityId) continue;
    if (place.regionId === row.region_id && place.cityId === row.city_id) continue;
    await sql.query(
      `update jobs
       set region_id = coalesce($1, region_id),
           city_id = coalesce($2, city_id),
           country_id = coalesce($3, country_id)
       where id = $4`,
      [place.regionId, place.cityId, place.countryId, row.id],
    );
    updated += 1;
  }
  return updated;
}

export const listJobSources = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<JobSource[]> => {
    const sql = await requireAdmin(context.userId);
    await readySchema();
    const raw = await sql.query<SourceRow>(`select ${SOURCE_SELECT} from job_sources order by id`);
    const mapped = raw.map(mapSource);
    mapped.sort((a, b) => Number(b.primary) - Number(a.primary) || a.id - b.id);
    return mapped;
  });

async function linkSource(
  jobId: number,
  sourceId: number,
  sourceName: string,
  externalId: string,
  originalUrl: string,
) {
  const sql = await getSql();
  const existing = await sql<{ id: number }>`
    select id from job_source_links
    where source_id = ${sourceId} and external_job_id = ${externalId}
    limit 1
  `;
  if (existing[0]) {
    await sql`
      update job_source_links
      set last_seen_at = now(), job_id = ${jobId}, original_url = ${originalUrl}, source_name = ${sourceName}
      where id = ${existing[0].id}
    `;
    return;
  }
  await sql`
    insert into job_source_links (job_id, source_id, source_name, external_job_id, original_url, last_seen_at)
    values (${jobId}, ${sourceId}, ${sourceName}, ${externalId}, ${originalUrl}, now())
  `;
}


function normPlace(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

type PlaceIndex = {
  countries: Map<string, number>;
  regions: { id: number; countryId: number; name: string; slug: string }[];
  cities: { id: number; regionId: number; name: string }[];
};

type BatchCtx = {
  places: PlaceIndex;
  companies: Map<string, number>;
  known: {
    id: number;
    fingerprint: string | null;
    original_url: string | null;
    title: string;
    company: string;
    apply_email: string | null;
    description: string | null;
  }[];
  categories: Map<string, number>;
};

async function loadPlaceIndex(): Promise<PlaceIndex> {
  const sql = await getSql();
  const countries = await sql<{ id: number; code: string }>`select id, code from countries`;
  const regions = await sql<{ id: number; country_id: number; name: string; slug: string | null }>`
    select id, country_id, name, slug from regions
  `;
  const cities = await sql<{ id: number; region_id: number; name: string }>`select id, region_id, name from cities`;
  return {
    countries: new Map(countries.map((c) => [c.code, c.id])),
    regions: regions.map((r) => ({
      id: r.id,
      countryId: r.country_id,
      name: r.name,
      slug: r.slug || toSlug(r.name),
    })),
    cities: cities.map((c) => ({ id: c.id, regionId: c.region_id, name: c.name })),
  };
}

async function loadBatchCtx(): Promise<BatchCtx> {
  const sql = await getSql();
  const places = await loadPlaceIndex();
  const companies = await sql<{ id: number; name: string }>`select id, name from companies`;
  const categories = await sql<{ id: number; name: string; slug: string }>`select id, name, slug from categories`;
  const known = await sql<{
    id: number;
    fingerprint: string | null;
    original_url: string | null;
    title: string;
    company: string;
    apply_email: string | null;
    description: string | null;
  }>`
    select j.id, j.fingerprint, j.original_url, j.title, co.name as company, j.apply_email, j.description
    from jobs j
    join companies co on co.id = j.company_id
    where j.status in ('published', 'expired')
  `;
  const catMap = new Map<string, number>();
  for (const c of categories) {
    catMap.set(c.name.toLowerCase(), c.id);
    catMap.set(c.slug.toLowerCase(), c.id);
  }
  return {
    places,
    companies: new Map(companies.map((c) => [c.name.toLowerCase(), c.id])),
    known,
    categories: catMap,
  };
}

async function resolvePlace(
  countryCode: string,
  cityName?: string | null,
  regionName?: string | null,
  index?: PlaceIndex,
) {
  const sql = await getSql();
  const places = index ?? (await loadPlaceIndex());
  const cityLabel = cleanPlaceName(cityName);
  const regionLabel = cleanPlaceName(regionName) || cityLabel;
  const countryId = places.countries.get(countryCode) ?? null;
  const wantCity = cityLabel ? normPlace(cityLabel) : "";
  const wantRegion = regionLabel ? normPlace(regionLabel) : wantCity;
  const inCountry = (regionId: number) => {
    const region = places.regions.find((r) => r.id === regionId);
    return !countryId || region?.countryId === countryId;
  };

  let city = wantCity
    ? places.cities.find((c) => inCountry(c.regionId) && normPlace(c.name) === wantCity)
    : undefined;
  let region = city
    ? places.regions.find((r) => r.id === city!.regionId)
    : wantRegion
      ? places.regions.find(
          (r) =>
            (!countryId || r.countryId === countryId) &&
            (normPlace(r.name) === wantRegion || r.slug === toSlug(regionLabel || cityLabel || "")),
        )
      : undefined;

  if (!region && countryId && (regionLabel || cityLabel)) {
    const label = (regionLabel || cityLabel || "").trim();
    if (!isGarbagePlaceName(label) && cleanPlaceName(label)) {
      const slug = toSlug(label);
      const created = await sql<{ id: number }>`
        insert into regions (country_id, name, slug) values (${countryId}, ${label}, ${slug}) returning id
      `;
      region = { id: created[0].id, countryId, name: label, slug };
      places.regions.push(region);
    }
  }
  if (wantCity && !city && region && cityLabel && !isGarbagePlaceName(cityLabel)) {
    const label = cityLabel.trim();
    const created = await sql<{ id: number }>`
      insert into cities (region_id, name) values (${region.id}, ${label}) returning id
    `;
    city = { id: created[0].id, regionId: region.id, name: label };
    places.cities.push(city);
  }
  return { countryId, regionId: region?.id ?? null, cityId: city?.id ?? null };
}

async function resolveCompany(
  name: string,
  countryId: number | null,
  logo?: string | null,
  cache?: Map<string, number>,
) {
  const sql = await getSql();
  const key = name.toLowerCase();
  if (cache?.has(key)) return cache.get(key)!;
  const existing = await sql<{ id: number }>`
    select id from companies where lower(name) = lower(${name}) limit 1
  `;
  if (existing[0]) {
    cache?.set(key, existing[0].id);
    if (logo) {
      await sql`update companies set logo_url = coalesce(logo_url, ${logo}) where id = ${existing[0].id}`;
    }
    return existing[0].id;
  }
  const created = await sql<{ id: number }>`
    insert into companies (name, country_id, approved, logo_url)
    values (${name}, ${countryId}, true, ${logo ?? null})
    returning id
  `;
  cache?.set(key, created[0].id);
  return created[0].id;
}

async function refreshExistingJob(
  jobId: number,
  input: {
    originalUrl: string;
    sourceId: number;
    sourceName: string;
    externalId: string;
    countryCode: string;
    cityName?: string | null;
    regionName?: string | null;
    company?: string;
    ctx?: BatchCtx;
  },
  applyEmail: string | null,
) {
  const sql = await getSql();
  const place = await resolvePlace(input.countryCode, input.cityName, input.regionName, input.ctx?.places);
  await sql`
    update jobs set
      last_synced_at = now(),
      original_url = coalesce(original_url, ${input.originalUrl}),
      apply_email = coalesce(apply_email, ${applyEmail}),
      status = 'published',
      country_id = coalesce(${place.countryId}, country_id),
      region_id = coalesce(${place.regionId}, region_id),
      city_id = coalesce(${place.cityId}, city_id)
    where id = ${jobId}
  `;
  const cleaned = cleanCompanyName(input.company);
  if (cleaned) {
    await sql.query(
      `update companies set name = $1
       where id = (select company_id from jobs where id = $2)
         and (name like '%<%' or name like '%>%' or name ilike $3)`,
      [cleaned, jobId, "%" + ENTITY_LT + "%"],
    );
  }
  try {
    await linkSource(jobId, input.sourceId, input.sourceName, input.externalId, input.originalUrl);
  } catch {
    /* ignore */
  }
  return { id: jobId, duplicate: true as const };
}

export async function ingestNormalizedJob(input: {
  title: string;
  company: string;
  excerpt: string;
  countryCode: string;
  cityName?: string | null;
  regionName?: string | null;
  sourceName: string;
  sourceId: number;
  originalUrl: string;
  externalId: string;
  requirements?: string | null;
  qualifications?: string | null;
  experienceRequired?: string | null;
  educationRequired?: string | null;
  skillsRequired?: string | null;
  languagesRequired?: string | null;
  licencesRequired?: string | null;
  customApplicationQuestions?: unknown;
  applyEmail?: string | null;
  employmentType?: string | null;
  workModel?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string | null;
  companyLogo?: string | null;
  publishedAt?: string | null;
  expiresAt?: string | null;
  category?: string | null;
  ctx?: BatchCtx;
}) {
  const sql = await getSql();
  const ctx = input.ctx;
  const applyEmail =
    input.applyEmail ||
    extractPublishedEmail([input.excerpt, input.requirements, input.qualifications].filter(Boolean).join("\n"));
  const companyName = cleanCompanyName(input.company || input.sourceName) || input.sourceName;
  const fp = fingerprint(input.title, companyName, input.cityName);
  const fromKnown = ctx?.known.find(
    (row) =>
      row.fingerprint === fp ||
      (row.original_url && input.originalUrl && row.original_url === input.originalUrl),
  );
  if (fromKnown) {
    return refreshExistingJob(fromKnown.id, { ...input, company: companyName }, applyEmail);
  }
  if (!ctx) {
    const existing = await sql<{ id: number }>`
      select id from jobs
      where fingerprint = ${fp}
         or (source_name = ${input.sourceName} and external_job_id = ${input.externalId})
         or (original_url is not null and original_url = ${input.originalUrl})
         or (
           ${applyEmail}::text is not null
           and apply_email = ${applyEmail}
           and lower(title) = lower(${input.title})
         )
      limit 1
    `;
    if (existing[0]) {
      return refreshExistingJob(existing[0].id, { ...input, company: companyName }, applyEmail);
    }
  }
  const place = await resolvePlace(input.countryCode, input.cityName, input.regionName, ctx?.places);
  if (!ctx) {
    const pool = await sql<{
      id: number;
      title: string;
      company: string;
      description: string | null;
      apply_email: string | null;
      original_url: string | null;
    }>`
      select j.id, j.title, co.name as company, j.description, j.apply_email, j.original_url
      from jobs j
      join companies co on co.id = j.company_id
      where j.status in ('published', 'expired')
        and (j.country_id = ${place.countryId ?? 0} or j.country_id is null)
      order by j.published_at desc
      limit 120
    `;
    const twin = pool.find((row) =>
      likelySameJob(
        {
          title: input.title,
          company: input.company || input.sourceName,
          description: input.excerpt,
          city: input.cityName ?? "",
          applyEmail: applyEmail ?? "",
          url: input.originalUrl,
        },
        {
          title: row.title,
          company: row.company,
          description: row.description ?? "",
          applyEmail: row.apply_email ?? "",
          url: row.original_url ?? "",
        },
      ),
    );
    if (twin) {
      return refreshExistingJob(twin.id, { ...input, company: companyName }, applyEmail);
    }
  }

  const companyId = await resolveCompany(
    companyName,
    place.countryId,
    input.companyLogo,
    ctx?.companies,
  );
  let categoryId: number | null = null;
  if (input.category) {
    categoryId = ctx?.categories.get(input.category.toLowerCase()) ?? null;
    if (categoryId == null) {
      const cat = await sql<{ id: number }>`
        select id from categories
        where lower(name) = lower(${input.category}) or lower(slug) = lower(${input.category})
        limit 1
      `;
      categoryId = cat[0]?.id ?? null;
      if (categoryId != null) ctx?.categories.set(input.category.toLowerCase(), categoryId);
    }
  }
  const applyMethod = applyEmail ? "email" : "external";
  const deadline = input.expiresAt && /^\d{4}-\d{2}-\d{2}/.test(input.expiresAt) ? input.expiresAt.slice(0, 10) : null;
  const inserted = await sql<{ id: number }>`
    insert into jobs (
      company_id, title, category_id, country_id, region_id, city_id, description,
      requirements, qualifications, experience_required, education_required,
      skills_required, languages_required, licences_required, custom_application_questions,
      employment_type, work_model, salary_min, salary_max, salary_currency, deadline, apply_email,
      apply_method, status, source_name, source_id, source_url, external_job_id,
      original_url, fingerprint, last_synced_at, published_at
    ) values (
      ${companyId}, ${input.title}, ${categoryId}, ${place.countryId}, ${place.regionId}, ${place.cityId},
      ${input.excerpt},
      ${input.requirements ?? null}, ${input.qualifications ?? null},
      ${input.experienceRequired ?? null}, ${input.educationRequired ?? null},
      ${input.skillsRequired ?? null}, ${input.languagesRequired ?? null},
      ${input.licencesRequired ?? null},
      ${input.customApplicationQuestions ? JSON.stringify(input.customApplicationQuestions) : null}::jsonb,
      ${input.employmentType || "full-time"}, ${normalizeWorkModel(input.workModel)},
      ${input.salaryMin ?? null}, ${input.salaryMax ?? null}, ${input.currency ?? null}, ${deadline}, ${applyEmail},
      ${applyMethod}, 'published', ${input.sourceName}, ${input.sourceId},
      ${input.originalUrl}, ${input.externalId}, ${input.originalUrl}, ${fp}, now(), now()
    ) returning id
  `;
  try {
    await linkSource(inserted[0].id, input.sourceId, input.sourceName, input.externalId, input.originalUrl);
  } catch {
    /* ignore */
  }
  ctx?.known.push({
    id: inserted[0].id,
    fingerprint: fp,
    original_url: input.originalUrl,
    title: input.title,
    company: companyName,
    apply_email: applyEmail,
    description: input.excerpt,
  });
  if (!ctx) {
    try {
      const { ensureJobQuestions } = await import("@/lib/server/apply-questions");
      await ensureJobQuestions(inserted[0].id);
    } catch {
      /* questions generated on first apply */
    }
  }
  return { id: inserted[0].id, duplicate: false };
}

function normalizeWorkModel(value?: string | null) {
  const v = (value ?? "").toLowerCase();
  if (v.includes("remote") || v.includes("remoto")) return "remote";
  if (v.includes("hybrid") || v.includes("híbrid") || v.includes("hibrid")) return "hybrid";
  return "on-site";
}

async function ingestBatch(source: SourceRow, jobs: NormalizedJob[]) {
  const ctx = await loadBatchCtx();
  let imported = 0;
  for (const job of jobs) {
    if (!job.title) continue;
    const externalId = job.externalId || job.originalUrl || job.title;
    const r = await ingestNormalizedJob({
      title: job.title,
      company: job.company,
      excerpt: job.description ?? "",
      countryCode: job.countryCode || source.country_code,
      cityName: job.city,
      regionName: job.region,
      sourceName: source.name,
      sourceId: source.id,
      originalUrl: job.originalUrl || job.applyUrl || "",
      externalId,
      requirements: job.requirements,
      qualifications: job.qualifications,
      applyEmail: job.applyEmail,
      employmentType: job.employmentType,
      workModel: job.workModel,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      currency: job.currency,
      companyLogo: job.companyLogo,
      publishedAt: job.publishedAt,
      expiresAt: job.expiresAt,
      category: job.category,
      ctx,
    });
    if (!r.duplicate) imported += 1;
  }
  const sql = await getSql();
  const stale = await sql<{ n: number }>`
    select count(*)::int as n from jobs
    where source_id = ${source.id}
      and status = 'published'
      and last_synced_at < now() - interval '14 days'
  `;
  await sql`
    update jobs set status = 'expired'
    where source_id = ${source.id}
      and status = 'published'
      and last_synced_at < now() - interval '14 days'
  `;
  return { imported, found: jobs.length, expired: Number(stale[0]?.n ?? 0) };
}

async function runSync(source: SourceRow) {
  const sql = await getSql();
  const connector = getConnectorBySlug(source.slug) ?? getConnector(source.name, source.id);
  const caps = connector.capabilities();
  const dbAllowed =
    (source.integration_type === "rss" || source.integration_type === "api") &&
    Boolean(source.feed_url) &&
    source.active;
  if (!caps.supportsJobsImport && !dbAllowed) {
    throw new Error("Integração pendente. Esta fonte ainda não tem API, RSS ou autorização.");
  }
  const fetched = await connector.fetchJobs();
  if (fetched.pending || fetched.method === "pending") {
    throw new Error(fetched.message || "Integração pendente.");
  }
  if (fetched.method === "direct") {
    throw new Error("Esta fonte publica vagas directamente; não há sincronização externa.");
  }
  const stats = await ingestBatch(source, fetched.jobs);
  await sql`
    update job_sources set
      last_synced_at = now(),
      imported_count = imported_count + ${stats.imported},
      last_found_count = ${stats.found},
      last_new_count = ${stats.imported},
      last_expired_count = ${stats.expired},
      status = 'active',
      active = true,
      integration_type = ${fetched.method === "rss" ? "rss" : "api"},
      last_error = null
    where id = ${source.id}
  `;
  await writeIntegrationLog({
    sourceSlug: source.slug,
    operation: "sync_jobs",
    result: "ok",
    message: `${stats.found} encontradas, ${stats.imported} novas, ${stats.expired} expiradas`,
  });
  clearLocationCache();
  return { imported: stats.imported, total: stats.found, expired: stats.expired };
}

export const syncJobSource = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => id)
  .handler(async ({ context, data: id }) => {
    const sql = await requireAdmin(context.userId);
    await readySchema();
    const src = await sql.query<SourceRow>(`select ${SOURCE_SELECT} from job_sources where id = $1`, [id]);
    const source = src[0];
    if (!source) throw new Error("Fonte não encontrada");
    try {
      return await runSync(source);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro de sincronização";
      await sql`
        update job_sources set status = ${msg.toLowerCase().includes("pendente") ? "pending" : "error"},
          last_error = ${msg}, last_synced_at = now()
        where id = ${id}
      `;
      await writeIntegrationLog({
        sourceSlug: source.slug,
        operation: "sync_jobs",
        result: "error",
        message: msg,
      });
      throw new Error(msg);
    }
  });

export const syncAuthorizedSources = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await requireAdmin(context.userId);
    await readySchema();
    const rows = await sql.query<SourceRow>(`select ${SOURCE_SELECT} from job_sources order by id`);
    const results: { id: number; name: string; imported: number; error?: string }[] = [];
    for (const source of rows) {
      const mapped = mapSource(source);
      if (!mapped.syncable) continue;
      try {
        const r = await runSync(source);
        results.push({ id: source.id, name: source.name, imported: r.imported });
      } catch (e) {
        results.push({
          id: source.id,
          name: source.name,
          imported: 0,
          error: e instanceof Error ? e.message : "Erro",
        });
      }
    }
    if (!results.length) {
      throw new Error("Nenhuma fonte autorizada para sincronizar neste momento.");
    }
    return results;
  });

export type PublicSource = {
  slug: string;
  name: string;
  countryCode: string;
  url: string;
  status: string;
  pending: boolean;
  jobCount: number;
  lastSyncedAt: string | null;
  integrationType: string;
};

export const listPublicSources = createServerFn({ method: "GET" }).handler(async (): Promise<PublicSource[]> => {
  await readySchema();
  const sql = await getSql();
  const raw = await sql.query<SourceRow>(`select ${SOURCE_SELECT} from job_sources order by id`);
  const counts = await sql.query<{ source_id: number | null; n: number }>(
    `select source_id, count(*)::int as n from jobs
     where status = 'published' and (deadline is null or deadline >= current_date)
     group by source_id`,
  );
  const byId = new Map(counts.map((c) => [c.source_id, Number(c.n)]));
  const wanted = new Set<string>(["nearhire", ...PRIMARY_SOURCE_SLUGS]);
  return raw
    .filter((r) => wanted.has(r.slug))
    .map((r) => {
      const mapped = mapSource(r);
      return {
        slug: r.slug,
        name: r.name,
        countryCode: r.country_code,
        url: r.url,
        status: mapped.status,
        pending: mapped.status === "pending" || mapped.status === "inactive" || !mapped.syncable,
        jobCount: byId.get(r.id) ?? 0,
        lastSyncedAt: r.last_synced_at ? String(r.last_synced_at) : null,
        integrationType: mapped.integrationType,
      };
    })
    .sort((a, b) => {
      const order = ["nearhire", ...PRIMARY_SOURCE_SLUGS];
      return order.indexOf(a.slug) - order.indexOf(b.slug);
    });
});

const STALE_MS = 25 * 60 * 1000;
let refreshLock: Promise<{ imported: number; synced: string[] }> | null = null;
let lastRefreshAt = 0;

async function refreshPublicInternal(_countryCode?: string) {
  await readySchema();
  const sql = await getSql();
  const rows = await sql.query<SourceRow>(`select ${SOURCE_SELECT} from job_sources order by id`);
  const synced: string[] = [];
  let imported = 0;
  for (const source of rows) {
    const mapped = mapSource(source);
    if (!mapped.syncable) continue;
    const stale =
      !source.last_synced_at || Date.now() - new Date(source.last_synced_at).getTime() > STALE_MS;
    if (!stale) continue;
    try {
      const r = await runSync(source);
      imported += r.imported;
      synced.push(source.slug);
    } catch {
      /* leave pending or error on the source row */
    }
  }
  return { imported, synced };
}

export const ensurePublicFeedsFresh = createServerFn({ method: "POST" })
  .validator((d: { countryCode?: string } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    if (refreshLock) return refreshLock;
    if (Date.now() - lastRefreshAt < 45_000) return { imported: 0, synced: [] as string[] };
    refreshLock = refreshPublicInternal(data.countryCode)
      .then((r) => {
        lastRefreshAt = Date.now();
        return r;
      })
      .finally(() => {
        refreshLock = null;
      });
    return refreshLock;
  });
