-- =====================================================
-- HYPERDRIVE_AGENTS: read contacts for call-init caller lookup
-- =====================================================

grant select on table public.contacts to hyperdrive_agents;

create policy "hyperdrive_agents can read contacts"
  on public.contacts
  for select
  to hyperdrive_agents
  using (true);
