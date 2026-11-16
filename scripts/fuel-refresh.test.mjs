import test from "node:test";
import assert from "node:assert/strict";
import { validateCapture, snippet } from "./fuel-refresh.mjs";

const st = (n, p = 1.6) => Array.from({ length: n }, (_, i) => ({ brand: "X", address: "A" + i, district: "D", price: p }));
test("accepts a normal capture", () => assert.equal(validateCapture("95", { fuel: "95", stations: st(300) }), null));
test("rejects wrong fuel, too few stations, bad prices", () => {
  assert.match(validateCapture("95", { fuel: "98", stations: st(300) }), /wrong fuel/);
  assert.match(validateCapture("95", { fuel: "95", stations: st(10) }), /only 10/);
  assert.match(validateCapture("95", { fuel: "95", stations: st(300, 16) }), /implausible/);
  assert.match(validateCapture("95", null), /wrong fuel/);
});
test("console snippet is valid JavaScript", () => assert.doesNotThrow(() => new Function(snippet("95"))));
