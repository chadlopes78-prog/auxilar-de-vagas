alter table applications add column if not exists company_email text;

update applications a
set company_email = j.apply_email
from jobs j
where a.job_id = j.id
  and a.company_email is null
  and j.apply_email is not null
  and j.apply_email not ilike '%example.com%'
  and j.apply_email not ilike '%invent%';
