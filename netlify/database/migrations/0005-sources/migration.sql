-- Aggregator, slugs, Portuguese labels, remove fictitious seed jobs

alter table countries add column if not exists slug text;
alter table regions add column if not exists slug text;

update countries set slug = 'mocambique' where code = 'MZ';
update countries set slug = 'angola' where code = 'AO';
update countries set slug = 'africa-do-sul' where code = 'ZA';
update countries set slug = 'portugal' where code = 'PT';
update countries set slug = 'brasil' where code = 'BR';
update countries set name = 'Moçambique' where code = 'MZ';
update countries set name = 'África do Sul' where code = 'ZA';
update countries set name = 'Brasil' where code = 'BR';

update regions set slug = 'sofala' where id = 1;
update regions set slug = 'maputo' where id = 2;
update regions set name = 'Cidade de Maputo', slug = 'maputo' where id = 2;
update regions set name = 'Província de Maputo', slug = 'maputo-provincia' where id = 3;
update regions set slug = 'nampula' where id = 4;
update regions set slug = 'cabo-delgado' where id = 5;
update regions set slug = 'inhambane' where id = 6;
update regions set slug = 'luanda' where id = 7;
update regions set slug = 'benguela' where id = 8;
update regions set slug = 'gauteng' where id = 9;
update regions set slug = 'cabo-ocidental' where id = 10;
update regions set slug = 'lisboa' where id = 11;
update regions set slug = 'porto' where id = 12;
update regions set slug = 'sao-paulo' where id = 13;
update regions set slug = 'rio-de-janeiro' where id = 14;

update cities set name = 'Lisboa' where id = 13;

insert into regions (id, country_id, name, slug) values
  (15, 1, 'Gaza', 'gaza'),
  (16, 1, 'Manica', 'manica'),
  (17, 1, 'Tete', 'tete'),
  (18, 1, 'Zambézia', 'zambezia'),
  (19, 1, 'Niassa', 'niassa'),
  (20, 2, 'Huambo', 'huambo'),
  (21, 2, 'Huíla', 'huila'),
  (22, 2, 'Cabinda', 'cabinda'),
  (23, 4, 'Setúbal', 'setubal'),
  (24, 4, 'Braga', 'braga'),
  (25, 4, 'Aveiro', 'aveiro'),
  (26, 4, 'Coimbra', 'coimbra'),
  (27, 4, 'Faro', 'faro')
on conflict (id) do nothing;

insert into cities (id, region_id, name) values
  (17, 15, 'Xai-Xai'),
  (18, 16, 'Chimoio'),
  (19, 17, 'Tete'),
  (20, 18, 'Quelimane'),
  (21, 19, 'Lichinga'),
  (22, 4, 'Nacala'),
  (23, 7, 'Viana'),
  (24, 8, 'Lobito'),
  (25, 20, 'Huambo'),
  (26, 21, 'Lubango'),
  (27, 22, 'Cabinda'),
  (28, 11, 'Sintra'),
  (29, 11, 'Cascais'),
  (30, 11, 'Amadora'),
  (31, 12, 'Vila Nova de Gaia'),
  (32, 12, 'Matosinhos'),
  (33, 23, 'Setúbal'),
  (34, 24, 'Braga'),
  (35, 25, 'Aveiro'),
  (36, 26, 'Coimbra'),
  (37, 27, 'Faro')
on conflict (id) do nothing;

update categories set name = 'Administração' where id = 1;
update categories set name = 'Contabilidade e Finanças' where id = 2;
update categories set name = 'Agricultura' where id = 3;
update categories set name = 'Banca' where id = 4;
update categories set name = 'Atendimento ao cliente' where id = 5;
update categories set name = 'Educação' where id = 6;
update categories set name = 'Engenharia' where id = 7;
update categories set name = 'Saúde' where id = 8;
update categories set name = 'Recursos humanos' where id = 9;
update categories set name = 'Informática e tecnologia' where id = 10;
update categories set name = 'Logística' where id = 11;
update categories set name = 'Marketing' where id = 12;
update categories set name = 'Vendas' where id = 13;
update categories set name = 'Hotelaria e restauração' where id = 14;
update categories set name = 'Construção' where id = 15;
update categories set name = 'Segurança' where id = 16;
update categories set name = 'ONG' where id = 17;
update categories set name = 'Outros' where id = 18;

alter table jobs add column if not exists source_id integer;
alter table jobs add column if not exists fingerprint text;

create table if not exists job_sources (
  id serial primary key,
  slug text unique not null,
  name text not null,
  country_code text not null,
  url text not null,
  integration_type text not null default 'disabled',
  feed_url text,
  active boolean not null default false,
  status text not null default 'inactive',
  last_synced_at timestamptz,
  imported_count integer not null default 0,
  last_error text
);

insert into job_sources (id, slug, name, country_code, url, integration_type, feed_url, active, status) values
  (1, 'nearhire', 'NearHire', 'MZ', '/', 'manual', null, true, 'active'),
  (2, 'emprego-mz', 'Emprego.co.mz', 'MZ', 'https://www.emprego.co.mz/', 'disabled', null, false, 'inactive'),
  (3, 'oemprego-mz', 'O Emprego', 'MZ', 'https://oemprego.co.mz/', 'disabled', null, false, 'inactive'),
  (4, 'jobartis', 'Jobartis', 'AO', 'https://www.jobartis.com/', 'disabled', null, false, 'inactive'),
  (5, 'iefp', 'IEFP', 'PT', 'https://iefponline.iefp.pt/', 'disabled', null, false, 'inactive'),
  (6, 'net-empregos', 'Net-Empregos', 'PT', 'https://www.net-empregos.com/', 'disabled', null, false, 'inactive'),
  (7, 'indeed-pt', 'Indeed Portugal', 'PT', 'https://pt.indeed.com/', 'disabled', null, false, 'inactive'),
  (8, 'sapo-emprego', 'SAPO Emprego', 'PT', 'https://emprego.sapo.pt/', 'disabled', null, false, 'inactive'),
  (9, 'expresso-emprego', 'Expresso Emprego', 'PT', 'https://expressoemprego.pt/', 'disabled', null, false, 'inactive'),
  (10, 'itjobs', 'ITJobs', 'PT', 'https://www.itjobs.pt/', 'disabled', null, false, 'inactive')
on conflict (id) do nothing;

-- Remove fictitious seed listings presented as live vacancies
delete from applications where job_id in (select id from jobs where source_name = 'recruiter');
delete from saved_jobs where job_id in (select id from jobs where source_name = 'recruiter');
delete from jobs where source_name = 'recruiter';
delete from companies where owner_id is null;

create unique index if not exists jobs_fingerprint_uniq on jobs (fingerprint) where fingerprint is not null;

select setval('regions_id_seq', (select coalesce(max(id), 1) from regions));
select setval('cities_id_seq', (select coalesce(max(id), 1) from cities));
select setval('job_sources_id_seq', (select coalesce(max(id), 1) from job_sources));
