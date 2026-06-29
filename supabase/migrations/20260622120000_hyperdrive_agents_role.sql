-- =====================================================
-- HYPERDRIVE_AGENTS: Postgres login role for Cloudflare Hyperdrive
-- =====================================================
-- Password is read from Supabase Vault secret `hyperdrive_agents_password`,
-- injected locally via [db.vault] in supabase/config.toml from
-- HYPERDRIVE_AGENTS_PASSWORD in apps/atomic-crm/.env.development (or .env).
--
-- Remote: add the same secret name in Supabase Dashboard → Vault before db push,
-- or ensure the value is present in vault when this migration runs.
--
-- Grants SELECT on public.agents when that table exists (Hyperdrive call-init).

do $$
declare
  role_password text;
begin
  select decrypted_secret
  into role_password
  from vault.decrypted_secrets
  where name = 'hyperdrive_agents_password';

  if role_password is null or nullif(trim(role_password), '') is null then
    raise exception
      'missing vault secret hyperdrive_agents_password; set HYPERDRIVE_AGENTS_PASSWORD in apps/atomic-crm/.env.development and restart supabase start, or create the secret in Supabase Vault before db push';
  end if;

  if not exists (select 1 from pg_roles where rolname = 'hyperdrive_agents') then
    execute format(
      'create role hyperdrive_agents login password %L nosuperuser nocreatedb nocreaterole noreplication noinherit',
      role_password
    );
  else
    execute format(
      'alter role hyperdrive_agents password %L',
      role_password
    );
  end if;
end;
$$;

grant connect on database postgres to hyperdrive_agents;
grant usage on schema public to hyperdrive_agents;

do $$
begin
  if to_regclass('public.agents') is not null then
    grant select on table public.agents to hyperdrive_agents;
  end if;
end;
$$;

comment on role hyperdrive_agents is
  'Read-only Postgres login for Cloudflare Hyperdrive (call-init agent config). Password from vault secret hyperdrive_agents_password';
