import { assertEquals } from "@std/assert";
import { extractPayload, parseRequest } from "./parseRequest.ts";

Deno.test("extractPayload reads ElevenLabs parameters object", () => {
  assertEquals(
    extractPayload({
      tool_name: "crm_search_contact",
      parameters: {
        action: "search_contact",
        phone: "447747804136",
        sales_id: 1,
      },
    }),
    {
      action: "search_contact",
      phone: "447747804136",
      sales_id: 1,
    },
  );
});

Deno.test("parseRequest builds event_id from conversation_id and action", () => {
  const parsed = parseRequest({
    conversation_id: "conv_123",
    parameters: {
      action: "create_task",
      contact_id: 42,
      text: "Follow up",
      sales_id: 1,
    },
  });

  if (parsed instanceof Response) {
    throw new Error("Expected parsed request");
  }

  assertEquals(parsed.action, "create_task");
  assertEquals(parsed.eventId, "conv_123-create_task");
  assertEquals(parsed.contactId, 42);
  assertEquals(parsed.text, "Follow up");
});

Deno.test("parseRequest rejects invalid action", async () => {
  const parsed = parseRequest({
    parameters: {
      action: "delete_everything",
    },
  });

  assertEquals(parsed instanceof Response, true);
  if (parsed instanceof Response) {
    assertEquals(parsed.status, 400);
  }
});
