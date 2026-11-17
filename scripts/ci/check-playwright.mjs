// Exit 0 when Playwright's Chromium can actually launch headless, 1 otherwise (so local-daily.ps1
// can install the browser build the installed Playwright version expects before the Foody scans).
import fs from "node:fs";
import { chromium } from "playwright";

try {
  const exe = chromium.executablePath();
  if (!fs.existsSync(exe)) throw new Error("missing: " + exe);
  const browser = await chromium.launch({ headless: true });
  await browser.close();
  console.log("playwright chromium ok: " + exe);
} catch (e) {
  console.log("playwright chromium NOT usable: " + String(e.message).split("\n")[0]);
  process.exit(1);
}
