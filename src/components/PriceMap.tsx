"use client";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import type { Map as LeafletMap, LayerGroup, Control } from "leaflet";

type Provider = "wolt" | "bolt" | "foody";

export type MapVenue = {
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  url: string;
  price: number;
  distance: number | null;
  // multi-platform venues (souvlaki): show a badge per platform in the popup.
  // Absent for single-source maps (coffee, fuel) — they keep the plain link.
  platforms?: Provider[];
  boltUrl?: string;
  foodyUrl?: string;
};

type Lang = "en" | "el" | "ru";

// popup provider badges — inline styles because the label/colours must survive
// inside Leaflet's popup HTML regardless of the page's CSS
const PROVIDER_LABEL: Record<Provider, string> = { wolt: "Wolt", bolt: "Bolt", foody: "Foody" };
const PROVIDER_STYLE: Record<Provider, string> = {
  wolt: "background:#cffafe;color:#0e7490;",
  bolt: "background:#dcfce7;color:#15803d;",
  foody: "background:#ffe4e6;color:#be123c;",
};
const PROVIDER_ORDER: Provider[] = ["wolt", "bolt", "foody"];

// primary platform's link is in `url`; each extra platform's is in `<p>Url`
function platformUrl(v: MapVenue, p: Provider): string | undefined {
  const primary = v.platforms?.[0] ?? "wolt";
  if (p === primary) return v.url;
  const u = (v as Record<string, unknown>)[`${p}Url`];
  return typeof u === "string" ? u : undefined;
}

function orderHtml(v: MapVenue, linkLabel: string): string {
  // single-source maps: keep the original one-link behaviour
  if (!v.platforms?.length) {
    return `<a href="${v.url}" target="_blank" rel="noopener noreferrer"
              style="display:inline-block;margin-top:6px;color:#2563eb;font-size:12px;">${linkLabel}</a>`;
  }
  const badges = PROVIDER_ORDER.filter((p) => v.platforms!.includes(p))
    .map((p) => {
      const href = platformUrl(v, p);
      const style = `display:inline-block;margin:6px 6px 0 0;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;text-decoration:none;${PROVIDER_STYLE[p]}`;
      return href
        ? `<a href="${href}" target="_blank" rel="noopener noreferrer" style="${style}">${PROVIDER_LABEL[p]}</a>`
        : `<span style="${style}">${PROVIDER_LABEL[p]}</span>`;
    })
    .join("");
  return `<div style="margin-top:2px;font-size:11px;color:#6b7280;">${linkLabel}</div>${badges}`;
}

const T = {
  en: { away: "km away", street: "Street", light: "Light", dark: "Dark", from: "from", unmapped: "No location on the map yet:" },
  el: { away: "χλμ μακριά", street: "Κανονικός", light: "Ανοιχτός", dark: "Σκούρος", from: "από", unmapped: "Χωρίς τοποθεσία στον χάρτη ακόμα:" },
  ru: { away: "км от вас", street: "Улицы", light: "Светлая", dark: "Тёмная", from: "от", unmapped: "Пока без точки на карте:" },
};

// Cyprus, wide view — used when no user location and no venues to fit
const DEFAULT_CENTER: [number, number] = [35.0, 33.2];
const DEFAULT_ZOOM = 9;

const BASE_LAYERS = {
  street: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  light: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
};

/**
 * Leaflet map of priced venues (souvlaki places, cafés, petrol stations…).
 * Markers are price pills (cheapest = green) grouped into clusters at low
 * zoom — a cluster bubble shows the venue count and the cheapest price
 * inside it, so the map stays readable with hundreds of venues. A layers
 * control (top right) switches the base map between Street, Light and Dark
 * tiles — Light/Dark make the price pills stand out.
 * Leaflet touches `window` at import time, so it's imported dynamically
 * inside useEffect — this component must stay client-only.
 */
export default function PriceMap({
  venues,
  userCoords,
  lang,
  linkLabel,
  ariaLabel,
  priceDecimals = 2,
}: {
  venues: MapVenue[];
  userCoords: { lat: number; lng: number } | null;
  lang: Lang;
  linkLabel: string;
  ariaLabel: string;
  priceDecimals?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const clusterRef = useRef<LayerGroup | null>(null);
  const userRef = useRef<LayerGroup | null>(null);
  const controlRef = useRef<Control.Layers | null>(null);
  const t = T[lang];

  const fmt = (price: number) => `€${price.toFixed(priceDecimals)}`;

  async function loadLeaflet() {
    const L = (await import("leaflet")).default;
    // plugin registers itself on the same Leaflet instance
    await import("leaflet.markercluster");
    return L;
  }

  // create the map once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await loadLeaflet();
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

      const bases = {
        [t.street]: L.tileLayer(BASE_LAYERS.street.url, { maxZoom: 19, attribution: BASE_LAYERS.street.attribution }),
        [t.light]: L.tileLayer(BASE_LAYERS.light.url, { maxZoom: 19, attribution: BASE_LAYERS.light.attribution }),
        [t.dark]: L.tileLayer(BASE_LAYERS.dark.url, { maxZoom: 19, attribution: BASE_LAYERS.dark.attribution }),
      };
      // light by default — the amber/green pills read best on it
      bases[t.light].addTo(map);
      controlRef.current = L.control.layers(bases, undefined, { position: "topright" }).addTo(map);

      mapRef.current = map;
      userRef.current = L.layerGroup().addTo(map);
      renderMarkers(L);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      clusterRef.current = null;
      userRef.current = null;
      controlRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // (re)draw markers whenever the venue list or user location changes
  function renderMarkers(L: typeof import("leaflet")) {
    const map = mapRef.current;
    if (!map) return;
    if (clusterRef.current) map.removeLayer(clusterRef.current);
    userRef.current?.clearLayers();

    const located = venues.filter((v) => v.lat != null && v.lng != null);
    if (!located.length && !userCoords) return;

    const minPrice = located.length ? Math.min(...located.map((v) => v.price)) : 0;

    // cluster bubbles show "count · from €min" so prices stay readable at
    // country zoom instead of hundreds of overlapping pills
    const cluster = (L as any).markerClusterGroup({
      maxClusterRadius: 46,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: (c: any) => {
        const prices = c.getAllChildMarkers().map((m: any) => m.options.price as number);
        const min = Math.min(...prices);
        return (L as any).divIcon({
          className: "",
          // inline-block: the icon wrapper is 0×0, a block div would collapse
          // to zero width and the background would only cover its padding
          html: `<div style="
              display:inline-block;background:#1e293b;color:#fff;font:600 11px/1.2 system-ui,sans-serif;
              padding:5px 8px;border-radius:999px;border:2px solid #fff;
              box-shadow:0 1px 4px rgba(0,0,0,.45);white-space:nowrap;text-align:center;
              transform:translate(-50%,-50%);">${c.getChildCount()} · ${t.from} ${fmt(min)}</div>`,
          iconSize: [0, 0],
        });
      },
    });

    // pill prices differ at the 3rd decimal for fuel — keep the epsilon
    // below the smallest displayed step so ties still count as cheapest
    const epsilon = 0.1 ** (priceDecimals + 1);
    for (const v of located) {
      const cheapest = v.price <= minPrice + epsilon;
      const icon = L.divIcon({
        className: "", // no default styles — the pill carries everything
        // inline-block: the icon wrapper is 0×0, a block div would collapse
        // to zero width and the background would only cover its padding
        html: `<div style="
            display:inline-block;background:${cheapest ? "#16a34a" : "#f59e0b"};color:#fff;
            font:600 11px/1 system-ui,sans-serif;padding:4px 7px;border-radius:999px;
            box-shadow:0 1px 4px rgba(0,0,0,.4);white-space:nowrap;transform:translate(-50%,-100%);
            border:2px solid #fff;">${fmt(v.price)}</div>`,
        iconSize: [0, 0],
      });
      const distance =
        v.distance != null
          ? `<div style="color:#6b7280;font-size:11px;margin-top:2px;">${v.distance.toFixed(1)} ${t.away}</div>`
          : "";
      const marker = L.marker([v.lat!, v.lng!], { icon, price: v.price } as any).bindPopup(
        `<div style="font:13px/1.4 system-ui,sans-serif;min-width:170px;">
           <strong>${v.name}</strong>
           ${v.address ? `<div style="color:#6b7280;font-size:11px;">${v.address}</div>` : ""}
           ${distance}
           <div style="margin-top:4px;font-weight:700;color:#d97706;">${fmt(v.price)}</div>
           ${orderHtml(v, linkLabel)}
         </div>`
      );
      cluster.addLayer(marker);
    }
    map.addLayer(cluster);
    clusterRef.current = cluster;

    if (userCoords) {
      L.circleMarker([userCoords.lat, userCoords.lng], {
        radius: 8,
        color: "#fff",
        weight: 2,
        fillColor: "#2563eb",
        fillOpacity: 1,
      }).addTo(userRef.current!);
      // centre on the user — nearby venues are what "near me" is about
      map.setView([userCoords.lat, userCoords.lng], 13);
    } else if (located.length) {
      map.fitBounds(
        L.latLngBounds(located.map((v) => [v.lat!, v.lng!] as [number, number])),
        { padding: [30, 30], maxZoom: 14 }
      );
    }
  }

  useEffect(() => {
    (async () => {
      const L = await loadLeaflet();
      renderMarkers(L);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venues, userCoords, lang]);

  // venues without coordinates can't get a marker — list them under the map
  // so every venue stays visible in map view
  const unmapped = venues.filter((v) => v.lat == null || v.lng == null);

  return (
    <div>
      <div
        ref={containerRef}
        className="h-[480px] w-full rounded-xl border border-gray-200 dark:border-gray-700 z-0"
        role="application"
        aria-label={ariaLabel}
      />
      {unmapped.length > 0 && (
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="font-semibold">{t.unmapped}</span>{" "}
          {unmapped.map((v, i) => (
            <span key={v.url + v.name}>
              {i > 0 && " · "}
              <a href={v.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 hover:underline">
                {v.name}
              </a>{" "}
              ({fmt(v.price)})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
