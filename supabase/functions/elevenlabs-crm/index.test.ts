import { assertEquals } from "@std/assert";

const originalSecret = Deno.env.get("ELEVENLABS_CRM_WEBHOOK_SECRET");
const originalSupabaseUrl = Deno.env.get("SUPABASE_URL");
const originalServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

async function loadHandler() {
  Deno.env.set("SUPABASE_URL", "http://127.0.0.1:54321");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
  Deno.env.set("ELEVENLABS_CRM_WEBHOOK_SECRET", "test-secret");

  const module = await import("./index.ts");
  return module.handleElevenLabsCrmRequest;
}

function restoreEnv() {
  if (originalSecret) {
    Deno.env.set("ELEVENLABS_CRM_WEBHOOK_SECRET", originalSecret);
  } else {
    Deno.env.delete("ELEVENLABS_CRM_WEBHOOK_SECRET");
  }

  if (originalSupabaseUrl) {
    Deno.env.set("SUPABASE_URL", originalSupabaseUrl);
  } else {
    Deno.env.delete("SUPABASE_URL");
  }

  if (originalServiceRoleKey) {
    Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", originalServiceRoleKey);
  } else {
    Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");
  }
}

Deno.test("handleElevenLabsCrmRequest rejects non-POST requests", async () => {
  const handleElevenLabsCrmRequest = await loadHandler();

  const response = await handleElevenLabsCrmRequest(
    new Request("http://localhost/functions/v1/elevenlabs-crm", {
      method: "GET",
      headers: {
        Authorization: "Bearer test-secret",
      },
    }),
  );

  assertEquals(response.status, 405);
  restoreEnv();
});

Deno.test("handleElevenLabsCrmRequest rejects missing bearer token", async () => {
  const handleElevenLabsCrmRequest = await loadHandler();

  const response = await handleElevenLabsCrmRequest(
    new Request("http://localhost/functions/v1/elevenlabs-crm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parameters: {
          action: "search_contact",
          phone: "447747804136",
          sales_id: 1,
        },
      }),
    }),
  );

  assertEquals(response.status, 401);
  restoreEnv();
});

Deno.test("handleElevenLabsCrmRequest rejects invalid action with bearer auth", async () => {
  const handleElevenLabsCrmRequest = await loadHandler();

  const response = await handleElevenLabsCrmRequest(
    new Request("http://localhost/functions/v1/elevenlabs-crm", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-secret",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parameters: {
          action: "unknown_action",
        },
      }),
    }),
  );

  assertEquals(response.status, 400);
  restoreEnv();
});
