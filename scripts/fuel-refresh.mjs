/**
 * One-command manual fuel refresh:   npm run fuel:refresh
 *
 * The government portal puts a CAPTCHA on every query, so a human must solve it - nothing here
 * tries to get past it. Everything else is automated:
 *   for each of the 4 fuels: opens the portal, puts a capture snippet on the clipboard, waits while you
 *   (1) pick the fuel + "Ολες", solve the CAPTCHA, search, (2) paste the snippet in the browser console
 *   (F12 -> Console -> Ctrl+V -> Enter; it copies the results back to the clipboard), (3) press Enter here.
 * Then it validates the capture, rebuilds the data/posts, validates the output, and (unless --no-publish)
 * commits on a branch, merges to master/dev, pushes and triggers the deploy.
 *
 *   --no-publish   stop after rebuilding + validating (nothing committed)
 *   --from-files   use the existing scripts/fuel-scrape/*.json instead of the clipboard (testing)
 *   --only=95,98   refresh only these fuels (the rest keep their previous stations)
 */
import fs from "fs";
import path from "path";
import readline from "readline";
import { execFileSync, spawnSync } from "child_process";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRAPE = path.join(ROOT, "scripts", "fuel-scrape");
const PORTAL = "https://petroleumprices.meci.gov.cy/";
const args = process.argv.slice(2);
const NO_PUBLISH = args.includes("--no-publish");
const FROM_FILES = args.includes("--from-files");
const only = (args.find((a) => a.startsWith("--only=")) || "").slice(7).split(",").filter(Boolean);
const FUELS = [
  { key: "95", label: "Αμόλυβδη 95 (Unleaded 95)" },
  { key: "98", label: "Αμόλυβδη 98 (Unleaded 98)" },
  { key: "diesel", label: "Πετρέλαιο Κίνησης (Diesel)" },
  { key: "heating", label: "Πετρέλαιο Θέρμανσης (Heating oil)" },
].filter((f) => !only.length || only.includes(f.key));

// Runs in the portal's results-page console. Skips offline (stale) stations; copy() is a DevTools utility.
export const snippet = (key) =>
  String.raw`copy(JSON.stringify({fuel:"${key}",stations:[...document.querySelectorAll('table#stations tbody tr')].map(tr=>{if(tr.classList.contains('is-offline'))return null;const brand=tr.querySelector('[data-col=company]')?.innerText.trim();const ac=tr.querySelector('[data-col=address]');const address=(ac?.getAttribute('data-sort')||'').split('\n')[0].trim();const href=ac?.querySelector('a')?.getAttribute('href')||'';const cm=href.match(/coordinates=([-0-9.]+)\s*(?:%2C|,)\s*%?2?0?\s*([-0-9.]+)/i);const district=tr.querySelector('[data-col=district]')?.innerText.trim();const price=parseFloat(tr.querySelector('[data-col=price]')?.getAttribute('data-sort'));return{brand,address,district,price,lat:cm?+cm[1]:null,lng:cm?+cm[2]:null}}).filter(r=>r&&r.brand&&!isNaN(r.price))}));'captured '+document.querySelectorAll('table#stations tbody tr:not(.is-offline)').length`;

const readClip = () => {
  if (process.platform === "win32") return execFileSync("powershell", ["-NoProfile", "-Command", "Get-Clipboard -Raw"], { encoding: "utf8", maxBuffer: 64e6 });
  if (process.platform === "darwin") return execFileSync("pbpaste", { encoding: "utf8", maxBuffer: 64e6 });
  return execFileSync("xclip", ["-selection", "clipboard", "-o"], { encoding: "utf8", maxBuffer: 64e6 });
};
const writeClip = (text) => {
  if (process.platform === "win32") spawnSync("clip", { input: text, encoding: "utf8" });
  else if (process.platform === "darwin") spawnSync("pbcopy", { input: text });
  else spawnSync("xclip", ["-selection", "clipboard"], { input: text });
};
const openUrl = (url) => (process.platform === "win32" ? spawnSync("cmd", ["/c", "start", "", url]) : spawnSync(process.platform === "darwin" ? "open" : "xdg-open", [url]));

/** Pure: is this capture believable? Returns an error string or null. */
export function validateCapture(key, obj) {
  if (!obj || obj.fuel !== key) return `wrong fuel in capture (${obj?.fuel}) - expected ${key}`;
  const st = obj.stations;
  if (!Array.isArray(st) || st.length < 50) return `only ${st?.length ?? 0} stations captured (expected 50+) - did the search finish for all districts (Ολες)?`;
  const bad = st.filter((s) => !(s.price >= 0.8 && s.price <= 3.5) || !s.address);
  if (bad.length > st.length * 0.05) return `${bad.length} stations have an implausible price or no address`;
  return null;
}

async function capture() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((r) => rl.question(q, r));
  fs.mkdirSync(SCRAPE, { recursive: true });
  for (const f of FUELS) {
    if (FROM_FILES) { console.log(`${f.key}: using existing ${f.key}.json`); continue; }
    for (;;) {
      writeClip(snippet(f.key));
      openUrl(PORTAL);
      console.log(`\n=== ${f.label} ===\n 1. In the portal pick this fuel, district = Ολες, solve the CAPTCHA, press Αναζήτηση.\n 2. Press F12 -> Console -> Ctrl+V -> Enter (it prints "captured N").\n 3. Come back here.`);
      await ask(" Press Enter once the console printed 'captured N'... ");
      let obj = null;
      try { obj = JSON.parse(readClip().trim()); } catch { /* reported below */ }
      const err = validateCapture(f.key, obj);
      if (err) { console.log(` x ${err}\n   Try this fuel again.`); continue; }
      fs.writeFileSync(path.join(SCRAPE, `${f.key}.json`), JSON.stringify(obj, null, 1));
      console.log(` ok ${obj.stations.length} stations, cheapest ${Math.min(...obj.stations.map((s) => s.price)).toFixed(3)}`);
      break;
    }
  }
  rl.close();
}

const git = (...a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8" }).trim();

function validateOutput() {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/fuel-prices.json"), "utf8"));
  const age = Date.now() - new Date(d.updatedAt).getTime();
  if (!(age < 10 * 60 * 1000)) throw new Error(`fuel-prices.json updatedAt is not fresh (${d.updatedAt})`);
  for (const k of ["95", "98", "diesel", "heating"]) {
    const n = d.fuels?.[k]?.stations?.length ?? 0;
    if (n < 50) throw new Error(`${k}: only ${n} stations in the output`);
  }
  console.log(`Output valid: updatedAt ${d.updatedAt}; Unleaded 95 cheapest ${Math.min(...d.fuels["95"].stations.map((s) => s.price)).toFixed(3)}`);
}

function publish() {
  const day = new Date().toISOString().slice(0, 10);
  const dirty = git("status", "--porcelain").split("\n").filter((l) => l && !/fuel|cheapest-petrol/.test(l));
  if (dirty.length) throw new Error("working tree has unrelated changes - commit or stash them first:\n" + dirty.join("\n"));
  const branch = `data/fuel-${day}`;
  git("checkout", "-B", branch);
  git("add", "src/data/fuel-prices.json", "src/data/fuel-price-history.json", "posts/en/cheapest-petrol-stations-cyprus.md", "posts/el/cheapest-petrol-stations-cyprus.md", "posts/ru/cheapest-petrol-stations-cyprus.md");
  git("commit", "-m", `feat: fuel price update ${day}\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`);
  git("checkout", "master");
  git("pull", "--rebase", "origin", "master");
  git("merge", "--no-ff", branch, "-m", `Merge ${branch}`);
  git("push", "origin", "master");
  git("push", "-f", "origin", "master:dev");
  git("branch", "-d", branch);
  console.log("Published to master; the site redeploys in about a minute.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  (async () => {
    await capture();
    const r = spawnSync("node", ["scripts/load-fuel-from-scrape.mjs"], { cwd: ROOT, stdio: "inherit", env: { ...process.env, FORCE_HISTORY: process.env.FORCE_HISTORY ?? "1" } });
    if (r.status !== 0) throw new Error("loader failed");
    validateOutput();
    if (NO_PUBLISH) console.log("--no-publish: nothing committed. Review `git diff --stat`, then commit as usual.");
    else publish();
  })().catch((e) => { console.error("\nFUEL REFRESH FAILED:", e.message); process.exit(1); });
}
