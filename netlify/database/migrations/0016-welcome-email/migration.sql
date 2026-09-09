alter table profiles
  add column if not exists welcome_email_sent_at timestamptz;
