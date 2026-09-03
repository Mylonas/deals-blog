"use client";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, Marker } from "leaflet";

import type { Job, JobLocation } from "./JobsTable";

type Lang = "en" | "el" | "ru";

// Same three basemaps as PriceMap, so the two maps on this site look like one
// product. Street is the default; the dark tiles exist because inverting light
// tiles in CSS turns the sea a muddy brown.
const BASE_LAYERS = {
  street: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  light: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  dark: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
} as const;

const T: Record<Lang, Record<string, string>> = {
  en: {
    aria: "Map of open positions by town",
    hint: "Dot size is the number of openings. Click a dot to filter the table.",
    street: "Street", light: "Light", dark: "Dark",
    islandWide: "Island-wide", clear: "Clear area", area: "Area",
    openings: "openings", opening: "opening", until: "until",
    fromTitle: "stated in the notice",
    fromEmployer: "where the employer is based",
    fromDistrict: "district seat — the notice does not name a town",
  },
  el: {
    aria: "Χάρτης κενών θέσεων ανά περιοχή",
    hint: "Το μέγεθος της κουκκίδας δείχνει τον αριθμό θέσεων. Κάντε κλικ για φιλτράρισμα.",
    street: "Κανονικός", light: "Ανοιχτός", dark: "Σκούρος",
    islandWide: "Παγκύπριες", clear: "Καθαρισμός περιοχής", area: "Περιοχή",
    openings: "θέσεις", opening: "θέση", until: "έως",
    fromTitle: "όπως αναφέρεται στην προκήρυξη",
    fromEmployer: "έδρα του εργοδότη",
    fromDistrict: "πρωτεύουσα επαρχίας — η προκήρυξη δεν ονομάζει πόλη",
  },
  ru: {
    aria: "Карта вакансий по городам",
    hint: "Размер точки — число вакансий. Нажмите, чтобы отфильтровать таблицу.",
    street: "Улицы", light: "Светлая", dark: "Тёмная",
    islandWide: "По всему острову", clear: "Сбросить район", area: "Район",
    openings: "вакансий", opening: "вакансия", until: "до",
    fromTitle: "указано в объявлении",
    fromEmployer: "адрес работодателя",
    fromDistrict: "центр района — город в объявлении не указан",
  },
};

/** Island-wide postings are a chip, not a pin — see the note in JobsTable. */
export const PANCYPRUS_PLACE = "__pancyprus__";

const escape = (value: string) =>
  String(value ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

type Pin = JobLocation & { jobs: Job[] };

/** One entry per town with at least one opening, largest first. */
function pinsOf(jobs: Job[]): Pin[] {
  const byPlace = new Map<string, Pin>();
  for (const job of jobs) {
    for (const location of job.locations ?? []) {
      let pin = byPlace.get(location.name);
      if (!pin) byPlace.set(location.name, (pin = { ...location, jobs: [] }));
      pin.jobs.push(job);
    }
  }
  return [...byPlace.values()].sort((a, b) => b.jobs.length - a.jobs.length);
}

export default function JobsMap({
  jobs,
  place,
  onSelect,
  lang,
}: {
  /** Every job, unfiltered — the pins are the overview, so they must not shrink
   *  as the table filters, or clicking a pin would erase the rest of the map. */
  jobs: Job[];
  place: string | null;
  onSelect: (place: string | null) => void;
  lang: Lang;
}) {
  const t = T[lang];
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<{ name: string; marker: Marker }[]>([]);
  // onSelect changes identity every render; a ref keeps the click handlers
  // stable so the map is never torn down and rebuilt mid-interaction.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const unplaced = jobs.filter((j) => (j.locations ?? []).length === 0).length;

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const pins = pinsOf(jobs);
      const layers = {
        [t.street]: L.tileLayer(BASE_LAYERS.street.url, { maxZoom: 18, attribution: BASE_LAYERS.street.attribution }),
        [t.light]: L.tileLayer(BASE_LAYERS.light.url, { maxZoom: 18, attribution: BASE_LAYERS.light.attribution }),
        [t.dark]: L.tileLayer(BASE_LAYERS.dark.url, { maxZoom: 18, attribution: BASE_LAYERS.dark.attribution }),
      };

      const map = L.map(containerRef.current, { scrollWheelZoom: false, layers: [layers[t.street]] });
      mapRef.current = map;
      L.control.layers(layers, undefined, { position: "topright" }).addTo(map);
      map.setView([34.92, 33.2], 9);

      markersRef.current = pins.map((pin) => {
        // Log scale, not linear or area: Λευκωσία has fifty-odd openings and its
        // suburbs one or two, and anything steeper turns the capital into a blob
        // covering Στρόβολος, Έγκωμη and Αγλαντζιά at every useful zoom.
        const size = Math.round(Math.min(20 + Math.log2(pin.jobs.length + 1) * 7, 60));
        const marker = L.marker([pin.lat, pin.lon], {
          icon: L.divIcon({
            // Inline styles like PriceMap's pills — the pin has to render inside
            // Leaflet's own markup regardless of the page's CSS. Only the class
            // is left for globals.css, which owns the two things inline styles
            // cannot express: the dim state and the phone scale.
            className: "",
            html:
              `<div class="jobs-pin" style="` +
              `width:${size}px;height:${size}px;display:grid;place-items:center;border-radius:50%;` +
              `background:#2563eb;color:#fff;font:600 12px/1 system-ui,sans-serif;` +
              `box-shadow:0 0 0 2px #ffffff88,0 1px 4px #00000066;cursor:pointer;` +
              `">${pin.jobs.length}</div>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          }),
          title: `${pin.name} — ${pin.jobs.length}`,
          riseOnHover: true,
          // Smallest on top, so a one-job town stays clickable beside a big one.
          zIndexOffset: -pin.jobs.length,
        });

        const sub = "color:#6b7280;font-size:.8rem;display:block;";
        const items = pin.jobs
          .slice(0, 40)
          .map((job) => {
            const title = job.title.length > 110 ? `${job.title.slice(0, 108).trimEnd()}…` : job.title;
            const when = job.deadline ? ` · ${t.until} ${job.deadline}` : "";
            return (
              `<li style="margin-bottom:.3rem"><a href="${escape(job.url)}" target="_blank" rel="noopener noreferrer">${escape(title)}</a>` +
              `<span style="${sub}">${escape(job.employer)}${escape(when)}</span></li>`
            );
          })
          .join("");
        // «Λευκωσία (Λευκωσία)» — district seats are named after their district.
        const where = pin.name === pin.districtName ? pin.name : `${pin.name} (${pin.districtName})`;
        const more = pin.jobs.length > 40 ? `<p style="${sub}">+${pin.jobs.length - 40}</p>` : "";
        // Λευκωσία lists fifty-odd posts; the inner scroller keeps the popup from
        // covering the whole map on a phone.
        marker.bindPopup(
          `<h3 style="margin:0 0 .35rem;font-size:.95rem">${escape(where)} — ${pin.jobs.length}</h3>` +
            `<div style="max-height:190px;overflow-y:auto"><ol style="margin:0;padding-left:1.1rem">${items}</ol>${more}</div>`,
          { maxWidth: 300, autoPanPadding: [12, 12] },
        );
        marker.on("click", () => onSelectRef.current(pin.name));
        marker.addTo(map);
        return { name: pin.name, marker };
      });

      map.on("click", () => onSelectRef.current(null));

      // The island has to fit whatever width the map ends up at — a view fitted
      // at 1100px cuts Πάφος and Αμμόχωστος off the ends at 375px. Refit on
      // resize, but stop the moment the reader pans or zooms: after that the
      // view is theirs, not ours.
      const bounds = pins.length > 0 ? L.latLngBounds(pins.map((p) => [p.lat, p.lon] as [number, number])) : null;
      let theirs = false;
      map.getContainer().addEventListener("pointerdown", () => { theirs = true; }, { once: true });
      const fit = () => {
        // Leaflet measures the container once, at construction, which can
        // predate the final layout and leave the map as two tiles on a blank
        // field.
        map.invalidateSize();
        if (bounds && !theirs) {
          const pad = map.getSize().x < 500 ? 18 : 40;
          map.fitBounds(bounds, { padding: [pad, pad], maxZoom: 11 });
        }
      };
      requestAnimationFrame(fit);
      let resizing: ReturnType<typeof setTimeout>;
      const onResize = () => { clearTimeout(resizing); resizing = setTimeout(fit, 150); };
      window.addEventListener("resize", onResize);

      cleanup = () => {
        window.removeEventListener("resize", onResize);
        clearTimeout(resizing);
      };
    })();

    return () => {
      cancelled = true;
      cleanup();
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [jobs, t.street, t.light, t.dark, t.until]);

  // Dim every pin that is not the selected one. Done as an effect rather than in
  // the click handler so the map also follows the district dropdown and Clear.
  useEffect(() => {
    for (const { name, marker } of markersRef.current) {
      const el = marker.getElement()?.firstElementChild;
      el?.classList.toggle("dim", place !== null && name !== place);
    }
  }, [place]);

  return (
    <div className="mb-5">
      <div
        ref={containerRef}
        role="application"
        aria-label={t.aria}
        className="h-[280px] sm:h-[400px] w-full rounded-xl border border-gray-200 dark:border-gray-700 z-0 bg-[#e8edf2] dark:bg-gray-900"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span>{t.hint}</span>
        {unplaced > 0 && (
          <button
            type="button"
            onClick={() => onSelect(place === PANCYPRUS_PLACE ? null : PANCYPRUS_PLACE)}
            className={`rounded-full border px-2.5 py-0.5 dark:border-gray-700 ${
              place === PANCYPRUS_PLACE ? "bg-blue-600 text-white border-blue-600" : "hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            {t.islandWide}: {unplaced}
          </button>
        )}
        {place !== null && (
          <>
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {place === PANCYPRUS_PLACE ? t.islandWide : `${t.area}: ${place}`}
            </span>
            <button type="button" onClick={() => onSelect(null)} className="text-blue-600 dark:text-blue-400 hover:underline">
              {t.clear}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
