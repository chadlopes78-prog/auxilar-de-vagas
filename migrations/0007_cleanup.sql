-- Force Portuguese country names and drop fictitious seed listings
update countries set name = 'Moçambique', slug = coalesce(slug, 'mocambique') where code = 'MZ';
update countries set name = 'Angola', slug = coalesce(slug, 'angola') where code = 'AO';
update countries set name = 'Portugal', slug = coalesce(slug, 'portugal') where code = 'PT';
update countries set name = 'África do Sul' where code = 'ZA';
update countries set name = 'Brasil' where code = 'BR';
update cities set name = 'Lisboa' where name = 'Lisbon';

delete from applications where job_id in (select id from jobs where source_name in ('recruiter', 'Recruiter'));
delete from saved_jobs where job_id in (select id from jobs where source_name in ('recruiter', 'Recruiter'));
delete from jobs where source_name in ('recruiter', 'Recruiter') or source_name ilike 'seed%';
delete from companies where owner_id is null and id not in (select company_id from jobs);
