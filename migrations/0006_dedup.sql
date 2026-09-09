-- Extra uniqueness for aggregator URLs
create unique index if not exists jobs_original_url_uniq
  on jobs (original_url)
  where original_url is not null;
