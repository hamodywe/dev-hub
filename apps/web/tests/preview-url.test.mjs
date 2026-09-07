import { test } from "node:test";
import assert from "node:assert/strict";
import { previewUrl } from "../src/lib/preview-url.ts";

test("public preview links omit seed placeholders and invalid destinations", () => {
  for (const value of ["https://example.com", "https://www.example.com/demo", "https://example.org/", "http://localhost:3100", "https://preview.test", "javascript:alert(1)", "//example.com", "#", "", undefined])
    assert.equal(previewUrl(value), "", String(value));
});

test("real external previews and bundled demos keep their exact destinations", () => {
  for (const value of ["/demos/academy/ar", "/demos/hotel/en#rooms", "https://devshub.cc/ar", "https://client.example-business.com/work?q=1"])
    assert.equal(previewUrl(value), value);
});
