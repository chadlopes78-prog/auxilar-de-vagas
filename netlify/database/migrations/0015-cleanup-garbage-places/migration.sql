-- Drop HTML leaked from RSS into places/companies (Net-Empregos encoded descriptions)

update jobs set city_id = null
where city_id in (
  select id from cities
  where char_length(name) > 48
     or name like '%<%'
     or name like '%>%'
     or name ilike '%todas as zonas%'
     or name ilike '%http%'
);

update jobs set region_id = null
where region_id in (
  select id from regions
  where char_length(name) > 48
     or name like '%<%'
     or name like '%>%'
     or name ilike '%todas as zonas%'
     or name ilike '%http%'
);

update companies set city_id = null
where city_id in (
  select id from cities
  where char_length(name) > 48 or name like '%<%' or name like '%>%'
);
update companies set region_id = null
where region_id in (
  select id from regions
  where char_length(name) > 48 or name like '%<%' or name like '%>%'
);
update profiles set city_id = null
where city_id in (
  select id from cities
  where char_length(name) > 48 or name like '%<%' or name like '%>%'
);
update profiles set region_id = null
where region_id in (
  select id from regions
  where char_length(name) > 48 or name like '%<%' or name like '%>%'
);
update job_alerts set city_id = null
where city_id in (
  select id from cities
  where char_length(name) > 48 or name like '%<%' or name like '%>%'
);

delete from cities
where char_length(name) > 48
   or name like '%<%'
   or name like '%>%'
   or name ilike '%todas as zonas%'
   or name ilike '%http%';

delete from regions
where char_length(name) > 48
   or name like '%<%'
   or name like '%>%'
   or name ilike '%todas as zonas%'
   or name ilike '%http%';

update companies
set name = trim(regexp_replace(name, '<[^>]+>', '', 'g'))
where name like '%<%' or name like '%>%';
