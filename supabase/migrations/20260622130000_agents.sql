-- =====================================================
-- AGENTS: call-init configuration for ElevenLabs / Hyperdrive
-- =====================================================
-- Lookup table for Cloudflare Worker call initiation (public.agents).
-- Seed data is loaded separately.
--
-- id is the lookup key: phone number, ElevenLabs agent id, or 'default'
-- for the fallback row (see Cloudflare worker lookup).

create table public.agents (
  id                                  text primary key,
  atomic_crm_sales_id                 bigint default 1,
  agent_tone                          text,
  ai_disclosure_rule                  text,
  approved_closing_message            text,
  availability_approved_answer        text,
  bad_enquiry_criteria                text,
  business_description                text,
  business_name                       text,
  calendar_or_booking_system          text,
  call_ending_next_step               text,
  credentials_approved_answer         text,
  custom_agent_introduction           text,
  end_of_call_action                  text,
  example_agent_tone                  text,
  excluded_areas                      text,
  forbidden_phrases                   text,
  good_enquiry_criteria               text,
  key_selling_points                  text,
  opening_hours_approved_answer       text,
  optional_customer_details           text,
  owner_name                          text,
  payment_approved_answer             text,
  pricing_approved_answer             text,
  pricing_permission_level            text,
  pricing_rules                       text,
  qualifications_and_credentials      text,
  quote_approved_answer               text,
  required_caution_phrases            text,
  required_customer_details           text,
  response_timeframe                  text,
  service_area_approved_answer        text,
  service_areas                       text,
  services_not_offered                text,
  services_offered                    text,
  trade_or_business_type              text,
  typical_availability                text,
  urgent_availability_rules           text,
  urgent_or_safety_critical_scenarios text,
  working_days_and_hours              text,
  business_whatsapp_no                text,
  agent_voice_id                      text,
  agent_first_message                 text
);

comment on table public.agents is
  'ElevenLabs call-init agent configuration keyed by phone number, agent id, or ''default'' fallback row.';

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
