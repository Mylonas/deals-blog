// Shared Foody helpers for the coffee and souvlaki scans.
//
// Foody's JSON-LD menu carries only the price the customer would pay today
// (Foody runs blanket -15% / -20% promotions, so that is the DISCOUNTED price) and no
// availability. The rendered page shows more: the struck-through list price and a
// "-N%" badge on each card, and items that are not orderable are tucked into a
// collapsed "N not available products" group instead of being rendered as cards.
// So we read the cards back out of the DOM:
//   - a menu item with no visible card => not available (never ranked)
//   - a card showing two euro amounts   => list price = the larger one, promo = the smaller
//   - a card with only "-N%" and one price => list = price / (1 - N%)

/** Mutates `items` ({name, price}) with `available`, `list` and `promo` (promo = discounted price). */
export async function enrichFoodyItems(page, items) {
  if (!items.length) return items;
  const info = await page.evaluate((list) => {
    const euro = /(\d+[.,]\d{2})\s*€/g;
    const cards = [];
    for (const e of document.querySelectorAll("div,li,a,article")) {
      const t = e.innerText || "";
      if (t.length > 0 && t.length < 600) cards.push(t);
    }
    return list.map((it) => {
      let best = null;
      for (const t of cards) {
        if (!t.includes(it.name)) continue;
        const prices = [...t.matchAll(euro)].map((m) => parseFloat(m[1].replace(",", ".")));
        if (!prices.some((p) => Math.abs(p - it.price) < 0.005)) continue;
        if (!best || t.length < best.t.length) best = { t, prices };
      }
      if (!best) return { found: false };
      const pct = (best.t.match(/-\s*(\d+)\s*%/) || [])[1];
      return { found: true, max: Math.max(...best.prices), pct: pct ? Number(pct) : null };
    });
  }, items.map((i) => ({ name: i.name, price: i.price })));

  items.forEach((it, i) => {
    const r = info[i];
    it.available = r.found;
    if (!r.found) return;
    let list = null;
    if (r.max > it.price + 0.005) list = r.max;
    else if (r.pct && r.pct > 0 && r.pct < 90) list = Math.round((it.price / (1 - r.pct / 100)) * 20) / 20; // nearest 5 cents
    if (list != null) {
      it.promo = it.price;
      it.price = list;
    }
  });
  return items;
}

/**
 * Does the "From" price (the smallest option) of this item resolve to a SMALL size? True when the
 * description names a half / small / mini size, or offers a one-skewer size ("Choice of 1 skewer,
 * 2 skewers or 3 skewers", "1 skewer"). `mixCut` items legitimately contain one skewer + sheftalia.
 */
export const isHalfFrom = (description, mixCut = false) => {
  const d = String(description || "");
  if (/\b(half|small|mini)\b|μισ[ήη]|μιση|μικρ[ήηοό]/i.test(d)) return true;
  if (!mixCut && /(?:^|[^\d.,])(?:1|one)\s+(?:souvlaki\s+)?(?:skewer|souvlaki|σουβλακ|ξυλακ)/i.test(d) && !/sheft|σιεφταλ/i.test(d)) return true;
  return false;
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Open right now (Cyprus time) from JSON-LD openingHoursSpecification; null if unknown. */
export function foodyOpenNow(restaurant, now = new Date()) {
  const spec = restaurant?.openingHoursSpecification;
  if (!Array.isArray(spec) || !spec.length) return null;
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Nicosia", weekday: "long", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const day = get("weekday");
  const mins = Number(get("hour")) * 60 + Number(get("minute"));
  const toMin = (s) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(s ?? "").trim());
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };
  const todays = spec.filter((x) => (x.DayOfWeek?.name ?? x.dayOfWeek) === day);
  if (!todays.length) return null;
  let known = false;
  for (const x of todays) {
    const o = toMin(x.opens);
    const c = toMin(x.closes);
    if (o == null || c == null) continue; // e.g. "Κλειστό κατάστημα" (closed all day)
    known = true;
    if (c > o ? mins >= o && mins < c : mins >= o || mins < c) return true; // closes after midnight => overnight
  }
  // yesterday's overnight shift can still be running after midnight
  const yIdx = (DAYS.indexOf(day) + 6) % 7;
  for (const x of spec.filter((s) => (s.DayOfWeek?.name ?? s.dayOfWeek) === DAYS[yIdx])) {
    const o = toMin(x.opens);
    const c = toMin(x.closes);
    if (o != null && c != null && c < o && mins < c) return true;
  }
  return known || todays.every((x) => toMin(x.opens) == null) ? false : null;
}

/** Compact weekly opening hours, e.g. { Monday: "08:00-18:00", Tuesday: "closed", ... }. null if absent. */
export function compactHours(restaurant) {
  const spec = restaurant?.openingHoursSpecification;
  if (!Array.isArray(spec) || !spec.length) return null;
  const out = {};
  for (const x of spec) {
    const day = x.DayOfWeek?.name ?? x.dayOfWeek;
    if (!day) continue;
    const valid = /^\d{1,2}:\d{2}$/.test(String(x.opens ?? "")) && /^\d{1,2}:\d{2}$/.test(String(x.closes ?? ""));
    const slot = valid ? `${x.opens}-${x.closes}` : "closed";
    out[day] = out[day] && out[day] !== "closed" ? (slot === "closed" ? out[day] : `${out[day]},${slot}`) : slot;
  }
  return out;
}

/** Open right now (Cyprus time) from compactHours(); null if unknown. Used at merge time so the flag is fresh. */
export function openFromCompact(hours, now = new Date()) {
  if (!hours) return null;
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Nicosia", weekday: "long", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const day = get("weekday");
  const mins = Number(get("hour")) * 60 + Number(get("minute"));
  const toMin = (s) => { const m = /^(\d{1,2}):(\d{2})$/.exec(s); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
  const slots = (d) => String(hours[d] ?? "").split(",").filter((x) => x && x !== "closed").map((x) => x.split("-").map(toMin));
  const today = slots(day);
  if (hours[day] == null) return null;
  for (const [o, c] of today) if (o != null && c != null && (c > o ? mins >= o && mins < c : mins >= o || mins < c)) return true;
  const yIdx = (DAYS.indexOf(day) + 6) % 7;
  for (const [o, c] of slots(DAYS[yIdx])) if (o != null && c != null && c < o && mins < c) return true; // overnight shift from yesterday
  return false;
}
