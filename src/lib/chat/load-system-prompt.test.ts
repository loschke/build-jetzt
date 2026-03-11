import { test } from "node:test";
import assert from "node:assert";
import { loadSystemPrompt } from "./load-system-prompt.ts";

test("loadSystemPrompt loads system content only when moduleSlug is missing", async () => {
  const prompt = await loadSystemPrompt("ai-design");
  assert.ok(prompt.includes("Du bist ein erfahrener Experte für KI-gestützte Bildgenerierung"));
  assert.strictEqual(prompt.includes("## Aktueller Modul-Kontext: 4K Framework"), false);
});

test("loadSystemPrompt loads both system and module content when moduleSlug is provided", async () => {
  const prompt = await loadSystemPrompt("ai-design", "4k-framework");
  assert.ok(prompt.includes("Du bist ein erfahrener Experte für KI-gestützte Bildgenerierung"));
  assert.ok(prompt.includes("## Aktueller Modul-Kontext: 4K Framework"));
  assert.ok(prompt.includes("\n\n---\n\n"));
});

test("loadSystemPrompt handles missing module gracefully", async () => {
  const prompt = await loadSystemPrompt("ai-design", "non-existent");
  assert.ok(prompt.includes("Du bist ein erfahrener Experte für KI-gestützte Bildgenerierung"));
  assert.strictEqual(prompt.includes("\n\n---\n\n"), false);
});

test("loadSystemPrompt handles invalid slug pattern gracefully", async () => {
  const prompt = await loadSystemPrompt("ai-design", "../../../etc/passwd");
  assert.ok(prompt.includes("Du bist ein erfahrener Experte für KI-gestützte Bildgenerierung"));
  assert.strictEqual(prompt.includes("\n\n---\n\n"), false);
});
