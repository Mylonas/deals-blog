"use client";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, LayerGroup } from "leaflet";

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
  en: { order: "Order on Wolt →", away: "km away" },
  el: { order: "Παραγγελία στο Wolt →", away: "χλμ μακριά" },
  ru: { order: "Заказать на Wolt →", away: "км от вас" },
};

// Cyprus, wide view — used when no user location and no venues to fit
const DEFAULT_CENTER: [number, number] = [35.0, 33.2];
const DEFAULT_ZOOM = 9;

/**
 * Leaflet map of souvlaki venues. Markers are price pills (cheapest = green),
 * clicking one opens a popup with the venue details and Wolt link. When the
 * user shares their location it's shown as a blue dot and the map centres on
 * it. Leaflet touches `window` at import time, so it's imported dynamically
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
  const markersRef = useRef<LayerGroup | null>(null);
  const t = T[lang];

  // create the map once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      mapRef.current = map;
      markersRef.current = L.layerGroup().addTo(map);
      // render markers for the initial props (the marker effect may have
      // already run before the map existed)
      renderMarkers(L);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // (re)draw markers whenever the venue list or user location changes
  function renderMarkers(L: typeof import("leaflet")) {
    const map = mapRef.current;
    const layer = markersRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const located = venues.filter((v) => v.lat != null && v.lng != null);
    if (!located.length && !userCoords) return;

    const minPrice = located.length ? Math.min(...located.map((v) => v.price)) : 0;

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
      L.marker([v.lat!, v.lng!], { icon })
        .bindPopup(
          `<div style="font:13px/1.4 system-ui,sans-serif;min-width:170px;">
             <strong>${v.name}</strong>
             ${v.address ? `<div style="color:#6b7280;font-size:11px;">${v.address}</div>` : ""}
             ${distance}
             <div style="margin-top:4px;font-weight:700;color:#d97706;">€${v.price.toFixed(2)}</div>
             <a href="${v.url}" target="_blank" rel="noopener noreferrer"
                style="display:inline-block;margin-top:6px;color:#2563eb;font-size:12px;">${t.order}</a>
           </div>`
        )
        .addTo(layer);
    }

    if (userCoords) {
      L.circleMarker([userCoords.lat, userCoords.lng], {
        radius: 8,
        color: "#fff",
        weight: 2,
        fillColor: "#2563eb",
        fillOpacity: 1,
      }).addTo(layer);
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
      const L = (await import("leaflet")).default;
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
