export type CrmAction = "search_contact" | "create_contact" | "create_task";

export interface ParsedRequest {
  action: CrmAction;
  conversationId?: string;
  eventId?: string;
  phone?: string;
  salesId?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  contactId?: number;
  text?: string;
  type?: string;
  dueDate?: string;
}

export interface CrmResult {
  [key: string]: unknown;
}
