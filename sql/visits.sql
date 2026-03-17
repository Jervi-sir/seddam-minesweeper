-- Run this once on your Neon database.
--
-- NOTE: Storing plain IP addresses is personal data.
-- Make sure you understand your privacy / compliance requirements.

create table if not exists visits (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  ip text not null,
  user_agent text not null,
  path text not null default '',
  referrer text not null default ''
);

create index if not exists visits_created_at_idx on visits (created_at);
create index if not exists visits_ip_idx on visits (ip);
