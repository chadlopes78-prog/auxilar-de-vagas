-- Advance serial sequences after explicit seed IDs
select setval('countries_id_seq', (select coalesce(max(id), 1) from countries));
select setval('regions_id_seq', (select coalesce(max(id), 1) from regions));
select setval('cities_id_seq', (select coalesce(max(id), 1) from cities));
select setval('categories_id_seq', (select coalesce(max(id), 1) from categories));
select setval('companies_id_seq', (select coalesce(max(id), 1) from companies));
select setval('jobs_id_seq', (select coalesce(max(id), 1) from jobs));
