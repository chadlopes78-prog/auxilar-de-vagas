-- Dynamic, job-specific application questions

alter table jobs add column if not exists experience_required text;
alter table jobs add column if not exists education_required text;
alter table jobs add column if not exists skills_required text;
alter table jobs add column if not exists languages_required text;
alter table jobs add column if not exists licences_required text;
alter table jobs add column if not exists custom_application_questions jsonb;

create table if not exists job_application_questions (
  id serial primary key,
  job_id integer not null references jobs(id) on delete cascade,
  question_key text not null,
  question text not null,
  question_type text not null,
  required boolean not null default true,
  options jsonb,
  sort_order integer not null default 0,
  step_key text not null default 'specific',
  help_text text,
  visible_if jsonb,
  unique (job_id, question_key)
);

create index if not exists job_application_questions_job_idx
  on job_application_questions (job_id, sort_order);

alter table applications add column if not exists answers jsonb;
alter table applications add column if not exists answers_confirmed boolean not null default false;

create table if not exists application_answers (
  id serial primary key,
  application_id integer not null references applications(id) on delete cascade,
  question_id integer references job_application_questions(id) on delete set null,
  question_key text not null,
  question_text text not null,
  answer jsonb,
  unique (application_id, question_key)
);
