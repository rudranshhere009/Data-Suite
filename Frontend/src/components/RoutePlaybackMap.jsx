import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/components/Map.css';

const RoutePlaybackMap = ({ routeData = [], shipName = 'Ship' }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const movingMarkerRef = useRef(null);
  const trailRef = useRef(null);
  const timerRef = useRef(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const points = (routeData || []).filter((p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon)));

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [20, 0],
      zoom: 3,
      minZoom: 2,
      maxZoom: 18,
      preferCanvas: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
      movingMarkerRef.current = null;
      trailRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || points.length === 0) return;

    map.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) {
        map.removeLayer(layer);
      }
    });

    const latLngs = points.map((p) => [Number(p.lat), Number(p.lon)]);

    L.polyline(latLngs, {
      color: '#0ea5e9',
      weight: 4,
      opacity: 0.85,
      dashArray: '10, 8',
    }).addTo(map);

    L.circleMarker(latLngs[0], {
      radius: 8,
      fillColor: '#16a34a',
      color: '#dcfce7',
      fillOpacity: 0.95,
      weight: 2,
    }).bindTooltip('START', { permanent: true, direction: 'top' }).addTo(map);

    L.circleMarker(latLngs[latLngs.length - 1], {
      radius: 8,
      fillColor: '#dc2626',
      color: '#fee2e2',
      fillOpacity: 0.95,
      weight: 2,
    }).bindTooltip('END', { permanent: true, direction: 'top' }).addTo(map);

    trailRef.current = L.polyline([latLngs[0]], {
      color: '#22d3ee',
      weight: 6,
      opacity: 0.3,
    }).addTo(map);

    const movingIcon = L.divIcon({
      className: 'route-track-ship-marker',
      html: `<div class="route-track-chip">${shipName}</div><div class="route-track-ship">⛴</div>`,
      iconSize: [90, 42],
      iconAnchor: [45, 21],
    });

    movingMarkerRef.current = L.marker(latLngs[0], { icon: movingIcon }).addTo(map);
    setCurrentIndex(0);

    map.fitBounds(L.latLngBounds(latLngs), { padding: [30, 30] });
    setIsPlaying(true);
  }, [routeData, shipName]);

  useEffect(() => {
    if (!isPlaying || points.length < 2 || !movingMarkerRef.current || !trailRef.current) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1;
        if (next >= points.length) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          setIsPlaying(false);
          return prev;
        }

        const lat = Number(points[next].lat);
        const lon = Number(points[next].lon);
        movingMarkerRef.current.setLatLng([lat, lon]);

        const existing = trailRef.current.getLatLngs();
        trailRef.current.setLatLngs([...existing, [lat, lon]]);

        return next;
      });
    }, 650);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying, points]);

  const pause = () => setIsPlaying(false);

  const play = () => {
    if (points.length > 1) setIsPlaying(true);
  };

  const stop = () => {
    setIsPlaying(false);
    setCurrentIndex(0);

    const first = points[0];
    if (first && movingMarkerRef.current && trailRef.current) {
      const latLng = [Number(first.lat), Number(first.lon)];
      movingMarkerRef.current.setLatLng(latLng);
      trailRef.current.setLatLngs([latLng]);
    }
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="px-4 py-3 border-b border-slate-700 bg-slate-900/95 flex items-center justify-between gap-3">
        <div className="text-sm text-slate-200">
          Tracking: <span className="font-semibold text-cyan-300">{shipName}</span>
          <span className="ml-3 text-slate-400">Point {Math.min(currentIndex + 1, Math.max(points.length, 1))}/{Math.max(points.length, 1)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={play} className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">Play</button>
          <button onClick={pause} className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold">Pause</button>
          <button onClick={stop} className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">Stop</button>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 min-h-[320px]" />
    </div>
  );
};

export default RoutePlaybackMap;

