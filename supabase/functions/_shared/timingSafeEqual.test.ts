import { assertEquals } from "jsr:@std/assert@1";
import { timingSafeEqual } from "./timingSafeEqual.ts";

Deno.test("timingSafeEqual returns true for matching strings", () => {
  assertEquals(timingSafeEqual("Bearer secret", "Bearer secret"), true);
});

Deno.test("timingSafeEqual returns false for different strings", () => {
  assertEquals(timingSafeEqual("Bearer secret", "Bearer wrong"), false);
});

Deno.test("timingSafeEqual returns false for different lengths", () => {
  assertEquals(timingSafeEqual("short", "much-longer-value"), false);
});
