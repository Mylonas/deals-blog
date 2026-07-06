/**
 * Audit pass: find venues whose stored souvlaki/chicken price is a low
 * outlier for their city, refetch their live menus, and report
 *   - what the current extraction logic computes now vs what is stored
 *     (catches stale carried-over entries computed with older logic)
 *   - any size/pitta option groups with zero-cost defaults, so new
 *     non-comparable patterns can be spotted by eye
 *
 * Read-only: prints a report, changes nothing. Feed confirmed slugs to
 * refresh-souvlaki-venue.mjs to patch them.
 *
 * Usage: node scripts/audit-souvlaki-outliers.mjs [threshold=0.85]
 */
import fs from "fs";
import { extractCuts, ASSORTMENT_API, HEADERS, OUT } from "./update-souvlaki-prices.mjs";

const THRESHOLD = parseFloat(process.argv[2] ?? "0.85"); // flag < median × threshold
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const data = JSON.parse(fs.readFileSync(OUT, "utf8"));

function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
}

// ── flag outliers ─────────────────────────────────────────────────────────────
const flagged = [];
for (const city of data.cities) {
  for (const cut of ["souvlaki", "chicken", "mix"]) {
    const prices = city.venues.map((v) => v.prices[cut]).filter((p) => p != null);
    if (prices.length < 5) continue;
    const med = median(prices);
    for (const v of city.venues) {
      const p = v.prices[cut];
      if (p != null && p < med * THRESHOLD) {
        const slug = v.slug || v.url?.split("/restaurant/")[1];
        let f = flagged.find((x) => x.slug === slug);
        if (!f) { f = { slug, name: v.name, city: city.key, venue: v, reasons: [] }; flagged.push(f); }
        f.reasons.push(`${cut} €${p.toFixed(2)} vs city median €${med.toFixed(2)}`);
      }
    }
  }
}

console.log(`Flagged ${flagged.length} venues below ${THRESHOLD * 100}% of city median:\n`);
flagged.forEach((f) => console.log(`  ${f.city} | ${f.name} — ${f.reasons.join("; ")}`));

// ── refetch and compare ───────────────────────────────────────────────────────
const ZERO_DEFAULT_RE = /pita|πιτα|μεγεθ|size/i;
console.log("\nRefetching flagged menus (slow)...\n");

for (const f of flagged) {
  try {
    const res = await fetch(`${ASSORTMENT_API}/${f.slug}/assortment`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) { console.log(`── ${f.name} (${f.slug}): HTTP ${res.status} — skipped`); await sleep(4000); continue; }
    const assortment = await res.json();
    const fresh = extractCuts(assortment);

    const stored = JSON.stringify(f.venue.prices);
    const now = JSON.stringify(fresh);
    console.log(`── ${f.city} | ${f.name} (${f.slug})`);
    console.log(`   stored: ${stored}`);
    console.log(`   fresh:  ${now}   ${stored === now ? "(same)" : "*** DIFFERS ***"}`);

    // surface size/pitta groups with a zero-cost value for eyeballing
    const optionsById = new Map((assortment.options || []).map((o) => [o.id, o]));
    const seen = new Set();
    for (const item of assortment.items || []) {
      if (!/souvl|σουβλ/i.test(item.name)) continue;
      for (const ref of item.options || []) {
        const g = optionsById.get(ref.option_id) ?? optionsById.get(ref.id);
        if (!g || seen.has(g.id) || !ZERO_DEFAULT_RE.test(g.name || "")) continue;
        seen.add(g.id);
        const vals = (g.values || []).map((v) => `${v.name}+${(v.price / 100).toFixed(2)}`).join(" | ");
        console.log(`   [${g.name}] ${vals.slice(0, 160)}`);
      }
    }
  } catch (e) {
    console.log(`── ${f.name} (${f.slug}): ${e.message} — skipped`);
  }
  await sleep(4000);
}
console.log("\nDone. Patch confirmed venues with: node scripts/refresh-souvlaki-venue.mjs <slug...>");
