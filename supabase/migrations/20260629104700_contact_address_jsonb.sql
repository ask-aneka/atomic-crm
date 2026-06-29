alter table public.contacts
    add column address_jsonb jsonb;

drop view if exists public.contacts_summary;

create view public.contacts_summary with (security_invoker = on) as
select
    co.id,
    co.first_name,
    co.last_name,
    co.gender,
    co.title,
    co.background,
    co.avatar,
    co.first_seen,
    co.last_seen,
    co.has_newsletter,
    co.status,
    co.tags,
    co.company_id,
    co.sales_id,
    co.linkedin_url,
    co.email_jsonb,
    co.phone_jsonb,
    co.address_jsonb,
    (jsonb_path_query_array(co.email_jsonb, '$[*]."email"'))::text as email_fts,
    (jsonb_path_query_array(co.phone_jsonb, '$[*]."number"'))::text as phone_fts,
    concat_ws(
        ' ',
        (jsonb_path_query_array(co.address_jsonb, '$[*]."street"'))::text,
        (jsonb_path_query_array(co.address_jsonb, '$[*]."city"'))::text,
        (jsonb_path_query_array(co.address_jsonb, '$[*]."state"'))::text,
        (jsonb_path_query_array(co.address_jsonb, '$[*]."postal_code"'))::text,
        (jsonb_path_query_array(co.address_jsonb, '$[*]."country"'))::text
    ) as address_fts,
    c.name as company_name,
    count(distinct t.id) filter (where t.done_date is null) as nb_tasks
from public.contacts co
    left join public.tasks t on co.id = t.contact_id
    left join public.companies c on co.company_id = c.id
group by co.id, c.name;

grant all on table public.contacts_summary to anon;
grant all on table public.contacts_summary to authenticated;
grant all on table public.contacts_summary to service_role;

CREATE OR REPLACE FUNCTION "public"."merge_contacts"("loser_id" bigint, "winner_id" bigint) RETURNS bigint
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  winner_contact contacts%ROWTYPE;
  loser_contact contacts%ROWTYPE;
  deal_record RECORD;
  merged_emails jsonb;
  merged_phones jsonb;
  merged_addresses jsonb;
  merged_tags bigint[];
  winner_emails jsonb;
  loser_emails jsonb;
  winner_phones jsonb;
  loser_phones jsonb;
  winner_addresses jsonb;
  loser_addresses jsonb;
  email_map jsonb;
  phone_map jsonb;
  address_map jsonb;
  address_key text;
BEGIN
  SELECT * INTO winner_contact FROM contacts WHERE id = winner_id;
  SELECT * INTO loser_contact FROM contacts WHERE id = loser_id;

  IF winner_contact IS NULL OR loser_contact IS NULL THEN
    RAISE EXCEPTION 'Contact not found';
  END IF;

  UPDATE tasks SET contact_id = winner_id WHERE contact_id = loser_id;
  UPDATE contact_notes SET contact_id = winner_id WHERE contact_id = loser_id;

  FOR deal_record IN
    SELECT id, contact_ids
    FROM deals
    WHERE contact_ids @> ARRAY[loser_id]
  LOOP
    UPDATE deals
    SET contact_ids = (
      SELECT ARRAY(
        SELECT DISTINCT unnest(
          array_remove(deal_record.contact_ids, loser_id) || ARRAY[winner_id]
        )
      )
    )
    WHERE id = deal_record.id;
  END LOOP;

  winner_emails := COALESCE(winner_contact.email_jsonb, '[]'::jsonb);
  loser_emails := COALESCE(loser_contact.email_jsonb, '[]'::jsonb);
  email_map := '{}'::jsonb;

  IF jsonb_array_length(winner_emails) > 0 THEN
    FOR i IN 0..jsonb_array_length(winner_emails)-1 LOOP
      email_map := email_map || jsonb_build_object(
        winner_emails->i->>'email',
        winner_emails->i
      );
    END LOOP;
  END IF;

  IF jsonb_array_length(loser_emails) > 0 THEN
    FOR i IN 0..jsonb_array_length(loser_emails)-1 LOOP
      IF NOT email_map ? (loser_emails->i->>'email') THEN
        email_map := email_map || jsonb_build_object(
          loser_emails->i->>'email',
          loser_emails->i
        );
      END IF;
    END LOOP;
  END IF;

  merged_emails := (SELECT jsonb_agg(value) FROM jsonb_each(email_map));
  merged_emails := COALESCE(merged_emails, '[]'::jsonb);

  winner_phones := COALESCE(winner_contact.phone_jsonb, '[]'::jsonb);
  loser_phones := COALESCE(loser_contact.phone_jsonb, '[]'::jsonb);
  phone_map := '{}'::jsonb;

  IF jsonb_array_length(winner_phones) > 0 THEN
    FOR i IN 0..jsonb_array_length(winner_phones)-1 LOOP
      phone_map := phone_map || jsonb_build_object(
        winner_phones->i->>'number',
        winner_phones->i
      );
    END LOOP;
  END IF;

  IF jsonb_array_length(loser_phones) > 0 THEN
    FOR i IN 0..jsonb_array_length(loser_phones)-1 LOOP
      IF NOT phone_map ? (loser_phones->i->>'number') THEN
        phone_map := phone_map || jsonb_build_object(
          loser_phones->i->>'number',
          loser_phones->i
        );
      END IF;
    END LOOP;
  END IF;

  merged_phones := (SELECT jsonb_agg(value) FROM jsonb_each(phone_map));
  merged_phones := COALESCE(merged_phones, '[]'::jsonb);

  winner_addresses := COALESCE(winner_contact.address_jsonb, '[]'::jsonb);
  loser_addresses := COALESCE(loser_contact.address_jsonb, '[]'::jsonb);
  address_map := '{}'::jsonb;

  IF jsonb_array_length(winner_addresses) > 0 THEN
    FOR i IN 0..jsonb_array_length(winner_addresses)-1 LOOP
      address_key := lower(concat_ws(
        '|',
        winner_addresses->i->>'street',
        winner_addresses->i->>'city',
        winner_addresses->i->>'state',
        winner_addresses->i->>'postal_code',
        winner_addresses->i->>'country'
      ));
      IF address_key <> '' THEN
        address_map := address_map || jsonb_build_object(
          address_key,
          winner_addresses->i
        );
      END IF;
    END LOOP;
  END IF;

  IF jsonb_array_length(loser_addresses) > 0 THEN
    FOR i IN 0..jsonb_array_length(loser_addresses)-1 LOOP
      address_key := lower(concat_ws(
        '|',
        loser_addresses->i->>'street',
        loser_addresses->i->>'city',
        loser_addresses->i->>'state',
        loser_addresses->i->>'postal_code',
        loser_addresses->i->>'country'
      ));
      IF address_key <> '' AND NOT address_map ? address_key THEN
        address_map := address_map || jsonb_build_object(
          address_key,
          loser_addresses->i
        );
      END IF;
    END LOOP;
  END IF;

  merged_addresses := (SELECT jsonb_agg(value) FROM jsonb_each(address_map));
  merged_addresses := COALESCE(merged_addresses, '[]'::jsonb);

  merged_tags := ARRAY(
    SELECT DISTINCT unnest(
      COALESCE(winner_contact.tags, ARRAY[]::bigint[]) ||
      COALESCE(loser_contact.tags, ARRAY[]::bigint[])
    )
  );

  UPDATE contacts SET
    avatar = COALESCE(winner_contact.avatar, loser_contact.avatar),
    gender = COALESCE(winner_contact.gender, loser_contact.gender),
    first_name = COALESCE(winner_contact.first_name, loser_contact.first_name),
    last_name = COALESCE(winner_contact.last_name, loser_contact.last_name),
    title = COALESCE(winner_contact.title, loser_contact.title),
    company_id = COALESCE(winner_contact.company_id, loser_contact.company_id),
    email_jsonb = merged_emails,
    phone_jsonb = merged_phones,
    address_jsonb = merged_addresses,
    linkedin_url = COALESCE(winner_contact.linkedin_url, loser_contact.linkedin_url),
    background = COALESCE(winner_contact.background, loser_contact.background),
    has_newsletter = COALESCE(winner_contact.has_newsletter, loser_contact.has_newsletter),
    first_seen = LEAST(COALESCE(winner_contact.first_seen, loser_contact.first_seen), COALESCE(loser_contact.first_seen, winner_contact.first_seen)),
    last_seen = GREATEST(COALESCE(winner_contact.last_seen, loser_contact.last_seen), COALESCE(loser_contact.last_seen, winner_contact.last_seen)),
    sales_id = COALESCE(winner_contact.sales_id, loser_contact.sales_id),
    tags = merged_tags
  WHERE id = winner_id;

  DELETE FROM contacts WHERE id = loser_id;

  RETURN winner_id;
END;
$$;
