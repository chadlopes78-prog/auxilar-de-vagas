-- Expand aggregator sources, dedup links, search indexes, sync stats

alter table companies add column if not exists logo_url text;

alter table job_sources add column if not exists last_found_count integer;
alter table job_sources add column if not exists last_new_count integer;
alter table job_sources add column if not exists last_expired_count integer;

create table if not exists job_source_links (
  id serial primary key,
  job_id integer not null references jobs(id) on delete cascade,
  source_id integer not null references job_sources(id) on delete cascade,
  source_name text not null,
  external_job_id text,
  original_url text,
  last_seen_at timestamptz not null default now()
);

create unique index if not exists job_source_links_ext_uniq
  on job_source_links (source_id, external_job_id)
  where external_job_id is not null;

create index if not exists job_source_links_job_idx on job_source_links (job_id);

create index if not exists jobs_source_status_idx on jobs (source_id, status);
create index if not exists jobs_country_pub_idx on jobs (country_id, status, published_at desc);
create index if not exists jobs_region_pub_idx on jobs (region_id, status, published_at desc);
create index if not exists jobs_city_pub_idx on jobs (city_id, status, published_at desc);
create index if not exists jobs_title_lower_idx on jobs (lower(title));

insert into job_sources (id, slug, name, country_code, url, integration_type, feed_url, active, status) values
  (14, 'saplic', 'Saplic', 'MZ', 'https://www.saplic.com/mz', 'disabled', null, false, 'pending'),
  (15, 'todas-vagas', 'TodasVagas', 'MZ', 'https://todasvagas.com/', 'disabled', null, false, 'pending')
on conflict (id) do nothing;

insert into job_sources (id, slug, name, country_code, url, integration_type, feed_url, active, status)
select 14, 'saplic', 'Saplic', 'MZ', 'https://www.saplic.com/mz', 'disabled', null, false, 'pending'
where not exists (select 1 from job_sources where slug = 'saplic');

insert into job_sources (id, slug, name, country_code, url, integration_type, feed_url, active, status)
select 15, 'todas-vagas', 'TodasVagas', 'MZ', 'https://todasvagas.com/', 'disabled', null, false, 'pending'
where not exists (select 1 from job_sources where slug = 'todas-vagas');

update job_sources set name = 'IEFP Online' where slug = 'iefp' and name = 'IEFP';
update job_sources set status = 'pending'
  where active = false
    and coalesce(status, 'inactive') in ('inactive', '')
    and slug in (
      'emprego-mz', 'oemprego-mz', 'saplic', 'todas-vagas',
      'jobartis', 'iefp', 'itjobs', 'net-empregos',
      'indeed-pt', 'sapo-emprego', 'expresso-emprego',
      'linkedin', 'indeed', 'eures'
    );

insert into job_source_integrations (
  source_id, source_name, country, integration_type,
  supports_jobs_import, supports_application_submission, enabled, integration_status
)
select s.id, s.name, s.country_code, 'official_redirect', false, false, false, 'awaiting_partnership'
from job_sources s
where s.slug in ('saplic', 'todas-vagas', 'oemprego-mz', 'itjobs')
  and not exists (
    select 1 from job_source_integrations i where i.source_id = s.id
  );

select setval('job_sources_id_seq', (select coalesce(max(id), 1) from job_sources));
