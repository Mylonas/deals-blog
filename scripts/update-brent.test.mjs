// Run: node --test scripts/update-brent.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { parseYahoo, buildBrent, toEurPerLitre } from "./update-brent.mjs";

const day = (d) => Date.parse(d + "T12:00:00Z") / 1000;
const yahoo = (rows) => ({ chart: { result: [{ timestamp: rows.map((r) => day(r[0])), indicators: { quote: [{ close: rows.map((r) => r[1]) }] } }] } });

test("converts USD/bbl to EUR/litre", () => assert.equal(toEurPerLitre(158.987, 1), 1));
test("parseYahoo drops null / out-of-range closes and sorts", () => {
  const bars = parseYahoo(yahoo([["2026-11-13", 95.8], ["2026-11-12", null], ["2026-11-11", 0.5], ["2026-11-10", 91.5]]));
  assert.deepEqual(bars.map((b) => b.d), ["2026-11-10", "2026-11-13"]);
});
test("buildBrent carries the market date separately from the fetch time", () => {
  const now = new Date("2026-11-16T06:20:00Z");
  const out = buildBrent([{ d: "2026-11-13", usd: 95.84 }], { "2026-11-13": 0.9 }, now);
  assert.equal(out.asOf, "2026-11-13");
  assert.equal(out.updatedAt, now.toISOString());
  assert.equal(out.eurPerLitre, toEurPerLitre(95.84, 0.9));
});
test("a price older than 6 days is refused, never stamped fresh", () => {
  assert.throws(() => buildBrent([{ d: "2026-11-01", usd: 90 }], { "2026-11-01": 0.9 }, new Date("2026-11-16T06:00:00Z")), /not publishing/);
});
test("no prices / no rates throw", () => {
  assert.throws(() => buildBrent([], { a: 1 }));
  assert.throws(() => buildBrent([{ d: "2026-11-16", usd: 90 }], {}));
});
