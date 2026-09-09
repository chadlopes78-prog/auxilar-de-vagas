-- Universal candidate profile + Application Connector Layer

alter table candidate_profiles add column if not exists default_cover_letter text;
alter table candidate_profiles add column if not exists salary_expectation text;
alter table candidate_profiles add column if not exists availability text;
alter table candidate_profiles add column if not exists desired_role text;

create table if not exists certifications (
  id serial primary key,
  user_id text not null references profiles(user_id) on delete cascade,
  name text not null,
  issuer text,
  year text
);

create table if not exists candidate_documents (
  id serial primary key,
  user_id text not null references profiles(user_id) on delete cascade,
  kind text not null default 'cv',
  file_name text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists application_consents (
  id serial primary key,
  user_id text not null references profiles(user_id) on delete cascade,
  source_slug text not null,
  fields_shared text not null,
  created_at timestamptz not null default now(),
  unique (user_id, source_slug)
);

create table if not exists job_source_integrations (
  id serial primary key,
  source_id integer references job_sources(id) on delete cascade,
  source_name text not null,
  country text not null,
  integration_type text not null default 'official_redirect',
  api_endpoint text,
  authentication_type text,
  credentials_reference text,
  supports_jobs_import boolean not null default false,
  supports_application_submission boolean not null default false,
  supports_application_status boolean not null default false,
  supports_cv_upload boolean not null default false,
  supports_profile_sync boolean not null default false,
  enabled boolean not null default false,
  last_sync timestamptz,
  integration_status text not null default 'awaiting_credentials'
);

create unique index if not exists job_source_integrations_source_id_uniq
  on job_source_integrations (source_id)
  where source_id is not null;

create table if not exists integration_logs (
  id serial primary key,
  source_slug text not null,
  operation text not null,
  application_id integer,
  external_id text,
  created_at timestamptz not null default now(),
  result text not null,
  http_code integer,
  message text,
  attempts integer not null default 1
);

create index if not exists integration_logs_source_idx on integration_logs (source_slug, created_at desc);

alter table applications add column if not exists method text not null default 'internal';
alter table applications add column if not exists source_slug text;
alter table applications add column if not exists source_name text;
alter table applications add column if not exists country_name text;
alter table applications add column if not exists external_application_id text;
alter table applications add column if not exists external_job_id text;
alter table applications add column if not exists submitted_at timestamptz;
alter table applications add column if not exists external_status text;
alter table applications add column if not exists last_status_sync timestamptz;
alter table applications add column if not exists snapshot jsonb;
alter table applications add column if not exists official_url text;
alter table applications add column if not exists status_note text;

create unique index if not exists applications_external_dup_idx
  on applications (candidate_id, source_slug, external_job_id)
  where external_job_id is not null;

insert into job_source_integrations (
  source_id, source_name, country, integration_type, api_endpoint,
  authentication_type, credentials_reference,
  supports_jobs_import, supports_application_submission, supports_application_status,
  supports_cv_upload, supports_profile_sync, enabled, integration_status
) values
  (1, 'NearHire', 'MZ', 'direct', null, 'session', null, true, true, true, true, true, true, 'ready'),
  (2, 'Emprego.co.mz', 'MZ', 'official_redirect', null, 'api_key', 'EMPREGO_MZ_API_KEY', false, false, false, false, false, false, 'awaiting_credentials'),
  (4, 'Jobartis', 'AO', 'official_redirect', null, 'api_key', 'JOBARTIS_API_KEY', false, false, false, false, false, false, 'awaiting_credentials'),
  (5, 'IEFP Online', 'PT', 'official_redirect', null, 'api_key', 'IEFP_API_KEY', false, false, false, false, false, false, 'awaiting_credentials'),
  (8, 'SAPO Emprego', 'PT', 'official_redirect', null, 'api_key', 'SAPO_EMPREGO_APPLICATIONS_API_KEY', false, false, false, false, false, false, 'awaiting_credentials'),
  (6, 'Net-Empregos', 'PT', 'official_redirect', null, null, null, false, false, false, false, false, false, 'awaiting_partnership'),
  (7, 'Indeed Portugal', 'PT', 'official_redirect', null, null, null, false, false, false, false, false, false, 'awaiting_partnership'),
  (9, 'Expresso Emprego', 'PT', 'official_redirect', null, null, null, false, false, false, false, false, false, 'awaiting_partnership'),
  (10, 'ITJobs', 'PT', 'official_redirect', null, null, null, false, false, false, false, false, false, 'awaiting_partnership')
on conflict do nothing;

insert into job_sources (id, slug, name, country_code, url, integration_type, feed_url, active, status) values
  (11, 'linkedin', 'LinkedIn', 'XX', 'https://www.linkedin.com/jobs/', 'disabled', null, false, 'inactive'),
  (12, 'indeed', 'Indeed', 'XX', 'https://www.indeed.com/', 'disabled', null, false, 'inactive'),
  (13, 'eures', 'EURES', 'PT', 'https://eures.europa.eu/', 'disabled', null, false, 'inactive')
on conflict (id) do nothing;

insert into job_source_integrations (
  source_id, source_name, country, integration_type,
  supports_jobs_import, supports_application_submission, enabled, integration_status
) values
  (11, 'LinkedIn', 'XX', 'official_redirect', false, false, false, 'awaiting_partnership'),
  (12, 'Indeed', 'XX', 'official_redirect', false, false, false, 'awaiting_partnership'),
  (13, 'EURES', 'PT', 'official_redirect', false, false, false, 'awaiting_partnership')
on conflict do nothing;

select setval('job_sources_id_seq', (select coalesce(max(id), 1) from job_sources));
select setval('job_source_integrations_id_seq', (select coalesce(max(id), 1) from job_source_integrations));

-- Internal NearHire vacancies so candidatura no nosso site can be used
insert into companies (id, owner_id, name, industry, description, size, country_id, region_id, city_id, approved)
values
  (101, null, 'Grupo Zambeze', 'Comércio', 'Rede comercial com operações em Moçambique.', '51-200', 1, 1, 1, true),
  (102, null, 'Clínica Costa', 'Saúde', 'Rede de clínicas em Maputo.', '11-50', 1, 2, 2, true),
  (103, null, 'Atlântico Logística', 'Logística', 'Operador logístico com base em Lisboa.', '51-200', 4, 11, 13, true)
on conflict (id) do nothing;

insert into jobs (
  company_id, title, category_id, country_id, region_id, city_id,
  employment_type, work_model, experience_level, salary_min, salary_max, salary_currency,
  description, responsibilities, requirements, benefits,
  apply_method, status, source_name, source_id, published_at
) values
  (
    101, 'Assistente comercial', 13, 1, 1, 1,
    'full-time', 'on-site', 'entry', 18000, 25000, 'MZN',
    'Apoio à equipa de vendas na Beira. Atendimento a clientes, follow-up de propostas e organização do ponto de venda.',
    'Atender clientes. Actualizar a base comercial. Apoiar a loja.',
    '12ª classe. Boa comunicação em português. Disponibilidade imediata.',
    'Subsídio de alimentação. Formação inicial.',
    'platform', 'published', 'Auxilar de Vagas', 1, now()
  ),
  (
    102, 'Recepcionista de clínica', 5, 1, 2, 2,
    'full-time', 'on-site', 'entry', 15000, 22000, 'MZN',
    'Recepção e marcação de consultas numa clínica em Maputo. Primeiro contacto com utentes.',
    'Receber utentes. Gerir agenda. Apoiar a facturação simples.',
    'Ensino médio. Organização. Discrição com dados de saúde.',
    'Seguro de saúde. Horário diurno.',
    'platform', 'published', 'Auxilar de Vagas', 1, now()
  ),
  (
    103, 'Operador de armazém', 11, 4, 11, 13,
    'full-time', 'on-site', '1-2', 1100, 1400, 'EUR',
    'Movimentação e conferência de mercadorias num armazém em Lisboa.',
    'Receber mercadoria. Conferir guias. Apoiar expedição.',
    'Experiência em armazém. Carta de empilhador é uma vantagem.',
    'Subsídio de refeição. Transporte.',
    'platform', 'published', 'Auxilar de Vagas', 1, now()
  )
on conflict do nothing;

select setval('companies_id_seq', (select coalesce(max(id), 1) from companies));
select setval('jobs_id_seq', (select coalesce(max(id), 1) from jobs));

