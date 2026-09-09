-- NearHire core schema (multi-country job board)

create table if not exists countries (
  id serial primary key,
  code text unique not null,
  name text not null,
  currency text not null default 'USD'
);

create table if not exists regions (
  id serial primary key,
  country_id integer not null references countries(id) on delete cascade,
  name text not null
);

create table if not exists cities (
  id serial primary key,
  region_id integer not null references regions(id) on delete cascade,
  name text not null
);

create table if not exists categories (
  id serial primary key,
  slug text unique not null,
  name text not null,
  icon text not null default 'briefcase'
);

create table if not exists companies (
  id serial primary key,
  owner_id text,
  name text not null,
  industry text,
  description text,
  website text,
  socials text,
  size text,
  country_id integer references countries(id),
  region_id integer references regions(id),
  city_id integer references cities(id),
  approved boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists jobs (
  id serial primary key,
  company_id integer not null references companies(id) on delete cascade,
  title text not null,
  category_id integer references categories(id),
  country_id integer references countries(id),
  region_id integer references regions(id),
  city_id integer references cities(id),
  employment_type text not null default 'full-time',
  work_model text not null default 'on-site',
  experience_level text not null default 'entry',
  salary_min integer,
  salary_max integer,
  salary_currency text,
  description text,
  responsibilities text,
  requirements text,
  qualifications text,
  benefits text,
  apply_method text not null default 'platform',
  external_url text,
  apply_email text,
  deadline date,
  featured boolean not null default false,
  urgent boolean not null default false,
  status text not null default 'published',
  source_name text not null default 'recruiter',
  source_url text,
  external_job_id text,
  original_url text,
  last_synced_at timestamptz,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists jobs_external_uniq
  on jobs (source_name, external_job_id)
  where external_job_id is not null;

create index if not exists jobs_status_pub_idx on jobs (status, published_at desc);
create index if not exists jobs_loc_idx on jobs (country_id, region_id, city_id);
create index if not exists jobs_cat_idx on jobs (category_id);

create table if not exists profiles (
  user_id text primary key,
  role text not null default 'candidate',
  full_name text,
  email text,
  phone text,
  avatar_url text,
  country_id integer references countries(id),
  region_id integer references regions(id),
  city_id integer references cities(id),
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists candidate_profiles (
  user_id text primary key references profiles(user_id) on delete cascade,
  title text,
  about text,
  experience_level text,
  open_to_remote boolean not null default true,
  linkedin text,
  portfolio text,
  cv_name text,
  completeness integer not null default 20
);

create table if not exists employer_profiles (
  user_id text primary key references profiles(user_id) on delete cascade,
  company_id integer references companies(id)
);

create table if not exists applications (
  id serial primary key,
  job_id integer not null references jobs(id) on delete cascade,
  candidate_id text not null references profiles(user_id) on delete cascade,
  cover_letter text,
  phone text,
  email text,
  cv_name text,
  status text not null default 'applied',
  created_at timestamptz not null default now(),
  unique (job_id, candidate_id)
);

create table if not exists saved_jobs (
  user_id text not null references profiles(user_id) on delete cascade,
  job_id integer not null references jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, job_id)
);

create table if not exists job_alerts (
  id serial primary key,
  user_id text not null references profiles(user_id) on delete cascade,
  keyword text,
  city_id integer references cities(id),
  category_id integer references categories(id),
  frequency text not null default 'weekly',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id serial primary key,
  user_id text not null references profiles(user_id) on delete cascade,
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists experiences (
  id serial primary key,
  user_id text not null references profiles(user_id) on delete cascade,
  title text,
  company text,
  period text,
  description text
);

create table if not exists education (
  id serial primary key,
  user_id text not null references profiles(user_id) on delete cascade,
  school text,
  degree text,
  period text
);

create table if not exists skills (
  id serial primary key,
  name text unique not null
);

create table if not exists candidate_skills (
  user_id text not null references profiles(user_id) on delete cascade,
  skill_id integer not null references skills(id) on delete cascade,
  primary key (user_id, skill_id)
);

create table if not exists languages (
  id serial primary key,
  user_id text not null references profiles(user_id) on delete cascade,
  name text not null,
  level text
);

create table if not exists candidate_interests (
  user_id text not null references profiles(user_id) on delete cascade,
  category_id integer not null references categories(id) on delete cascade,
  primary key (user_id, category_id)
);
