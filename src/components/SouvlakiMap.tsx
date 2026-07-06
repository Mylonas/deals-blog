"use client";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import type { Map as LeafletMap, LayerGroup, Control } from "leaflet";

export type MapVenue = {
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  url: string;
  price: number;
  distance: number | null;
};

type Lang = "en" | "el" | "ru";

const T = {
  en: { order: "Order on Wolt →", away: "km away", street: "Street", light: "Light", dark: "Dark", from: "from" },
  el: { order: "Παραγγελία στο Wolt →", away: "χλμ μακριά", street: "Κανονικός", light: "Ανοιχτός", dark: "Σκούρος", from: "από" },
  ru: { order: "Заказать на Wolt →", away: "км от вас", street: "Улицы", light: "Светлая", dark: "Тёмная", from: "от" },
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
 * Leaflet map of souvlaki venues. Markers are price pills (cheapest = green)
 * grouped into clusters at low zoom — a cluster bubble shows the venue count
 * and the cheapest price inside it, so the map stays readable with hundreds
 * of venues. A layers control (top right) switches the base map between
 * Street, Light and Dark tiles — Light/Dark make the price pills stand out.
 * Leaflet touches `window` at import time, so it's imported dynamically
 * inside useEffect — this component must stay client-only.
 */
export default function SouvlakiMap({
  venues,
  userCoords,
  lang,
}: {
  venues: MapVenue[];
  userCoords: { lat: number; lng: number } | null;
  lang: Lang;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const clusterRef = useRef<LayerGroup | null>(null);
  const userRef = useRef<LayerGroup | null>(null);
  const controlRef = useRef<Control.Layers | null>(null);
  const t = T[lang];

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
          html: `<div style="
              background:#1e293b;color:#fff;font:600 11px/1.2 system-ui,sans-serif;
              padding:5px 8px;border-radius:999px;border:2px solid #fff;
              box-shadow:0 1px 4px rgba(0,0,0,.45);white-space:nowrap;text-align:center;
              transform:translate(-50%,-50%);">${c.getChildCount()} · ${t.from} €${min.toFixed(2)}</div>`,
          iconSize: [0, 0],
        });
      },
    });

    for (const v of located) {
      const cheapest = v.price <= minPrice + 0.001;
      const icon = L.divIcon({
        className: "", // no default styles — the pill carries everything
        html: `<div style="
            background:${cheapest ? "#16a34a" : "#f59e0b"};color:#fff;
            font:600 11px/1 system-ui,sans-serif;padding:4px 7px;border-radius:999px;
            box-shadow:0 1px 4px rgba(0,0,0,.4);white-space:nowrap;transform:translate(-50%,-100%);
            border:2px solid #fff;">€${v.price.toFixed(2)}</div>`,
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
           <div style="margin-top:4px;font-weight:700;color:#d97706;">€${v.price.toFixed(2)}</div>
           <a href="${v.url}" target="_blank" rel="noopener noreferrer"
              style="display:inline-block;margin-top:6px;color:#2563eb;font-size:12px;">${t.order}</a>
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

  return (
    <div
      ref={containerRef}
      className="h-[480px] w-full rounded-xl border border-gray-200 dark:border-gray-700 z-0"
      role="application"
      aria-label="Souvlaki venues map"
    />
  );
}
