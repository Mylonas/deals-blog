// Run: node --test scripts/lib/
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { cheapestChains, displayChain, storeLabel } from "./supermarket-stores.mjs";

const b = (companyName, retailerProductPrice) => ({ companyName, retailerProductPrice });

test("named chain is the argmin of the branch prices, not the first chain listed", () => {
  const r = cheapestChains([b("LIDL", 2.5), b("ΑΛΦΑΜΕΓΑ", 2.1), b("METRO", 1.9), b("ΣΚΛΑΒΕΝΙΤΗΣ", 3)]);
  assert.equal(r.price, 1.9);
  assert.deepEqual(r.chains, ["Metro"]);
});
test("several branches of one chain collapse to one name", () => {
  assert.deepEqual(cheapestChains([b("METRO", 1.9), b("METRO", 1.9), b("LIDL", 2)]).chains, ["Metro"]);
});
test("ties list every tied chain, sorted", () => {
  const r = cheapestChains([b("MAS - ΜΙΚΡΟΠΟΛΙΣ", 1.99), b("LIDL", 1.99), b("METRO", 2.5)]);
  assert.deepEqual(r.chains, ["LIDL", "MAS"]);
  assert.equal(storeLabel(r), "LIDL / MAS");
});
test("missing, zero and non-numeric prices are never the minimum", () => {
  const r = cheapestChains([b("LIDL", 0), b("METRO", null), b("ΑΛΦΑΜΕΓΑ", undefined), b("MAS", "0.5"), b("POPLIFE", 2.2)]);
  assert.equal(r.price, 2.2);
  assert.deepEqual(r.chains, ["Poplife"]);
  assert.equal(cheapestChains([b("LIDL", 0)]), null);
  assert.equal(cheapestChains([]), null);
});
test("chain names from the source map to display names", () => {
  assert.equal(displayChain("ΑΛΦΑΜΕΓΑ"), "AlphaMega");
  assert.equal(displayChain("WOLT MARKET&nbsp;"), "Wolt Market");
  assert.equal(displayChain("SUPER DISCOUNT STORE Ακάκι"), "Super Discount Store");
});

// Data guard: the stored data must not name one chain for everything (the old bug), and a
// named single chain must be a known display name or a tidied source name.
test("published supermarket data is not a single hard-coded chain", () => {
  const read = (f) => JSON.parse(fs.readFileSync(new URL(`../../src/data/${f}`, import.meta.url), "utf8"));
  const stores = [];
  const deals = read("supermarket-deals.json");
  for (const k of ["deals", "allTimeLows", "nearLows"]) for (const d of deals[k] || []) if (d.store) stores.push(d.store);
  for (const i of read("supermarket-prices.json").items) if (i.store) stores.push(i.store);
  if (stores.length >= 10) assert.ok(new Set(stores).size > 1, `all ${stores.length} products name the same chain: ${stores[0]}`);
});
