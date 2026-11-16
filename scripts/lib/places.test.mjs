// Run: node --test scripts/lib/places.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (f) => JSON.parse(fs.readFileSync(new URL(`../../src/data/${f}`, import.meta.url), "utf8"));
const MAP = read("places.json").places;

test("every place name in the fuel data has an EN and RU name (lists the unmapped ones)", () => {
  const unmapped = new Set();
  for (const f of Object.values(read("fuel-prices.json").fuels)) for (const s of f.stations) if (!MAP[s.district]) unmapped.add(s.district);
  assert.deepEqual([...unmapped].sort(), [], `unmapped place names (add them to src/data/places.json): ${[...unmapped].join(", ")}`);
});
test("no Greek letters in EN or RU names", () => {
  for (const [k, v] of Object.entries(MAP)) {
    assert.ok(!/[Ͱ-Ͽ]/.test(v.en), `${k}: EN has Greek: ${v.en}`);
    assert.ok(!/[Ͱ-Ͽ]/.test(v.ru), `${k}: RU has Greek: ${v.ru}`);
    assert.ok(/[А-я]/.test(v.ru), `${k}: RU not Cyrillic: ${v.ru}`);
  }
});
