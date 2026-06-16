-- Anon-readable branding surface for unauthenticated pages.
--
-- The `configuration` table stores the full `config` JSONB (deal stages,
-- sectors, currency, branding, etc.) and stays authenticated-only via RLS.
-- This migration adds a narrow view that projects ONLY the branding fields
-- (title, darkModeLogo, lightModeLogo) so login / sign-up / forgot-password
-- pages can render the customized title and logos before auth.
--
-- Security model (identical to `init_state`): `security_invoker = off` lets the
-- view owner read the underlying row while callers remain `anon`; the column
-- projection is the boundary. RLS on `configuration` is NOT relaxed.

create or replace view public.configuration_branding with (security_invoker = off) as
select
    c.id,
    c.config ->> 'title' as title,
    c.config ->> 'darkModeLogo' as "darkModeLogo",
    c.config ->> 'lightModeLogo' as "lightModeLogo"
from public.configuration c
where c.id = 1;

-- Grants required for Supabase Data API exposure (read-only view).
grant select on table public.configuration_branding to anon;
grant select on table public.configuration_branding to authenticated;
grant select on table public.configuration_branding to service_role;
