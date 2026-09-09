-- Internal NearHire vacancies covering the main professions for dynamic apply forms.
-- Also reset generated questions so they are rebuilt with title-first detection.

delete from job_application_questions;

update jobs
  set city_id = 3, region_id = 2
  where title ilike 'Recepcionista%'
    and source_name = 'NearHire'
    and country_id = 1;

insert into companies (id, owner_id, name, industry, description, size, country_id, region_id, city_id, approved)
values
  (104, null, 'Corredor Beira Transportes', 'Logística', 'Frota de pesados no corredor da Beira.', '51-200', 1, 1, 1, true),
  (105, null, 'Atlas Contas', 'Finanças', 'Contabilidade e fiscalidade para PME em Maputo.', '11-50', 1, 2, 3, true),
  (106, null, 'Nexa Digital', 'Tecnologia', 'Produto e engenharia de software em Moçambique.', '11-50', 1, 2, 3, true),
  (107, null, 'Escola Horizonte', 'Educação', 'Ensino secundário na Beira.', '51-200', 1, 1, 1, true)
on conflict (id) do nothing;

insert into jobs (
  company_id, title, category_id, country_id, region_id, city_id,
  employment_type, work_model, experience_level, salary_min, salary_max, salary_currency,
  description, responsibilities, requirements, qualifications, benefits,
  apply_method, status, source_name, source_id, published_at
)
select
  104, 'Motorista de pesados', 11, 1, 1, 1,
  'full-time', 'on-site', '1-2', 18000, 25000, 'MZN',
  'Condução de veículos pesados no corredor da Beira. Entregas regionais com equipa de operações.',
  'Planear rotas. Inspeccionar o veículo. Cumprir guias de marcha.',
  'Carta de condução categoria C. Dois anos como motorista profissional.',
  '12ª classe. Carta C válida.',
  'Subsídio de alimentação. Alojamento em viagem.',
  'platform', 'published', 'Auxilar de Vagas', 1, now()
where not exists (select 1 from jobs where title = 'Motorista de pesados' and source_name = 'NearHire');

insert into jobs (
  company_id, title, category_id, country_id, region_id, city_id,
  employment_type, work_model, experience_level, salary_min, salary_max, salary_currency,
  description, responsibilities, requirements, qualifications, benefits,
  apply_method, status, source_name, source_id, published_at
)
select
  105, 'Contabilista', 2, 1, 2, 3,
  'full-time', 'hybrid', '3-5', 35000, 50000, 'MZN',
  'Fecho mensal, relatórios e apoio fiscal a clientes PME em Maputo.',
  'Reconciliar contas. Preparar relatórios. Apoiar auditorias.',
  'Formação em contabilidade. Excel avançado. Experiência com impostos.',
  'Licenciatura em Contabilidade ou equivalente. OAM é uma vantagem.',
  'Modelo híbrido. Formação contínua.',
  'platform', 'published', 'Auxilar de Vagas', 1, now()
where not exists (select 1 from jobs where title = 'Contabilista' and source_name = 'NearHire');

insert into jobs (
  company_id, title, category_id, country_id, region_id, city_id,
  employment_type, work_model, experience_level, salary_min, salary_max, salary_currency,
  description, responsibilities, requirements, qualifications, benefits,
  apply_method, status, source_name, source_id, published_at
)
select
  106, 'Programador Full Stack', 10, 1, 2, 3,
  'full-time', 'remote', '3-5', 70000, 110000, 'MZN',
  'Desenvolvimento de APIs e interfaces para produtos digitais usados em Moçambique.',
  'Desenhar APIs. Escrever testes. Rever código.',
  'JavaScript ou TypeScript. React. Node.js. Experiência em produção.',
  'Portfólio ou GitHub. Formação em informática ou experiência equivalente.',
  'Remoto. Orçamento de formação.',
  'platform', 'published', 'Auxilar de Vagas', 1, now()
where not exists (select 1 from jobs where title = 'Programador Full Stack' and source_name = 'NearHire');

insert into jobs (
  company_id, title, category_id, country_id, region_id, city_id,
  employment_type, work_model, experience_level, salary_min, salary_max, salary_currency,
  description, responsibilities, requirements, qualifications, benefits,
  apply_method, status, source_name, source_id, published_at
)
select
  102, 'Enfermeiro', 8, 1, 2, 3,
  'full-time', 'on-site', '1-2', 22000, 32000, 'MZN',
  'Cuidados de enfermagem numa clínica em Maputo. Acompanhamento de utentes e apoio à equipa médica.',
  'Administrar medicação. Registar evoluções. Apoiar consultas.',
  'Cédula profissional de enfermagem. Disponibilidade para turnos.',
  'Curso médio ou licenciatura em enfermagem.',
  'Seguro de saúde. Turnos com suplemento.',
  'platform', 'published', 'Auxilar de Vagas', 1, now()
where not exists (select 1 from jobs where title = 'Enfermeiro' and source_name = 'NearHire');

insert into jobs (
  company_id, title, category_id, country_id, region_id, city_id,
  employment_type, work_model, experience_level, salary_min, salary_max, salary_currency,
  description, responsibilities, requirements, qualifications, benefits,
  apply_method, status, source_name, source_id, published_at
)
select
  107, 'Professor de Matemática', 6, 1, 1, 1,
  'full-time', 'on-site', '1-2', 18000, 26000, 'MZN',
  'Leccionar Matemática no ensino secundário na Beira.',
  'Preparar aulas. Avaliar alunos. Participar em reuniões pedagógicas.',
  'Formação de professor. Experiência a leccionar Matemática.',
  'Licenciatura em Ensino de Matemática ou equivalente.',
  'Férias escolares. Material didáctico.',
  'platform', 'published', 'Auxilar de Vagas', 1, now()
where not exists (select 1 from jobs where title = 'Professor de Matemática' and source_name = 'NearHire');

select setval('companies_id_seq', (select coalesce(max(id), 1) from companies));
select setval('jobs_id_seq', (select coalesce(max(id), 1) from jobs));
