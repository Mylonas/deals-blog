// Works out *where* a job is. Nothing in the scraped data says so — no site
// publishes a location field — so it is inferred, most specific source first:
//
//   1. the job title, which names the town far more often than you would
//      expect. ΟΚΥπΥ listings spell out every district a post covers
//      («… Λεμεσός, Λευκωσία, Πάφος — Γενικό Νοσοκομείο Πάφου, Νοσοκομείο
//      Τροόδους …»), and municipalities write «στον Δήμο Στροβόλου»;
//   2. the employer's own name — «Δήμος Αθηένου», «ΕΟΑ Λάρνακας» — which
//      places all 20 municipalities and the five district organisations on
//      their actual town rather than the district capital;
//   3. otherwise `district` from sources.json, pinned at the district seat.
//
// `pancyprus` employers (ΕΔΥ, Cyta, ΑΗΚ…) get no pin unless their title names
// a town: a competition for a ministry post is not a Nicosia job, and putting
// forty of them on one pin would say something false about where the work is.
//
// A title may name several towns — one ΟΚΥπΥ notice routinely covers four
// hospitals — so a job carries a *list* of locations, not one.
//
// Ported from the retired cyprus-public-jobs repo (2026-08-07), whose remote no
// longer exists; the original lives on in
// Documents\repo-archive\cyprus-public-jobs-2026-08-07.bundle.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fold } from './util.mjs';

const JOBS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

const config = JSON.parse(readFileSync(join(JOBS_DIR, 'locations.json'), 'utf8'));

export const MAP = config.map;
export const DISTRICTS = config.districts;

/** sources.json marks the island-wide bodies with this instead of a district. */
export const PANCYPRUS = 'pancyprus';

const DISTRICT_NAME = new Map(config.districts.map((d) => [d.id, d.name]));

/**
 * Aliases and the text being searched both go through this, so aliases stay
 * readable in their natural accented form in the JSON. This repo's fold()
 * already unifies final sigma — «Λεμεσός» and «ΛΕΜΕΣΟΣ» compare equal without
 * further help — so unlike the original there is no extra ς→σ pass here.
 */
const norm = (value) => fold(value ?? '');

const escapeRe = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A town name only counts as a whole word: «Κίτι» must not fire inside
// «κίτρινο». Greek notices run names straight into punctuation, so the boundary
// is "not a letter or digit" rather than \b, which is ASCII-only and would
// treat every Greek letter as a boundary.
const pattern = (aliases) =>
  new RegExp(`(?<![\\p{L}\\p{N}])(?:${aliases.map((a) => escapeRe(norm(a))).join('|')})(?![\\p{L}\\p{N}])`, 'u');

const PLACES = config.places.map((place) => ({
  name: place.name,
  district: place.district,
  districtName: DISTRICT_NAME.get(place.district) ?? place.district,
  lat: place.lat,
  lon: place.lon,
  seat: place.seat === true,
  re: pattern(place.aliases),
}));

const SEATS = new Map(PLACES.filter((p) => p.seat).map((p) => [p.district, p]));

const pin = ({ name, district, districtName, lat, lon }) => ({ name, district, districtName, lat, lon });

/** Every place named in a piece of text, in the order the places are configured. */
export function placesIn(value) {
  const text = norm(value);
  return PLACES.filter((place) => place.re.test(text));
}

/**
 * An employer name usually names one town, but «Δήμος Δυτικής Λεμεσού
 * (Κουρίου)» names two — the district capital it is named after, and the town
 * it actually sits in. The specific one is the useful one, so the capital is
 * dropped whenever something more precise matched alongside it. (Titles get no
 * such treatment: a title listing «Λεμεσός, Λευκωσία, Πάφος» means all three.)
 */
function placesInEmployer(name) {
  const found = placesIn(name);
  const specific = found.filter((p) => !p.seat);
  return specific.length > 0 ? specific : found;
}

/**
 * Locations for one job. `from` records how they were arrived at, because the
 * four are not equally trustworthy and the page says so: 'title' is what the
 * notice itself states, 'employer' and 'district' are only where that
 * organisation is based, and 'pancyprus' means the post is not tied to a town
 * at all.
 */
export function resolveLocations(job, source) {
  const inTitle = placesIn(job.title);
  if (inTitle.length > 0) return { locations: inTitle.map(pin), locationFrom: 'title' };

  const inEmployer = placesInEmployer(job.employer ?? source?.name ?? '');
  if (inEmployer.length > 0) return { locations: inEmployer.map(pin), locationFrom: 'employer' };

  const district = source?.district;
  if (!district || district === PANCYPRUS) return { locations: [], locationFrom: PANCYPRUS };

  const seat = SEATS.get(district);
  if (!seat) throw new Error(`unknown district "${district}" — add it to scripts/jobs/locations.json`);
  return { locations: [pin(seat)], locationFrom: 'district' };
}

/** The districts a job touches, deduped — what the district filter runs on. */
export const districtsOf = (job) => [...new Set((job.locations ?? []).map((l) => l.district))];
