# Manual fuel-price refresh

The government portal <https://petroleumprices.meci.gov.cy/> now puts a CAPTCHA
on **every** price query, so the old unattended scraper
(`scripts/update-fuel-prices.mjs`) can no longer work. Refreshing fuel prices is
now a manual, human-in-the-loop step.

## How to refresh

For each fuel type you want to update:

1. Open <https://petroleumprices.meci.gov.cy/>.
2. Pick the fuel type under **Είδος Καυσίμου**, leave **Επαρχία = Όλες**
   (all districts), solve the CAPTCHA and press **Αναζήτηση**.
3. Save the full results table to `scripts/fuel-scrape/<key>.json` in this shape:

   ```json
   {
     "fuel": "95",
     "count": 319,
     "stations": [
       { "brand": "ENI", "address": "Λεωφ. Σπ. Κυπριανού 60 Τ.Κ 3076",
         "district": "Λεμεσός", "price": 1.529, "tel": "25825858" }
     ]
   }
   ```

   `price` is a number in €/litre (the portal shows `1,529` → `1.529`).
   `address` must be the street line only (no `τηλ:` suffix) so it matches the
   stored coordinates.

   Keys: `95.json`, `98.json`, `diesel.json`, `heating.json`.

4. Run the loader:

   ```bash
   node scripts/load-fuel-from-scrape.mjs
   ```

   It backfills coordinates from the previous `fuel-prices.json` (by address),
   then regenerates `src/data/fuel-prices.json`, `src/data/fuel-price-history.json`
   and the three `posts/*/cheapest-petrol-stations-cyprus.md` files.
   A fuel type with no scrape file keeps its previous stations, so partial
   refreshes are safe.

5. Commit the changed data + posts (the `*.json` scrape files here are inputs and
   are git-ignored).

Kerosene (Κηροζίνη) is intentionally not handled — it was never part of the
posts or the interactive map's data model.
