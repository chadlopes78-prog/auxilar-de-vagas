-- Public RSS feeds allowed by robots.txt / published sitemaps

update job_sources
set feed_url = coalesce(feed_url, 'https://todasvagas.com/feed'),
    integration_type = case when integration_type in ('disabled', 'official_redirect') then 'rss' else integration_type end
where slug = 'todas-vagas';

update job_sources
set feed_url = coalesce(feed_url, 'https://www.net-empregos.com/rss.asp'),
    integration_type = case when integration_type in ('disabled', 'official_redirect') then 'rss' else integration_type end
where slug = 'net-empregos';

insert into regions (country_id, name, slug)
select 4, v.name, v.slug
from (values
  ('Santarém', 'santarem'),
  ('Leiria', 'leiria'),
  ('Viseu', 'viseu'),
  ('Vila Real', 'vila-real'),
  ('Viana do Castelo', 'viana-do-castelo'),
  ('Guarda', 'guarda'),
  ('Castelo Branco', 'castelo-branco'),
  ('Évora', 'evora'),
  ('Beja', 'beja'),
  ('Portalegre', 'portalegre'),
  ('Bragança', 'braganca'),
  ('Madeira', 'madeira'),
  ('Açores', 'acores')
) as v(name, slug)
where not exists (
  select 1 from regions r
  where r.country_id = 4 and (lower(coalesce(r.slug, '')) = v.slug or lower(r.name) = lower(v.name))
);

select setval('regions_id_seq', (select coalesce(max(id), 1) from regions));
