-- =====================================================
-- AGENTS: call-init configuration for ElevenLabs / Hyperdrive
-- =====================================================
-- Lookup table for Cloudflare Worker call initiation (public.agents).
-- Seed data is loaded separately.
--
-- id may be null for the default fallback row (see Cloudflare worker lookup).
-- Postgres PRIMARY KEY cannot be null, so id uses a partial unique index instead.

create table public.agents (
  id                                  text,
  atomic_crm_sales_id                 bigint,
  agent_tone                          varchar(255),
  ai_disclosure_rule                  varchar(255),
  approved_closing_message            varchar(255),
  availability_approved_answer        varchar(255),
  bad_enquiry_criteria                varchar(255),
  business_description                varchar(255),
  business_name                       varchar(255),
  calendar_or_booking_system          varchar(255),
  call_ending_next_step               varchar(255),
  credentials_approved_answer         varchar(255),
  custom_agent_introduction           varchar(255),
  end_of_call_action                  varchar(255),
  example_agent_tone                  varchar(255),
  excluded_areas                      varchar(255),
  forbidden_phrases                   varchar(255),
  good_enquiry_criteria               varchar(255),
  key_selling_points                  varchar(255),
  opening_hours_approved_answer       varchar(255),
  optional_customer_details           varchar(255),
  owner_name                          varchar(255),
  payment_approved_answer             varchar(255),
  pricing_approved_answer             varchar(255),
  pricing_permission_level            varchar(255),
  pricing_rules                       varchar(255),
  qualifications_and_credentials      varchar(255),
  quote_approved_answer               varchar(255),
  required_caution_phrases            varchar(255),
  required_customer_details           varchar(255),
  response_timeframe                  varchar(255),
  service_area_approved_answer        varchar(255),
  service_areas                       varchar(255),
  services_not_offered                varchar(255),
  services_offered                    varchar(255),
  trade_or_business_type              varchar(255),
  typical_availability                varchar(255),
  urgent_availability_rules           varchar(255),
  urgent_or_safety_critical_scenarios varchar(255),
  working_days_and_hours              varchar(255),
  business_whatsapp_no                text,
  agent_voice_id                      text,
  agent_first_message                 text
);

comment on table public.agents is
  'ElevenLabs call-init agent configuration keyed by phone number, agent id, or null default row.';

create unique index agents_id_key
  on public.agents (id)
  where id is not null;

create index agents_id_lookup_idx
  on public.agents (id);

-- =====================================================
-- PERMISSIONS & RLS
-- =====================================================

alter table public.agents enable row level security;

revoke all on public.agents from anon, authenticated, public;
grant select, insert, update, delete on public.agents to service_role;

create policy "hyperdrive_agents can read agents"
  on public.agents
  for select
  to hyperdrive_agents
  using (true);

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'hyperdrive_agents') then
    grant select on table public.agents to hyperdrive_agents;
  end if;
end;
$$;
