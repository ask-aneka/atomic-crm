import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import type { CrmResult } from "./types.ts";

export async function getCachedEvent(
  eventId: string,
): Promise<CrmResult | null> {
  const { data, error } = await supabaseAdmin
    .from("elevenlabs_crm_events")
    .select("response")
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Could not fetch idempotency record: ${error.message}`,
    );
  }

  if (!data?.response || typeof data.response !== "object") {
    return null;
  }

  return data.response as CrmResult;
}

export async function storeEvent(
  eventId: string,
  action: string,
  response: CrmResult,
): Promise<void> {
  const { error } = await supabaseAdmin.from("elevenlabs_crm_events").insert({
    event_id: eventId,
    action,
    response,
  });

  if (error) {
    if (error.code === "23505") {
      const cached = await getCachedEvent(eventId);
      if (cached) {
        return;
      }
    }
    throw new Error(`Could not store idempotency record: ${error.message}`);
  }
}
