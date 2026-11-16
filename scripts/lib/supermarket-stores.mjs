// Which supermarket chain really sells a product at its lowest price?
//
// The old approach asked e-kalathi's product list for each chain in turn
// (`fetch-product-list?companyIds=<id>`) and took the first chain whose answer had
// startPrice <= the global minimum. That endpoint IGNORES companyIds for the price - it
// answers every chain with the same global-minimum product - so the first chain in the
// list (LIDL) "won" for every product, whoever really sold it cheapest.
//
// The product page itself uses `retail/fetch-retail-branch-list?productId=<id>`, which
// returns one row per branch with that branch's own price (`retailerProductPrice`).
// The cheapest chain is the argmin of those prices, grouped by chain. Display names live in
// src/data/chains.json (EN/EL/RU); delivery-only Wolt Market is excluded.
const API = "https://www.e-kalathi.gov.cy/ekalathi-website-server/api";
const HEADERS = { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; DealsHubBot/1.0)" };

import fs from "node:fs";
const CHAINS = JSON.parse(fs.readFileSync(new URL("../../src/data/chains.json", import.meta.url), "utf8")).chains;
const COMPILED = CHAINS.map((c) => ({ ...c, res: c.match.map((m) => new RegExp(m)) }));

/** e-kalathi companyName -> normalised form: HTML entities, accents stripped, upper case. */
const norm = (name) => String(name ?? "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();

/** Chain id for a source company name (src/data/chains.json is the single mapping), or null if unmapped. */
export function chainId(companyName) {
  const n = norm(companyName);
  for (const c of COMPILED) if (c.res.some((r) => r.test(n))) return c.id;
  return null;
}
export const isDelivery = (id) => !!CHAINS.find((c) => c.id === id)?.delivery;
export const chainEn = (id) => CHAINS.find((c) => c.id === id)?.en ?? id;

/**
 * Pure: the chain(s) with the lowest branch price among real shops. Delivery-only services (Wolt
 * Market) are skipped. Missing / non-positive / non-numeric prices are ignored (never treated as 0).
 * Unmapped chains get id "?<normalised name>" so they still count (and the test fails loudly).
 * Returns { price, ids: [sorted chain ids] } or null.
 */
export function cheapestChains(branches) {
  const rows = [];
  for (const b of branches || []) {
    const p = b?.retailerProductPrice;
    if (!(typeof p === "number" && Number.isFinite(p) && p > 0)) continue;
    const id = chainId(b.companyName) ?? "?" + norm(b.companyName);
    if (isDelivery(id)) continue;
    rows.push([id, p]);
  }
  if (!rows.length) return null;
  const min = Math.min(...rows.map((r) => r[1]));
  const ids = [...new Set(rows.filter((r) => Math.abs(r[1] - min) < 0.005).map((r) => r[0]))].sort();
  return { price: min, ids };
}

/** English label for the legacy "store" field: one chain, or the tied chains (max 3, then "+N"). */
export function storeLabel(result) {
  if (!result) return null;
  const n = result.ids.map(chainEn);
  return n.length <= 3 ? n.join(" / ") : n.slice(0, 3).join(" / ") + " +" + (n.length - 3);
}

export async function fetchBranches(productId) {
  const out = [];
  for (let page = 0; page < 10; page++) {
    let json;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(`${API}/retail/fetch-retail-branch-list?page=${page}&size=200&sort=ID,ASC&productId=${productId}&regionIds=&companyIds=`, { headers: HEADERS, signal: AbortSignal.timeout(30000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        json = await res.json();
        break;
      } catch (e) {
        if (attempt === 2) throw e;
        await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
      }
    }
    out.push(...(json.content || []));
    if (page + 1 >= (json.totalPages ?? 1)) break;
  }
  return out;
}

/**
 * Cheapest chain for a product, or null when it cannot be determined. `listPrice` is the
 * product list's startPrice: if the branch data disagrees with it by more than 5 cents the
 * answer is not trusted (the figures are from different moments), so no store is named.
 */
export async function findCheapestChain(productId, listPrice) {
  try {
    const branches = await fetchBranches(productId);
    const res = cheapestChains(branches);
    const priced = branches.some((x) => typeof x?.retailerProductPrice === "number" && x.retailerProductPrice > 0);
    // priced somewhere, but not at any retail chain at the listed price => the listed price is set by a
    // delivery-only service (Wolt Market): it must not count as "the lowest price"
    if (priced && (!res || (typeof listPrice === "number" && res.price > listPrice + 0.05))) return { notRetail: true, retailPrice: res?.price ?? null };
    if (!res) return null;
    if (typeof listPrice === "number" && Math.abs(res.price - listPrice) > 0.05) return null;
    return { store: storeLabel(res), storeIds: res.ids };
  } catch {
    return null;
  }
}
