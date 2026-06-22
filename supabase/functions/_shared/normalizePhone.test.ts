import { assertEquals } from "jsr:@std/assert@1";
import { normalizePhone } from "./normalizePhone.ts";

Deno.test("normalizePhone strips non-digit characters", () => {
  assertEquals(normalizePhone("+44 7747 804136"), "447747804136");
  assertEquals(normalizePhone("(0123) 456-7890"), "01234567890");
  assertEquals(normalizePhone(""), "");
});
