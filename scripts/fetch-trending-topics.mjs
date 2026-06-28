/**
 * Fetches trending topics relevant to Cyprus from multiple RSS sources,
 * categorises them by deal type, and optionally generates post ideas via Claude API.
 *
 * Sources:
 *  - Google News RSS (Cyprus)
 *  - Cyprus Mail
 *  - Philenews
 *  - Sigmalive
 *
 * Writes to src/data/trending-topics.json
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "src", "data", "trending-topics.json");

// ── RSS sources ───────────────────────────────────────────────────────────────

const SOURCES = [
  {
    name: "Google News Cyprus",
    url: "https://news.google.com/rss/search?q=cyprus&hl=en-CY&gl=CY&ceid=CY:en",
    lang: "en",
  },
  {
    name: "Cyprus Mail",
    url: "https://www.cyprus-mail.com/feed/",
    lang: "en",
  },
  {
    name: "Philenews",
    url: "https://www.philenews.com/feed/",
    lang: "el",
  },
  {
    name: "Sigmalive",
    url: "https://www.sigmalive.com/rss/",
    lang: "el",
  },
  {
    name: "Google News Cyprus Economy",
    url: "https://news.google.com/rss/search?q=cyprus+prices+economy&hl=en-CY&gl=CY&ceid=CY:en",
    lang: "en",
  },
  {
    name: "Google News Cyprus Food",
    url: "https://news.google.com/rss/search?q=cyprus+food+restaurant+cafe&hl=en-CY&gl=CY&ceid=CY:en",
    lang: "en",
  },
];

// ── deal category keyword map ─────────────────────────────────────────────────

const CATEGORIES = {
  fuel: {
    label: "Fuel & Transport",
    keywords: ["petrol", "fuel", "diesel", "gas station", "pump price", "benzine", "βενζίνη", "καύσιμα", "filling station"],
  },
  food: {
    label: "Food & Drink",
    keywords: ["restaurant", "cafe", "coffee", "food", "supermarket", "grocery", "price", "taverna", "meze", "souvlaki", "burger", "pizza", "delivery", "takeaway", "καφέ", "φαγητό", "εστιατόριο", "τιμές"],
  },
  housing: {
    label: "Housing & Rent",
    keywords: ["rent", "property", "housing", "apartment", "real estate", "landlord", "lease", "ενοίκιο", "ακίνητο"],
  },
  utilities: {
    label: "Utilities & Bills",
    keywords: ["electricity", "eac", "water", "broadband", "internet", "mobile", "bill", "ηλεκτρισμός", "ΑΗΚ", "τηλέφωνο"],
  },
  shopping: {
    label: "Shopping & Retail",
    keywords: ["sale", "discount", "deal", "offer", "shopping", "mall", "clothing", "fashion", "online", "amazon", "έκπτωση", "προσφορά"],
  },
  entertainment: {
    label: "Entertainment & Leisure",
    keywords: ["cinema", "concert", "festival", "beach", "tourism", "hotel", "gym", "sport", "event", "κινηματογράφος", "φεστιβάλ", "τουρισμός"],
  },
  education: {
    label: "Education & Students",
    keywords: ["university", "student", "school", "tuition", "scholarship", "φοιτητής", "πανεπιστήμιο", "σχολείο"],
  },
  health: {
    label: "Health & Pharma",
    keywords: ["hospital", "health", "medicine", "pharmacy", "gesy", "doctor", "υγεία", "φαρμακείο", "ΓΕΣΥ"],
  },
  tech: {
    label: "Tech & Gadgets",
    keywords: ["iphone", "samsung", "laptop", "tech", "app", "smartphone", "gadget", "gaming"],
  },
  travel: {
    label: "Travel & Flights",
    keywords: ["flight", "airline", "airport", "larnaca", "paphos", "ryanair", "wizz", "easyjet", "travel", "πτήση", "αεροδρόμιο"],
  },
};

// ── post idea templates per category ─────────────────────────────────────────

const POST_TEMPLATES = {
  fuel: [
    "Cheapest Petrol Stations in {city} This Week",
    "Diesel vs Petrol Price Gap in Cyprus — Is It Worth Switching?",
    "How to Find the Cheapest Fuel Near You in Cyprus",
  ],
  food: [
    "Cheapest {foodType} in Nicosia — Price Comparison",
    "Best Value Lunch Spots Under €10 in {city}",
    "Cyprus Supermarket Price Battle — Who's Cheapest for {item}?",
    "Delivery App Price War: Wolt vs Bolt vs Foody in Cyprus",
  ],
  housing: [
    "Average Rent Prices in {city} — June 2026 Update",
    "Cheapest Neighbourhoods to Rent in Nicosia",
    "Cyprus Property Price Tracker — What's Changed?",
  ],
  utilities: [
    "Cheapest Internet Plans in Cyprus {year}",
    "How to Cut Your EAC Bill in Cyprus",
    "Best Value Mobile Plans in Cyprus — Price Comparison",
  ],
  shopping: [
    "Best Sales Happening in Cyprus This Week",
    "Cheapest Place to Buy {product} in Cyprus",
    "Black Friday Deals Available Now in Cyprus",
  ],
  entertainment: [
    "Cheapest Cinema Tickets in Cyprus — All Chains Compared",
    "Free Things to Do in {city} This Weekend",
    "Best Value Gym Memberships in Cyprus {year}",
  ],
  travel: [
    "Cheapest Flights from Larnaca This Month",
    "Best Value Hotels in Cyprus Under €80/night",
    "Cheapest Car Rental at Larnaca Airport — All Companies Compared",
  ],
  health: [
    "GESY vs Private — True Cost Comparison for Common Treatments",
    "Cheapest Private Health Insurance in Cyprus {year}",
  ],
  tech: [
    "Best Tech Deals in Cyprus This Week",
    "Cheapest Place to Buy {device} in Cyprus",
  ],
  education: [
    "Cheapest University in Cyprus — Full Tuition Comparison",
    "Student Discount Guide for Cyprus {year}",
  ],
};

// ── helpers ───────────────────────────────────────────────────────────────────

async function fetchRSS(source) {
  try {
    const res = await fetch(source.url, {
      headers: { "User-Agent": "deals-blog-trends/1.0 (https://deals-blog.pages.dev)" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];
    const text = await res.text();
    const items = [];

    // Extract <item> blocks
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = itemRegex.exec(text)) !== null) {
      const block = match[1];
      const title = extractTag(block, "title");
      const link = extractTag(block, "link");
      const pubDate = extractTag(block, "pubDate");
      const description = extractTag(block, "description");
      if (title && title.length > 5) {
        items.push({ title: decodeEntities(title), link, pubDate, description: decodeEntities(description || ""), source: source.name });
      }
    }
    return items.slice(0, 20);
  } catch (e) {
    console.warn(`Failed to fetch ${source.name}: ${e.message}`);
    return [];
  }
}

function extractTag(html, tag) {
  const m = html.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, "i"));
  return m ? m[1].trim() : null;
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, "–")
    .replace(/&#8230;/g, "…")
    .replace(/&[a-z]+;/g, " ");
}

function categoriseItem(item) {
  const text = (item.title + " " + item.description).toLowerCase();
  const matches = [];
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    const score = cat.keywords.filter((kw) => text.includes(kw.toLowerCase())).length;
    if (score > 0) matches.push({ key, label: cat.label, score });
  }
  return matches.sort((a, b) => b.score - a.score);
}

function buildPostIdeas(categoryKey, headline) {
  const templates = POST_TEMPLATES[categoryKey] || [];
  const year = new Date().getFullYear();
  const cities = ["Nicosia", "Limassol", "Larnaca", "Paphos"];
  return templates.slice(0, 2).map((t) =>
    t
      .replace("{year}", year)
      .replace("{city}", cities[Math.floor(Math.random() * cities.length)])
      .replace("{foodType}", guessFood(headline))
      .replace("{item}", guessItem(headline))
      .replace("{product}", guessProduct(headline))
      .replace("{device}", guessDevice(headline))
  );
}

function guessFood(text) {
  const t = text.toLowerCase();
  if (t.includes("coffee") || t.includes("cafe")) return "Coffee";
  if (t.includes("pizza")) return "Pizza";
  if (t.includes("burger")) return "Burger";
  if (t.includes("souvlaki")) return "Souvlaki";
  if (t.includes("meze")) return "Meze";
  return "Food";
}
function guessItem(text) {
  const t = text.toLowerCase();
  if (t.includes("milk")) return "Milk";
  if (t.includes("bread")) return "Bread";
  if (t.includes("halloumi")) return "Halloumi";
  if (t.includes("egg")) return "Eggs";
  return "Groceries";
}
function guessProduct(text) {
  const t = text.toLowerCase();
  if (t.includes("phone") || t.includes("iphone") || t.includes("samsung")) return "Smartphone";
  if (t.includes("laptop")) return "Laptop";
  if (t.includes("tv")) return "TV";
  return "Electronics";
}
function guessDevice(text) {
  const t = text.toLowerCase();
  if (t.includes("iphone")) return "iPhone";
  if (t.includes("samsung")) return "Samsung Galaxy";
  if (t.includes("macbook") || t.includes("laptop")) return "Laptop";
  return "Smartphone";
}

// ── optional Claude API suggestions ──────────────────────────────────────────

async function generateAiSuggestions(headlines, apiKey) {
  if (!apiKey) return null;
  try {
    const prompt = `You are an editor for a Cyprus consumer deals blog (deals-blog.pages.dev).
The blog covers: fuel prices, supermarket prices, cafe/coffee prices, utilities, rent, shopping deals, entertainment, travel.

Here are today's trending news headlines from Cyprus:
${headlines.slice(0, 20).map((h, i) => `${i + 1}. ${h}`).join("\n")}

Based on these trends, suggest 5 specific blog post ideas that would be highly relevant right now for Cyprus consumers looking to save money.
Format as JSON array: [{"title": "...", "category": "...", "why": "one sentence explaining the trend connection", "urgency": "high|medium|low"}]
Only output the JSON array, nothing else.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.content[0].text.trim();
    return JSON.parse(text);
  } catch (e) {
    console.warn("Claude API suggestion failed:", e.message);
    return null;
  }
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Fetching trending topics...");

  const allItems = [];
  for (const source of SOURCES) {
    const items = await fetchRSS(source);
    console.log(`  ${source.name}: ${items.length} items`);
    allItems.push(...items);
  }

  // Deduplicate by title similarity
  const seen = new Set();
  const unique = allItems.filter((item) => {
    const key = item.title.toLowerCase().slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Categorise each item
  const categorised = unique
    .map((item) => {
      const cats = categoriseItem(item);
      return { ...item, categories: cats };
    })
    .filter((item) => item.categories.length > 0);

  // Group by top category, collect post ideas
  const byCategory = {};
  for (const item of categorised) {
    const topCat = item.categories[0];
    if (!byCategory[topCat.key]) {
      byCategory[topCat.key] = {
        key: topCat.key,
        label: topCat.label,
        items: [],
        postIdeas: [],
      };
    }
    const group = byCategory[topCat.key];
    group.items.push({
      title: item.title,
      source: item.source,
      link: item.link,
      pubDate: item.pubDate,
    });
    const ideas = buildPostIdeas(topCat.key, item.title);
    ideas.forEach((idea) => {
      if (!group.postIdeas.includes(idea)) group.postIdeas.push(idea);
    });
  }

  // Sort categories by number of items (most trending first)
  const trends = Object.values(byCategory)
    .sort((a, b) => b.items.length - a.items.length)
    .map((cat) => ({
      ...cat,
      items: cat.items.slice(0, 8),
      postIdeas: [...new Set(cat.postIdeas)].slice(0, 4),
    }));

  // Optional AI suggestions
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const allHeadlines = categorised.map((i) => i.title);
  const aiSuggestions = await generateAiSuggestions(allHeadlines, apiKey);
  if (aiSuggestions) console.log(`  Claude generated ${aiSuggestions.length} AI suggestions`);

  const output = {
    updatedAt: new Date().toISOString(),
    totalHeadlines: unique.length,
    categorisedHeadlines: categorised.length,
    trends,
    aiSuggestions: aiSuggestions || [],
    sources: SOURCES.map((s) => s.name),
  };

  fs.writeFileSync(OUT, JSON.stringify(output, null, 2) + "\n");
  console.log(`Written to ${OUT}`);
  console.log(`Top trends: ${trends.slice(0, 3).map((t) => `${t.label} (${t.items.length})`).join(", ")}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
