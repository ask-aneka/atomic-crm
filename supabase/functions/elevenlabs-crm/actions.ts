import { normalizePhone } from "../_shared/normalizePhone.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import type { CrmResult, ParsedRequest } from "./types.ts";

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function requireSalesId(salesId: number | undefined): number | Response {
  if (salesId === undefined || !Number.isFinite(salesId)) {
    return jsonError("Missing or invalid sales_id", 400);
  }
  return salesId;
}

export async function searchContact(
  request: ParsedRequest,
): Promise<CrmResult | Response> {
  const salesId = requireSalesId(request.salesId);
  if (salesId instanceof Response) {
    return salesId;
  }

  if (!request.phone) {
    return jsonError("Missing phone", 400);
  }

  const normalizedPhone = normalizePhone(request.phone);
  if (!normalizedPhone) {
    return jsonError("Invalid phone", 400);
  }

  const { data, error } = await supabaseAdmin
    .from("contacts_summary")
    .select(
      "id, first_name, last_name, email_jsonb, phone_jsonb, address_jsonb, company_name, sales_id",
    )
    .eq("sales_id", salesId)
    .ilike("phone_fts", `%${normalizedPhone}%`)
    .limit(1)
    .maybeSingle();

  if (error) {
    return jsonError(`Contact search failed: ${error.message}`, 500);
  }

  if (!data) {
    return { found: false };
  }

  return {
    found: true,
    contact: {
      id: data.id,
      first_name: data.first_name,
      last_name: data.last_name,
      email_jsonb: data.email_jsonb,
      phone_jsonb: data.phone_jsonb,
      address_jsonb: data.address_jsonb,
      company_name: data.company_name,
      sales_id: data.sales_id,
    },
    contact_id: data.id,
    first_name: data.first_name,
    last_name: data.last_name,
  };
}

export async function createContact(
  request: ParsedRequest,
): Promise<CrmResult | Response> {
  const salesId = requireSalesId(request.salesId);
  if (salesId instanceof Response) {
    return salesId;
  }

  if (!request.firstName || !request.lastName || !request.phone) {
    return jsonError("Missing first_name, last_name, or phone", 400);
  }

  const normalizedPhone = normalizePhone(request.phone);
  if (!normalizedPhone) {
    return jsonError("Invalid phone", 400);
  }

  const now = new Date().toISOString();
  const insertPayload: Record<string, unknown> = {
    first_name: request.firstName,
    last_name: request.lastName,
    phone_jsonb: [{ number: normalizedPhone, type: "Work" }],
    sales_id: salesId,
    first_seen: now,
    last_seen: now,
    tags: [],
  };

  if (request.email) {
    insertPayload.email_jsonb = [{ email: request.email, type: "Work" }];
  }

  const { data, error } = await supabaseAdmin
    .from("contacts")
    .insert(insertPayload)
    .select("id, first_name, last_name, sales_id")
    .single();

  if (error || !data) {
    return jsonError(
      `Could not create contact: ${error?.message ?? "unknown error"}`,
      500,
    );
  }

  return {
    created: true,
    contact_id: data.id,
    first_name: data.first_name,
    last_name: data.last_name,
    sales_id: data.sales_id,
  };
}

export async function createTask(
  request: ParsedRequest,
): Promise<CrmResult | Response> {
  const salesId = requireSalesId(request.salesId);
  if (salesId instanceof Response) {
    return salesId;
  }

  if (!request.contactId || !request.text) {
    return jsonError("Missing contact_id or text", 400);
  }

  const dueDate = request.dueDate ?? new Date().toISOString();
  const taskType = request.type ?? "none";

  const { data, error } = await supabaseAdmin
    .from("tasks")
    .insert({
      contact_id: request.contactId,
      text: request.text,
      type: taskType,
      due_date: dueDate,
      sales_id: salesId,
    })
    .select("id, contact_id, text, type, due_date, sales_id")
    .single();

  if (error || !data) {
    return jsonError(
      `Could not create task: ${error?.message ?? "unknown error"}`,
      500,
    );
  }

  const { error: updateContactError } = await supabaseAdmin
    .from("contacts")
    .update({ last_seen: new Date().toISOString() })
    .eq("id", request.contactId);

  if (updateContactError) {
    return jsonError(
      `Task created but contact update failed: ${updateContactError.message}`,
      500,
    );
  }

  return {
    created: true,
    task_id: data.id,
    contact_id: data.contact_id,
    text: data.text,
    type: data.type,
    due_date: data.due_date,
    sales_id: data.sales_id,
  };
}

export async function handleAction(
  request: ParsedRequest,
): Promise<CrmResult | Response> {
  switch (request.action) {
    case "search_contact":
      return searchContact(request);
    case "create_contact":
      return createContact(request);
    case "create_task":
      return createTask(request);
    default:
      return jsonError("Unsupported action", 400);
  }
}
