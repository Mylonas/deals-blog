// Run: node --test scripts/lib/tracker-history.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { coffeeRecord, souvlakiRecord, cyprusDate } from "./tracker-history.mjs";

const cafes = (key, prices) => ({ key, cafes: prices.map((p, i) => ({ cafe: key + i, freddo: p })) });
test("coffee record: home = cheapest, per-city min/median, out-of-range prices ignored", () => {
  const r = coffeeRecord([cafes("nicosia", [2.5, 1.8, 3, 0.1]), cafes("limassol", [2, 99])], "2026-11-16", "t");
  assert.equal(r.home.price, 1.8);
  assert.equal(r.home.city, "nicosia");
  assert.deepEqual(r.cities.nicosia.freddo, { min: 1.8, median: 2.5, n: 3 });
  assert.equal(r.cuts.freddo.n, 4);
});
test("souvlaki record: unaudited Bolt prices are not recorded; home = cheapest audited souvlaki", () => {
  const v = (name, price, src, item) => ({ name, prices: { souvlaki: price }, priceSources: { souvlaki: src }, items: item ? { souvlaki: { name: "x" } } : {} });
  const r = souvlakiRecord([{ key: "limassol", venues: [v("A", 4, "bolt", false), v("B", 5, "foody", true), v("C", 6, "bolt", true)] }], "2026-11-16", "t");
  assert.equal(r.home.name, "B");
  assert.equal(r.cuts.souvlaki.n, 2);
});
test("no data -> no home value (nothing is written)", () => {
  assert.equal(coffeeRecord([], "2026-11-16", "t").home, null);
});
test("record date is the Cyprus date", () => assert.equal(cyprusDate(new Date("2026-11-16T22:30:00Z")), "2026-11-17"));
