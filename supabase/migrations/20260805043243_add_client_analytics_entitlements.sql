alter table public.clients
  add column if not exists analytics_enabled boolean not null default false;

comment on column public.clients.analytics_enabled is
  'Explicit client-portal analytics entitlement. Weekly report opt-in keeps this in sync.';

update public.clients
set analytics_enabled = true
where lower(name) in (
  'built3d',
  'micro demo',
  'salters',
  'dwellix',
  'fitxg4',
  'philotimo freestyle jujitsu'
);

insert into public.content_intelligence_profiles (
  client_id,
  enabled,
  industry,
  audience,
  source_queries,
  analytics_lookback_days
)
select
  client.id,
  true,
  coalesce(nullif(client.business_description, ''), nullif(client.brand_mission, ''), 'general business'),
  nullif(client.business_description, ''),
  case
    when jsonb_typeof(coalesce(client.brand_keywords, '[]'::jsonb)) = 'array' then coalesce(client.brand_keywords, '[]'::jsonb)
    else '[]'::jsonb
  end,
  30
from public.clients client
where lower(client.name) in (
  'built3d',
  'micro demo',
  'salters',
  'dwellix',
  'fitxg4',
  'philotimo freestyle jujitsu'
)
on conflict (client_id) do update set
  enabled = true,
  analytics_lookback_days = 30,
  updated_at = now();

insert into public.client_analytics_report_settings (
  client_id,
  enabled,
  recipient_email,
  recipient_name,
  timezone,
  send_weekday,
  send_time,
  lookback_days,
  transport
)
select
  client.id,
  true,
  client.contact_email,
  coalesce(nullif(client.contact_name, ''), client.name),
  'Australia/Melbourne',
  1,
  '09:00',
  30,
  'resend'
from public.clients client
where lower(client.name) in (
  'built3d',
  'micro demo',
  'salters',
  'fitxg4',
  'philotimo freestyle jujitsu'
)
  and client.contact_email is not null
  and client.zernio_profile_id is not null
  and jsonb_array_length(coalesce(client.late_profile_ids, '[]'::jsonb)) > 0
on conflict (client_id) do update set
  enabled = true,
  recipient_email = excluded.recipient_email,
  recipient_name = excluded.recipient_name,
  timezone = excluded.timezone,
  send_weekday = excluded.send_weekday,
  send_time = excluded.send_time,
  lookback_days = excluded.lookback_days,
  transport = excluded.transport,
  updated_at = now();
