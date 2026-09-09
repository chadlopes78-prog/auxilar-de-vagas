-- Country/region job alerts so empty locations can notify candidates.

alter table job_alerts add column if not exists country_id integer references countries(id);
alter table job_alerts add column if not exists region_id integer references regions(id);

create index if not exists job_alerts_country_idx on job_alerts (country_id);
create index if not exists job_alerts_region_idx on job_alerts (region_id);
