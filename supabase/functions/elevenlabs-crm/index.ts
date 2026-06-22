import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { timingSafeEqual } from "../_shared/timingSafeEqual.ts";
import { handleAction } from "./actions.ts";
import { getCachedEvent, storeEvent } from "./idempotency.ts";
import { parseRequest } from "./parseRequest.ts";
import type { CrmResult } from "./types.ts";

const webhookSecret = Deno.env.get("ELEVENLABS_CRM_WEBHOOK_SECRET");

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function verifyAuthorization(req: Request): Response | null {
  if (!webhookSecret) {
    console.error("Missing ELEVENLABS_CRM_WEBHOOK_SECRET");
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }

  const authorization = req.headers.get("Authorization") ?? "";
  const expected = `Bearer ${webhookSecret}`;

  if (!timingSafeEqual(authorization, expected)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  return null;
}

export async function handleElevenLabsCrmRequest(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  const authError = verifyAuthorization(req);
  if (authError) {
    return authError;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const parsed = parseRequest(body);
  if (parsed instanceof Response) {
    return parsed;
  }

  if (parsed.eventId) {
    try {
      const cached = await getCachedEvent(parsed.eventId);
      if (cached) {
        return jsonResponse({ result: cached });
      }
    } catch (error) {
      console.error("Idempotency lookup failed:", error);
      return jsonResponse({ error: "Idempotency lookup failed" }, 500);
    }
  }

  const result = await handleAction(parsed);
  if (result instanceof Response) {
    return result;
  }

  if (parsed.eventId) {
    try {
      await storeEvent(parsed.eventId, parsed.action, result);
    } catch (error) {
      console.error("Idempotency store failed:", error);
      return jsonResponse({ error: "Idempotency store failed" }, 500);
    }
  }

  return jsonResponse({ result });
}

if (import.meta.main) {
  Deno.serve((req) => handleElevenLabsCrmRequest(req));
}
