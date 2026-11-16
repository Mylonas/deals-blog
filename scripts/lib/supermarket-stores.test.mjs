// Run: node --test scripts/lib/supermarket-stores.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { cheapestChains, chainId, storeLabel, isDelivery } from "./supermarket-stores.mjs";

const b = (companyName, retailerProductPrice) => ({ companyName, retailerProductPrice });
const chains = JSON.parse(fs.readFileSync(new URL("../../src/data/chains.json", import.meta.url), "utf8")).chains;

// every e-kalathi company name seen in /fetch-companies on 2026-11-16 (48 entries)
const SOURCE_COMPANIES = [
  "ALPHA SIGMA", "LIDL", "LYSIOTIS", "MAS - GREEN TREE", "MAS - KARSERAS", "MAS - MARY'S MARKET", "MAS - THE FRESH MARKET",
  "MAS - TOYMΠΑΣ", "MAS - Α&T ΔΙΟΜΗΔΟΥΣ", "MAS - ΜΙΚΡΟΠΟΛΙΣ", "MAS - ΤΡΕΜΕΤΟΥΣΙΩΤΗΣ", "MAS - ΤΡΙΑΝΤΑΦΥΛΛΟΣ", "METRO", "PAPANTONIOU",
  "PHILIPPOS", "PLUS DISCOUNT MARKET", "POPLIFE", "SMART DISCOUNT SHOP Αγγλισίδες", "SMART DISCOUNT SHOP Άγιος Λάζαρος",
  "SMART DISCOUNT SHOP Λάρνακας - Κοκκινοτριμιθιάς", "SUPER DISCOUNT STORE", "SUPER DISCOUNT STORE Ακάκι", "WOLT MARKET&nbsp;",
  "ΑΘΗΑΙΝΙΤΗΣ NICOSIA MALL", "ΑΘΗΑΙΝΙΤΗΣ ΠΑΛΛΟΥΡΙΩΤΙΣΣΑ", "ΑΛΦΑΜΕΓΑ", "ΑΝΔΡΕΑΣ & ΑΥΓΟΥΣΤΗΣ", "ΙΩΑΝΝΙΔΗΣ", "ΚΚΟΛΙΑΣ", "ΚΟΚΚΙΝΟΣ",
  "ΚΥΡΙΑΚΟΣ ΠΑΠΑΓΙΑΝΝΗΣ", "Ο ΚΗΠΟΣ ΤΗΣ ΕΔΕΜ", "ΠΑΠΑΣ", "ΣΚΛΑΒΕΝΙΤΗΣ", "ΣΤΕΛΙΟΣ", "ΣΥΠΑΛ - ORANGE", "ΣΥΠΑΛ - ΛΙΜΝΙΑ",
  "ΣΥΠΑΛ - Σ.Τ.Κ. ΤΙΡΚΑΣ", "ΣΥΠΑΛ - ΤΟ ΑΛΑΚΑΤΙ", "ΤΟ ΑΛΕΤΡΙ",
];

test("named chain is the argmin of the branch prices, not the first chain listed", () => {
  const r = cheapestChains([b("LIDL", 2.5), b("ΑΛΦΑΜΕΓΑ", 2.1), b("METRO", 1.9), b("ΣΚΛΑΒΕΝΙΤΗΣ", 3)]);
  assert.equal(r.price, 1.9);
  assert.deepEqual(r.ids, ["metro"]);
});
test("several branches of one chain collapse to one id", () => {
  assert.deepEqual(cheapestChains([b("METRO", 1.9), b("METRO", 1.9), b("LIDL", 2)]).ids, ["metro"]);
});
test("ties list every tied chain, sorted", () => {
  const r = cheapestChains([b("MAS - ΜΙΚΡΟΠΟΛΙΣ", 1.99), b("LIDL", 1.99), b("METRO", 2.5)]);
  assert.deepEqual(r.ids, ["lidl", "mas"]);
  assert.equal(storeLabel(r), "LIDL / MAS");
});
test("missing, zero and non-numeric prices are never the minimum", () => {
  const r = cheapestChains([b("LIDL", 0), b("METRO", null), b("ΑΛΦΑΜΕΓΑ", undefined), b("MAS", "0.5"), b("POPLIFE", 2.2)]);
  assert.equal(r.price, 2.2);
  assert.deepEqual(r.ids, ["poplife"]);
  assert.equal(cheapestChains([b("LIDL", 0)]), null);
  assert.equal(cheapestChains([]), null);
});
test("Wolt Market (delivery only) is never named as the cheapest chain", () => {
  const r = cheapestChains([b("WOLT MARKET&nbsp;", 1.0), b("LIDL", 1.5), b("METRO", 1.6)]);
  assert.equal(r.price, 1.5);
  assert.deepEqual(r.ids, ["lidl"]);
  assert.equal(cheapestChains([b("WOLT MARKET&nbsp;", 1.0)]), null);
  assert.ok(isDelivery("wolt-market"));
});
test("every source company maps to a chain with EN, EL and RU names (no Greek on the EN page)", () => {
  for (const name of SOURCE_COMPANIES) {
    const id = chainId(name);
    assert.ok(id, `unmapped company: ${name}`);
    const c = chains.find((x) => x.id === id);
    assert.ok(c.en && c.el && c.ru, `${id} lacks a language name`);
    assert.ok(!/[Ͱ-Ͽ]/.test(c.en), `${id} EN name contains Greek: ${c.en}`);
    assert.ok(!/[Ͱ-Ͽ]/.test(c.ru), `${id} RU name contains Greek: ${c.ru}`);
    assert.ok(/[А-я]/.test(c.ru) || /^[A-Za-z &]+$/.test(c.ru), `${id} RU name not transliterated: ${c.ru}`);
  }
});

// Data guards on the published files.
const read = (f) => JSON.parse(fs.readFileSync(new URL(`../../src/data/${f}`, import.meta.url), "utf8"));
test("published data names several chains, only known ids, never Wolt Market", () => {
  const ids = [];
  const deals = read("supermarket-deals.json");
  for (const k of ["deals", "allTimeLows", "nearLows"]) for (const d of deals[k] || []) ids.push(...(d.storeIds || []));
  for (const i of read("supermarket-prices.json").items) ids.push(...(i.storeIds || []));
  if (ids.length >= 10) assert.ok(new Set(ids).size > 1, `all ${ids.length} products name the same chain: ${ids[0]}`);
  for (const id of ids) {
    const c = chains.find((x) => x.id === id);
    assert.ok(c, `unknown chain id in data: ${id}`);
    assert.ok(!c.delivery, `delivery service named as cheapest chain: ${id}`);
  }
});
