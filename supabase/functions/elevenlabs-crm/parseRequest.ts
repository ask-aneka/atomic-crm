import type { CrmAction, ParsedRequest } from "./types.ts";

const VALID_ACTIONS = new Set<CrmAction>([
  "search_contact",
  "create_contact",
  "create_task",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(
  source: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = source[key];
  if (typeof value === "string" && value.trim() !== "") {
    return value.trim();
  }
  return undefined;
}

function readNumber(
  source: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = source[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

export function extractPayload(body: unknown): Record<string, unknown> {
  if (!isRecord(body)) {
    return {};
  }

  const parameters = body.parameters;
  if (isRecord(parameters)) {
    return { ...parameters };
  }

  return { ...body };
}

export function parseRequest(body: unknown): ParsedRequest | Response {
  if (!isRecord(body)) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const payload = extractPayload(body);
  const action = readString(payload, "action") as CrmAction | undefined;

  if (!action || !VALID_ACTIONS.has(action)) {
    return new Response(
      JSON.stringify({
        error: "Missing or invalid action",
        valid_actions: [...VALID_ACTIONS],
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const conversationId =
    readString(body, "conversation_id") ??
    readString(payload, "conversation_id");

  const explicitEventId = readString(payload, "event_id");
  const eventId =
    explicitEventId ??
    (conversationId ? `${conversationId}-${action}` : undefined);

  return {
    action,
    conversationId,
    eventId,
    phone: readString(payload, "phone"),
    salesId: readNumber(payload, "sales_id"),
    firstName: readString(payload, "first_name"),
    lastName: readString(payload, "last_name"),
    email: readString(payload, "email"),
    contactId: readNumber(payload, "contact_id"),
    text: readString(payload, "text"),
    type: readString(payload, "type"),
    dueDate: readString(payload, "due_date"),
  };
}
