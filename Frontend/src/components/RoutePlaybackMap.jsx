import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/components/Map.css';

const haversineKm = (a, b) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
};

const RoutePlaybackMap = ({ routeData = [], shipName = 'Ship' }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const fullRouteRef = useRef(null);
  const trailRef = useRef(null);
  const startRef = useRef(null);
  const endRef = useRef(null);
  const timerRef = useRef(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const points = useMemo(() => {
    if (!Array.isArray(routeData)) return [];
    const base = routeData
      .map((p) => ({
        lat: Number(p.lat),
        lon: Number(p.lon),
        sog: Number(p.sog) || 0,
        destination: (p.destination || 'Unknown').trim() || 'Unknown',
        timestamp: p.timestamp || null,
      }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));

    if (base.length <= 120) return base;

    const sampled = [];
    const step = Math.max(1, Math.floor(base.length / 120));
    for (let i = 0; i < base.length; i += step) sampled.push(base[i]);
    if (sampled[sampled.length - 1] !== base[base.length - 1]) sampled.push(base[base.length - 1]);
    return sampled;
  }, [routeData]);

  const routeDistance = useMemo(() => {
    if (points.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < points.length; i++) total += haversineKm(points[i - 1], points[i]);
    return total;
  }, [points]);

  const uniqueStops = useMemo(() => new Set(points.map((p) => p.destination)).size, [points]);

  const elapsedHours = useMemo(() => {
    if (points.length < 2 || !points[0].timestamp || !points[points.length - 1].timestamp) return 0;
    const start = new Date(points[0].timestamp).getTime();
    const end = new Date(points[points.length - 1].timestamp).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
    return (end - start) / (1000 * 60 * 60);
  }, [points]);

  const progressPercent = points.length > 1 ? Math.round((currentIndex / (points.length - 1)) * 100) : 0;
  const current = points[currentIndex] || null;
  const next = points[Math.min(currentIndex + 1, Math.max(points.length - 1, 0))] || null;

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [20, 0],
      zoom: 3,
      minZoom: 2,
      maxZoom: 18,
      preferCanvas: true,
      worldCopyJump: false,
      maxBounds: [[-85, -180], [85, 180]],
      maxBoundsViscosity: 1.0,
    });

    L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      attribution: '&copy; Stadia Maps & OpenMapTiles & OpenStreetMap contributors',
      noWrap: true,
    }).addTo(map);

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || points.length === 0) return;

    if (fullRouteRef.current) map.removeLayer(fullRouteRef.current);
    if (trailRef.current) map.removeLayer(trailRef.current);
    if (markerRef.current) map.removeLayer(markerRef.current);
    if (startRef.current) map.removeLayer(startRef.current);
    if (endRef.current) map.removeLayer(endRef.current);

    const latLngs = points.map((p) => [p.lat, p.lon]);

    fullRouteRef.current = L.polyline(latLngs, {
      color: '#38bdf8',
      weight: 4,
      opacity: 0.75,
      dashArray: '8,8',
    }).addTo(map);

    trailRef.current = L.polyline([latLngs[0]], {
      color: '#22d3ee',
      weight: 6,
      opacity: 0.35,
    }).addTo(map);

    startRef.current = L.circleMarker(latLngs[0], {
      radius: 7,
      fillColor: '#22c55e',
      color: '#dcfce7',
      weight: 2,
      fillOpacity: 0.95,
    }).addTo(map).bindPopup(`
      <div style="font:12px/1.35 'Plus Jakarta Sans',sans-serif; min-width:170px; color:#ffffff;">
        <div style="font-weight:700; color:#86efac; margin-bottom:6px;">Start Point</div>
        <div><strong>Location:</strong> ${points[0].destination}</div>
        <div><strong>Coords:</strong> ${points[0].lat.toFixed(3)}, ${points[0].lon.toFixed(3)}</div>
        <div><strong>Time:</strong> ${points[0].timestamp ? new Date(points[0].timestamp).toLocaleString() : 'N/A'}</div>
      </div>
    `, { className: 'route-popup-clean' });

    endRef.current = L.circleMarker(latLngs[latLngs.length - 1], {
      radius: 7,
      fillColor: '#ef4444',
      color: '#fee2e2',
      weight: 2,
      fillOpacity: 0.95,
    }).addTo(map).bindPopup(`
      <div style="font:12px/1.35 'Plus Jakarta Sans',sans-serif; min-width:170px; color:#ffffff;">
        <div style="font-weight:700; color:#fca5a5; margin-bottom:6px;">End Point</div>
        <div><strong>Location:</strong> ${points[points.length - 1].destination}</div>
        <div><strong>Coords:</strong> ${points[points.length - 1].lat.toFixed(3)}, ${points[points.length - 1].lon.toFixed(3)}</div>
        <div><strong>Time:</strong> ${points[points.length - 1].timestamp ? new Date(points[points.length - 1].timestamp).toLocaleString() : 'N/A'}</div>
      </div>
    `, { className: 'route-popup-clean' });

    const shipIcon = L.divIcon({
      className: 'route-track-ship-marker',
      html: `<div class="route-track-chip">${shipName}</div><div class="route-track-ship">⛴</div>`,
      iconSize: [96, 40],
      iconAnchor: [48, 22],
    });

    markerRef.current = L.marker(latLngs[0], { icon: shipIcon }).addTo(map).bindPopup(`
      <div style="font:12px/1.35 'Plus Jakarta Sans',sans-serif; min-width:170px; color:#ffffff;">
        <div style="font-weight:700; color:#67e8f9; margin-bottom:6px;">${shipName}</div>
        <div><strong>Status:</strong> Route Tracking</div>
        <div><strong>Location:</strong> ${points[0].destination}</div>
        <div><strong>Speed:</strong> ${points[0].sog.toFixed(1)} kn</div>
      </div>
    `, { className: 'route-popup-clean' });

    map.invalidateSize();
    map.fitBounds(L.latLngBounds(latLngs), { padding: [35, 35] });
    setCurrentIndex(0);
    setIsPlaying(true);
  }, [points, shipName]);

  useEffect(() => {
    if (!markerRef.current || !trailRef.current || points.length === 0) return;
    const p = points[currentIndex];
    markerRef.current.setLatLng([p.lat, p.lon]);
    trailRef.current.setLatLngs(points.slice(0, currentIndex + 1).map((x) => [x.lat, x.lon]));
    markerRef.current.setPopupContent(`
      <div style="font:12px/1.35 'Plus Jakarta Sans',sans-serif; min-width:180px; color:#ffffff;">
        <div style="font-weight:700; color:#67e8f9; margin-bottom:6px;">${shipName}</div>
        <div><strong>Location:</strong> ${p.destination}</div>
        <div><strong>Coords:</strong> ${p.lat.toFixed(3)}, ${p.lon.toFixed(3)}</div>
        <div><strong>Speed:</strong> ${p.sog.toFixed(1)} kn</div>
        <div><strong>Frame:</strong> ${currentIndex + 1} / ${points.length}</div>
      </div>
    `);
  }, [currentIndex, points]);

  useEffect(() => {
    if (!isPlaying || points.length < 2) return undefined;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= points.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 800);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying, points.length]);

  const play = () => {
    if (points.length < 2) return;
    if (currentIndex >= points.length - 1) setCurrentIndex(0);
    setIsPlaying(true);
  };

  const pause = () => setIsPlaying(false);

  const stop = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
  };

  const timeline = points.slice(Math.max(0, currentIndex - 2), Math.min(points.length, currentIndex + 3));

  if (points.length === 0) {
    return <div className="h-full grid place-items-center text-slate-400">No route data available.</div>;
  }

  return (
    <div className="h-full w-full flex flex-col bg-slate-950">
      <div className="px-4 py-3 border-b border-slate-700 bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/30 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-slate-400 uppercase tracking-wide">Route TV Tracker</div>
          <div className="text-sm text-slate-200">
            <span className="font-semibold text-cyan-300">{shipName}</span>
            <span className="mx-2 text-slate-500">•</span>
            <span>Heading to <span className="font-semibold text-amber-300">{current?.destination || 'Unknown'}</span></span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={play} className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">Play</button>
          <button onClick={pause} className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold">Pause</button>
          <button onClick={stop} className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">Stop</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 p-4 flex-1 min-h-0">
        <div className="xl:col-span-2 rounded-2xl border border-slate-700 overflow-hidden bg-slate-900/80 shadow-[0_0_35px_rgba(34,211,238,0.12)]">
          <div ref={mapContainerRef} className="h-full min-h-[360px]" />
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-900/85 p-3 flex flex-col gap-3 min-h-0 overflow-auto">
          <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
            <p className="text-xs text-slate-400">Playback Progress</p>
            <div className="mt-2 h-2 w-full rounded-full bg-slate-700 overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="mt-2 text-sm text-slate-200">{progressPercent}% complete</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
              <p className="text-xs text-slate-400">Track Points</p>
              <p className="text-lg font-bold text-slate-100">{points.length}</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
              <p className="text-xs text-slate-400">Stops</p>
              <p className="text-lg font-bold text-violet-300">{uniqueStops}</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
              <p className="text-xs text-slate-400">Distance</p>
              <p className="text-lg font-bold text-cyan-300">{routeDistance.toFixed(1)} km</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
              <p className="text-xs text-slate-400">Elapsed</p>
              <p className="text-lg font-bold text-emerald-300">{elapsedHours.toFixed(1)} h</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
            <p className="text-xs text-slate-400 mb-2">Current Navigation Frame</p>
            <p className="text-sm text-slate-100 font-semibold">{current?.destination || 'Unknown'}</p>
            <p className="text-xs text-slate-400 mt-1">{current?.timestamp ? new Date(current.timestamp).toLocaleString() : 'No timestamp'}</p>
            <p className="text-xs text-slate-400 mt-1">{current?.lat?.toFixed(3)}, {current?.lon?.toFixed(3)} • {(current?.sog || 0).toFixed(1)} kn</p>
            <p className="text-xs text-slate-300 mt-2">Next: <span className="text-amber-300 font-semibold">{next?.destination || 'End of route'}</span></p>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
            <p className="text-xs text-slate-400 mb-2">Mission Timeline</p>
            <div className="space-y-2">
              {timeline.map((p, idx) => {
                const absoluteIndex = Math.max(0, currentIndex - 2) + idx;
                const active = absoluteIndex === currentIndex;
                return (
                  <div key={`${p.timestamp || absoluteIndex}-${idx}`} className={`rounded-lg px-3 py-2 border text-xs ${active ? 'bg-cyan-950/45 border-cyan-700 text-cyan-200' : 'bg-slate-900/60 border-slate-700 text-slate-300'}`}>
                    <div className="font-semibold">{absoluteIndex + 1}. {p.destination}</div>
                    <div>{p.timestamp ? new Date(p.timestamp).toLocaleString() : 'No timestamp'}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoutePlaybackMap;
