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
// The cheapest chain is the argmin of those prices, grouped by chain.
const API = "https://www.e-kalathi.gov.cy/ekalathi-website-server/api";
const HEADERS = { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; DealsHubBot/1.0)" };

// e-kalathi's companyName (Greek/Latin, upper case) -> display name. Unlisted names fall
// back to a tidied version of the source name, so a new chain is shown, never dropped.
const DISPLAY = [
  [/^lidl/i, "LIDL"], [/^metro/i, "Metro"], [/αλφαμεγα|alphamega/i, "AlphaMega"],
  [/παπαντωνιου|papantoniou/i, "Papantoniou"], [/σκλαβενιτ|sklavenitis/i, "Sklavenitis"],
  [/κυριακο[υς]|kyriacos/i, "Kyriacos"], [/alpha\s*sigma/i, "Alpha Sigma"], [/lysiotis|λυσιωτ/i, "Lysiotis"],
  [/plus\s*discount/i, "Plus Discount"], [/αθηαινιτ|αθηναιτ|athinaitis|athienitis/i, "Athinaitis"],
  [/κοκκινος|kokkinos/i, "Kokkinos"], [/philippos|φιλιππος/i, "Philippos"], [/^mas\b/i, "MAS"],
  [/poplife/i, "Poplife"], [/super\s*discount/i, "Super Discount Store"], [/smart\s*discount/i, "Smart Discount Shop"],
  [/wolt/i, "Wolt Market"], [/συπαλ|sypal/i, "SYPAL"],
];
export function displayChain(companyName) {
  const raw = String(companyName ?? "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  for (const [re, name] of DISPLAY) if (re.test(raw)) return name;
  return raw.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

/**
 * Pure: the chain(s) with the lowest branch price. `branches` = [{ companyName, retailerProductPrice }].
 * Missing / non-positive / non-numeric prices are ignored (never treated as 0). Returns
 * { price, chains: [display names, cheapest tie first alphabetical] } or null.
 */
export function cheapestChains(branches) {
  let min = Infinity;
  for (const b of branches || []) {
    const p = b?.retailerProductPrice;
    if (typeof p === "number" && Number.isFinite(p) && p > 0 && p < min) min = p;
  }
  if (!Number.isFinite(min)) return null;
  const chains = new Set();
  for (const b of branches) {
    const p = b?.retailerProductPrice;
    if (typeof p === "number" && Math.abs(p - min) < 0.005) chains.add(displayChain(b.companyName));
  }
  return { price: min, chains: [...chains].sort() };
}

/** Label for the page: one chain, or the tied chains (max 3, then "+N"). */
export function storeLabel(result) {
  if (!result) return null;
  const c = result.chains;
  return c.length <= 3 ? c.join(" / ") : `${c.slice(0, 3).join(" / ")} +${c.length - 3}`;
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
    const res = cheapestChains(await fetchBranches(productId));
    if (!res) return null;
    if (typeof listPrice === "number" && Math.abs(res.price - listPrice) > 0.05) return null;
    return storeLabel(res);
  } catch {
    return null;
  }
}
