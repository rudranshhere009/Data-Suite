import { useEffect, useRef, useState, useCallback } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { getShips, getApiHealth } from "../services/aisApi";
import '../styles/components/Map.css';

export default function Map({ sidebarOpen, setSidebarOpen, setRefreshData, isRefreshing, routeData, shipDetails }) {
  const mapRef = useRef(null);
  const markersRef = useRef(null);
  const gridLayerRef = useRef(null);
  const mountedRef = useRef(true);
  const routeAnimationRef = useRef(null);

  const [ships, setShips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiHealth, setApiHealth] = useState(null);
  const [gridStep, setGridStep] = useState(5); // Default 5° grid
  const [showGrid, setShowGrid] = useState(false); // Grid on/off toggle (default OFF)

  // Helper functions for grid
  const isNearMultiple = (value, step) => Math.abs(value - Math.round(value / step) * step) < 1e-6;
  const latLabel = (deg) => `${Math.abs(deg)}°${deg >= 0 ? 'N' : 'S'}`;
  const lonLabel = (deg) => `${Math.abs(deg)}°${deg >= 0 ? 'E' : 'W'}`;

  // Build global grid like main.html
  const buildGlobalGrid = () => {
    if (!mapRef.current) return;
    const zoom = mapRef.current.getZoom();
    const effectiveStep =
      zoom <= 2 ? Math.max(gridStep, 30) :
      zoom <= 3 ? Math.max(gridStep, 20) :
      zoom <= 4 ? Math.max(gridStep, 10) :
      gridStep;
    const majorStep = effectiveStep >= 10 ? effectiveStep : effectiveStep * 2;
    const showLabels = zoom >= 3;

    // Initialize gridLayerRef if missing
    if (!gridLayerRef.current) {
      gridLayerRef.current = L.layerGroup().addTo(mapRef.current);
    }

    // Clear existing grid
    gridLayerRef.current.clearLayers();

    if (!showGrid || gridStep === 0) return; // Grid off

    const LAT_MIN = -85, LAT_MAX = 85; // Avoid extreme distortion at poles
    const LON_MIN = -180, LON_MAX = 180;

    // Create latitude lines (horizontal)
    for (let lat = Math.ceil(LAT_MIN / effectiveStep) * effectiveStep; lat <= LAT_MAX; lat += effectiveStep) {
      const majorLine = isNearMultiple(lat, majorStep);

      const latLine = L.polyline([[lat, LON_MIN], [lat, LON_MAX]], {
        color: majorLine ? '#00bcd4' : '#90a4ae',
        weight: majorLine ? 1.6 : 1,
        opacity: majorLine ? 0.65 : 0.35,
        dashArray: majorLine ? null : '4,4',
        interactive: false
      });
      gridLayerRef.current.addLayer(latLine);

      // Add latitude label on the left edge
      if (showLabels && majorLine) {
        const latLabelMarker = L.marker([lat, LON_MIN + 2], {
          interactive: false,
          icon: L.divIcon({
            className: 'grid-label',
            html: latLabel(lat),
            iconSize: [40, 20],
            iconAnchor: [0, 10]
          })
        });
        gridLayerRef.current.addLayer(latLabelMarker);
      }
    }

    // Create longitude lines (vertical)
    for (let lon = Math.ceil(LON_MIN / effectiveStep) * effectiveStep; lon <= LON_MAX; lon += effectiveStep) {
      const majorLine = isNearMultiple(lon, majorStep);

      const lonLine = L.polyline([[LAT_MIN, lon], [LAT_MAX, lon]], {
        color: majorLine ? '#00bcd4' : '#90a4ae',
        weight: majorLine ? 1.6 : 1,
        opacity: majorLine ? 0.65 : 0.35,
        dashArray: majorLine ? null : '4,4',
        interactive: false
      });
      gridLayerRef.current.addLayer(lonLine);

      // Add longitude label on the top edge
      if (showLabels && majorLine) {
        const lonLabelMarker = L.marker([LAT_MAX - 2, lon], {
          interactive: false,
          icon: L.divIcon({
            className: 'grid-label',
            html: lonLabel(lon),
            iconSize: [40, 20],
            iconAnchor: [20, 0]
          })
        });
        gridLayerRef.current.addLayer(lonLabelMarker);
      }
    }
  };

  // Ship type to color mapping
  const getShipColor = (shipType) => {
    const type = (shipType || "").toLowerCase();
    if (type.includes("cargo") || type.includes("container")) return "#16a34a"; // Green
    if (type.includes("tanker") || type.includes("oil")) return "#e11d48"; // Red
    if (type.includes("passenger") || type.includes("cruise")) return "#f59e0b"; // Orange
    if (type.includes("fishing")) return "#2563eb"; // Blue
    if (type.includes("tug") || type.includes("service")) return "#8e24aa"; // Purple
    if (type.includes("military") || type.includes("naval")) return "#37474f"; // Dark Gray
    return "#6b7280"; // Default Gray
  };

  // Ship icon - large upright location pin marker.
  const makeShipIcon = (color, heading = 0) => {
    const html = `
      <div style="position:relative;width:52px;height:52px;cursor:pointer;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.18;box-shadow:0 0 0 1px rgba(255,255,255,0.14),0 0 20px ${color};"></div>
        <div style="position:relative;width:28px;height:28px;background:${color};border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 7px 14px rgba(0,0,0,0.45);border:2px solid rgba(255,255,255,0.78);">
          <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(45deg);width:9px;height:9px;background:#e2e8f0;border-radius:50%;"></div>
        </div>
      </div>`;
    return L.divIcon({
      className: "ship-location-marker",
      html,
      iconSize: [52, 52],
      iconAnchor: [26, 40],
      popupAnchor: [0, -34]
    });
  };
  // Normalize ship data from different API formats - Optimized for large datasets
  const normalizeShipsFromApi = (data) => {
    if (!data) return [];

    let vessels = [];

    // Handle different response formats
    if (Array.isArray(data)) {
      vessels = data;
    } else if (data.vessels && Array.isArray(data.vessels)) {
      vessels = data.vessels;
    } else if (data.data && Array.isArray(data.data)) {
      vessels = data.data;
    } else if (data.ships && Array.isArray(data.ships)) {
      vessels = data.ships;
    }

    // For large datasets, don't limit the number of ships - show all
    return vessels.map((vessel) => ({
      mmsi: vessel.MMSI || vessel.mmsi || `${Math.floor(Math.random() * 900000000) + 100000000}`,
      name: vessel.NAME || vessel.shipname || vessel.name || `Vessel ${vessel.MMSI || Math.floor(Math.random() * 1000)}`,
      lat: parseFloat(vessel.LATITUDE || vessel.lat || vessel.latitude || 0),
      lon: parseFloat(vessel.LONGITUDE || vessel.lon || vessel.longitude || 0),
      sog: parseFloat(vessel.SOG || vessel.sog || vessel.speed || Math.random() * 20),
      cog: parseFloat(vessel.COG || vessel.cog || vessel.course || Math.random() * 360),
      heading: parseFloat(vessel.HEADING || vessel.heading || vessel.COG || vessel.cog || Math.random() * 360),
      shipType: vessel.SHIPTYPE || vessel.shiptype || vessel.type || vessel.vessel_type || 'Cargo',
      destination: vessel.DESTINATION || vessel.destination || vessel.dest || 'Unknown',
      eta: vessel.ETA || vessel.eta || new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      draught: parseFloat(vessel.DRAUGHT || vessel.draught || vessel.draft || Math.random() * 15 + 5),
      // ensure addition is grouped so fallback works as intended
      length: parseFloat(
        vessel.LENGTH ||
        vessel.length ||
        ((vessel.dim_bow || 0) + (vessel.dim_stern || 0)) ||
        (Math.random() * 200 + 100)
      ),
      width: parseFloat(
        vessel.WIDTH ||
        vessel.width ||
        ((vessel.dim_port || 0) + (vessel.dim_starboard || 0)) ||
        (Math.random() * 30 + 15)
      ),
      lastUpdate: vessel.TIME || vessel.timestamp || vessel.last_position_utc || new Date().toISOString().slice(0, 19)
    })).filter((ship) => ship.lat !== 0 && ship.lon !== 0);
  };

  // DEMO_DATA left intact but empty (you had commented demo data)
  const DEMO_DATA = [];

  // Check API health status
  const checkApiHealth = useCallback(async () => {
    try {
      const health = await getApiHealth();
      setApiHealth(health);
      console.log("🏥 API Health:", health);
    } catch (error) {
      console.error("❌ Health check failed:", error);
      setApiHealth({ status: 'error', error: error.message });
    }
  }, []);

  // Fetch ship data using Axios API service
  const fetchShipData = useCallback(async () => {
    try {
      if (!mountedRef.current) return;
      setLoading(true);
      setError(null);

      console.log("🚢 Fetching ships with 7-digit MMSI IDs...");

      // Request ships
      const ships = await getShips({ limit: 1000 });

      console.log(`✅ Received ${ships.length} ships from database`);

      if (mountedRef.current) {
        if (ships && ships.length > 0) {
          setShips(ships);
          setError(null);
        } else {
          setError("No ships found in database. Check if backend has data.");
          setShips([]);
        }
      }
    } catch (error) {
      console.error("❌ Failed to fetch ship data:", error);
      if (mountedRef.current) {
        setError(`API Error: ${error.message}`);
        setShips([]);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Initialize map
  useEffect(() => {
    mountedRef.current = true;
    if (mapRef.current) return;

    const map = L.map("map", {
      center: [15.0, 75.0], // Indian Ocean region
      zoom: 5,
      minZoom: 3,
      maxZoom: 18,
      preferCanvas: true,
      worldCopyJump: false,
      crs: L.CRS.EPSG3857, // Explicit Web Mercator
      maxBounds: [[-85, -180], [85, 180]],
      maxBoundsViscosity: 1.0,
    });

    mapRef.current = map;

    // Dark theme tiles without API key requirement.
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 20,
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
      noWrap: true,
    }).addTo(map);

    // Initialize grid layer
    gridLayerRef.current = L.layerGroup().addTo(map);

    // Build initial grid
    buildGlobalGrid();

    map.on('zoomend', buildGlobalGrid);

    // Dedicated layer group for markers
    markersRef.current = L.layerGroup().addTo(map);

    // Check API health first, then load data
    if (!routeData) {
      checkApiHealth();
      fetchShipData();
    }

    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      if (!routeData) {
        checkApiHealth();
        fetchShipData();
      }
    }, 5 * 60 * 1000);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      try {
        map.remove();
      } finally {
        mapRef.current = null;
        markersRef.current = null;
        gridLayerRef.current = null;
      }
    };
  }, [fetchShipData, checkApiHealth, routeData]);

  // Pass refresh function to parent component
  useEffect(() => {
    if (setRefreshData) {
      setRefreshData(() => fetchShipData);
    }
    return () => {
      if (setRefreshData) {
        setRefreshData(null);
      }
    };
  }, [fetchShipData, setRefreshData]);

  // Update grid when gridStep or showGrid changes
  useEffect(() => {
    buildGlobalGrid();
  }, [gridStep, showGrid]);

  // Update markers when ships change
  useEffect(() => {
    if (routeData && routeData.length > 0) return;
    console.log(`🗺️ Updating map with ${ships.length} ships`);
    if (!mountedRef.current || !markersRef.current || ships.length === 0) {
      console.log("❌ Cannot update markers: component unmounted or no ships");
      return;
    }

    const markerGroup = markersRef.current;

    // Clear existing markers
    markerGroup.clearLayers();
    console.log("🧹 Cleared existing markers");

    // Add ship markers
    ships.forEach((ship) => {
      const color = getShipColor(ship.shipType);

      const marker = L.marker([ship.lat, ship.lon], {
        icon: makeShipIcon(color, ship.heading)
      }).bindPopup(`
        <div class="ship-popup-content">
          <div class="ship-popup-title">${ship.name}</div>
          <table class="ship-popup-table">
            <tr><td class="label">MMSI</td><td class="value">${ship.mmsi}</td></tr>
            <tr><td class="label">Type</td><td class="value">${ship.shipType}</td></tr>
            <tr><td class="label">Position</td><td class="value">${ship.lat.toFixed(4)}, ${ship.lon.toFixed(4)}</td></tr>
            <tr><td class="label">Speed</td><td class="value">${ship.sog.toFixed(1)} knots</td></tr>
            <tr><td class="label">Course</td><td class="value">${ship.cog.toFixed(0)} deg</td></tr>
            <tr><td class="label">Heading</td><td class="value">${ship.heading.toFixed(0)} deg</td></tr>
            <tr><td class="label">Destination</td><td class="value">${ship.destination}</td></tr>
            <tr><td class="label">ETA</td><td class="value">${ship.eta}</td></tr>
            <tr><td class="label">Dimensions</td><td class="value">${ship.length}m x ${ship.width}m</td></tr>
            <tr><td class="label">Draught</td><td class="value">${ship.draught.toFixed(1)}m</td></tr>
            <tr><td class="label">Last Update</td><td class="value">${ship.lastUpdate}</td></tr>
          </table>
        </div>
      `, { className: "ship-popup-theme", maxWidth: 360 });

      marker.addTo(markerGroup);
    });

    console.log(`✅ Added ${ships.length} ship markers to map`);
  }, [ships, routeData]);

  // Update route when routeData changes
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const markerGroup = markersRef.current;

    if (routeData && routeData.length > 0) {
      // Clear existing markers and animation for route display
      markerGroup.clearLayers();
      if (routeAnimationRef.current) {
        clearInterval(routeAnimationRef.current);
        routeAnimationRef.current = null;
      }

      const routePoints = routeData.map(p => [p.lat, p.lon]);
      
      // Fit map to show the entire route
      if (routePoints.length > 0) {
        const bounds = L.latLngBounds(routePoints);
        map.fitBounds(bounds, { padding: [20, 20] });
      }

      // Add route line connecting all points
      if (routePoints.length > 1) {
        const routeLine = L.polyline(routePoints, {
          color: '#2563eb', // Blue route line
          weight: 4,
          opacity: 0.8,
          smoothFactor: 1,
          dashArray: '10, 5' // Dashed line for route
        }).addTo(markerGroup);

        // Add route line popup showing total route info
        routeLine.bindPopup(`
          <div style="font:13px/1.35 system-ui,sans-serif; min-width:200px; background-color: #1e3a8a; color: #e0e7ff; padding: 12px; border-radius: 8px;">
            <div style="font-weight:600; margin-bottom:8px; color:#93c5fd; font-size: 16px;">🚢 Ship Route</div>
            <table style="width:100%; font-size:12px; line-height:1.5;">
              <tr><td style="padding:3px 8px 3px 0; color:#c7d2fe;"><strong>Total Points:</strong></td><td>${routeData.length}</td></tr>
              <tr><td style="padding:3px 8px 3px 0; color:#c7d2fe;"><strong>Start Time:</strong></td><td>${new Date(routeData[0].timestamp).toLocaleString()}</td></tr>
              <tr><td style="padding:3px 8px 3px 0; color:#c7d2fe;"><strong>End Time:</strong></td><td>${new Date(routeData[routeData.length - 1].timestamp).toLocaleString()}</td></tr>
              <tr><td style="padding:3px 8px 3px 0; color:#c7d2fe;"><strong>Ship:</strong></td><td>${shipDetails?.NAME || 'Unknown'}</td></tr>
            </table>
          </div>
        `);
      }

      // Add start point marker (green)
      if (routePoints.length > 0) {
        const startPoint = routeData[0];
        L.circleMarker([startPoint.lat, startPoint.lon], {
          radius: 12,
          fillColor: '#16a34a', // Green for start
          color: '#ffffff',
          weight: 3,
          opacity: 1,
          fillOpacity: 0.9,
        }).bindPopup(`
          <div style="font:13px/1.35 system-ui,sans-serif; min-width:220px; background-color: #16a34a; color: #ffffff; padding: 12px; border-radius: 8px;">
            <div style="font-weight:600; margin-bottom:8px; color:#dcfce7; font-size: 16px;">🟢 START POINT</div>
            <table style="width:100%; font-size:12px; line-height:1.5;">
              <tr><td style="padding:3px 8px 3px 0; color:#bbf7d0;"><strong>Time:</strong></td><td>${new Date(startPoint.timestamp).toLocaleString()}</td></tr>
              <tr><td style="padding:3px 8px 3px 0; color:#bbf7d0;"><strong>Position:</strong></td><td>${startPoint.lat?.toFixed(4)}°, ${startPoint.lon?.toFixed(4)}°</td></tr>
              <tr><td style="padding:3px 8px 3px 0; color:#bbf7d0;"><strong>Speed:</strong></td><td>${startPoint.sog?.toFixed(1)} knots</td></tr>
              <tr><td style="padding:3px 8px 3px 0; color:#bbf7d0;"><strong>Destination:</strong></td><td>${startPoint.destination}</td></tr>
            </table>
          </div>
        `).addTo(markerGroup)
        .bindTooltip('START', { permanent: true, direction: 'center', className: 'route-start-tooltip' });
      }

      // Add end point marker (red)
      if (routePoints.length > 1) {
        const endPoint = routeData[routeData.length - 1];
        L.circleMarker([endPoint.lat, endPoint.lon], {
          radius: 12,
          fillColor: '#dc2626', // Red for end
          color: '#ffffff',
          weight: 3,
          opacity: 1,
          fillOpacity: 0.9,
        }).bindPopup(`
          <div style="font:13px/1.35 system-ui,sans-serif; min-width:220px; background-color: #dc2626; color: #ffffff; padding: 12px; border-radius: 8px;">
            <div style="font-weight:600; margin-bottom:8px; color:#fecaca; font-size: 16px;">🔴 END POINT</div>
            <table style="width:100%; font-size:12px; line-height:1.5;">
              <tr><td style="padding:3px 8px 3px 0; color:#fca5a5;"><strong>Time:</strong></td><td>${new Date(endPoint.timestamp).toLocaleString()}</td></tr>
              <tr><td style="padding:3px 8px 3px 0; color:#fca5a5;"><strong>Position:</strong></td><td>${endPoint.lat?.toFixed(4)}°, ${endPoint.lon?.toFixed(4)}°</td></tr>
              <tr><td style="padding:3px 8px 3px 0; color:#fca5a5;"><strong>Speed:</strong></td><td>${endPoint.sog?.toFixed(1)} knots</td></tr>
              <tr><td style="padding:3px 8px 3px 0; color:#fca5a5;"><strong>Destination:</strong></td><td>${endPoint.destination}</td></tr>
            </table>
          </div>
        `).addTo(markerGroup)
        .bindTooltip('END', { permanent: true, direction: 'center', className: 'route-end-tooltip' });
      }

      // Add intermediate waypoint markers (smaller blue dots) - only show every 50th point to avoid clutter
      if (routePoints.length > 2) {
        const showEveryNth = Math.max(1, Math.floor(routeData.length / 10)); // Show max 10 intermediate points
        for (let i = 1; i < routeData.length - 1; i += showEveryNth) {
          const point = routeData[i];
          L.circleMarker([point.lat, point.lon], {
            radius: 5,
            fillColor: '#3b82f6', // Blue for waypoints
            color: '#ffffff',
            weight: 1,
            opacity: 0.8,
            fillOpacity: 0.7,
          }).bindPopup(`
            <div style="font:13px/1.35 system-ui,sans-serif; min-width:180px; background-color: #3b82f6; color: #ffffff; padding: 8px; border-radius: 6px;">
              <div style="font-weight:600; margin-bottom:6px; color:#dbeafe; font-size: 14px;">📍 Waypoint</div>
              <table style="width:100%; font-size:11px; line-height:1.4;">
                <tr><td style="padding:2px 6px 2px 0; color:#bfdbfe;"><strong>Time:</strong></td><td>${new Date(point.timestamp).toLocaleString()}</td></tr>
                <tr><td style="padding:2px 6px 2px 0; color:#bfdbfe;"><strong>Position:</strong></td><td>${point.lat?.toFixed(4)}°, ${point.lon?.toFixed(4)}°</td></tr>
                <tr><td style="padding:2px 6px 2px 0; color:#bfdbfe;"><strong>Speed:</strong></td><td>${point.sog?.toFixed(1)} knots</td></tr>
                <tr><td style="padding:2px 6px 2px 0; color:#bfdbfe;"><strong>Destination:</strong></td><td>${point.destination}</td></tr>
              </table>
            </div>
          `).addTo(markerGroup);
        }
      }

      // Open sidebar with ship details if available
      if (shipDetails) {
        // setSidebarOpen(true); // This might not be desired for the popup map
      }

    } else {
      // If no routeData, clear route-specific elements and potentially show general ships
      markerGroup.clearLayers();
      if (routeAnimationRef.current) {
        clearInterval(routeAnimationRef.current);
        routeAnimationRef.current = null;
      }
      // The general ship markers are handled by the separate useEffect for `ships`
    }

    return () => {
      if (routeAnimationRef.current) {
        clearInterval(routeAnimationRef.current);
        routeAnimationRef.current = null;
      }
    };
  }, [routeData, shipDetails]);
  

  return (
    <div className="map-wrapper">
      <div className="map-container">
        <div id="map" className="map-leaflet" />

        {/* Loading Overlay for Map */}
        {isRefreshing && (
          <div className="map-loading-overlay">
            <div className="map-loading-spinner"></div>
            <span>Loading ships...</span>
          </div>
        )}
      </div>

      {/* Sidebar Overlay */}
      {!routeData && (
        <div
          className={`sidebar-overlay ${sidebarOpen ? 'sidebar-overlay-open' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sliding Sidebar */}
      {!routeData && (
        <div className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <div className="sidebar-header-minimal">
            <button
              className="sidebar-close"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>

          <div className="sidebar-content">
            {shipDetails ? (
              <div className="sidebar-section">
                <h4>Ship Details</h4>
                <div className="status-info">
                  <div className="status-row"><span>MMSI:</span><span>{shipDetails.MMSI}</span></div>
                  <div className="status-row"><span>IMO:</span><span>{shipDetails.IMO}</span></div>
                  <div className="status-row"><span>Call Sign:</span><span>{shipDetails.CALL_SIGN}</span></div>
                  <div className="status-row"><span>Flag:</span><span>{shipDetails.FLAG}</span></div>
                  <div className="status-row"><span>Ship Type:</span><span>{shipDetails.SHIP_TYPE}</span></div>
                  <div className="status-row"><span>Length:</span><span>{shipDetails.LENGTH}m</span></div>
                  <div className="status-row"><span>Width:</span><span>{shipDetails.WIDTH}m</span></div>
                </div>
              </div>
            ) : (
              <>
                {/* Ship Status Section - Simplified */}
                <div className="sidebar-section-compact">
                  <div className="status-info-compact">
                    <div className="status-card">
                      <div className="status-icon ships">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.32-.42-.58-.5L20 10.62V6c0-1.1-.9-2-2-2h-3V3c0-.55-.45-1-1-1H10c-.55 0-1 .45-1 1v1H6c-1.1 0-2 .9-2 2v4.62l-1.29.42c-.26.08-.46.26-.58.5s-.14.52-.06.78L3.95 19zM6 6h12v3.97l-5.13 1.71c-.54.18-1.13.18-1.67 0L6 9.97V6z"/>
                        </svg>
                      </div>
                      <div className="status-details">
                        <div className="status-label">Ships</div>
                        <div className="status-value-large">{ships.length.toLocaleString()}</div>
                      </div>
                    </div>
                    
                    <div className="status-card">
                      <div className="status-icon source">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      </div>
                      <div className="status-details">
                        <div className="status-label">Source</div>
                        <div className={`status-value-large ${error ? "status-error" : "status-connected"}`}>
                          {error ? "Error" : "AIS Database"}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {loading && <div className="loading-indicator">Loading...</div>}
                  {error && !loading && <div className="error-indicator">{error}</div>}
                </div>

                {/* Grid Controls Section */}
                <div className="sidebar-section">
                  <h4>Grid Controls</h4>
                  <div className="grid-controls-professional">
                    <button
                      onClick={() => setShowGrid(!showGrid)}
                      className={`toggle-button-modern ${showGrid ? 'toggle-on' : 'toggle-off'}`}
                    >
                      <span className="toggle-text">Grid {showGrid ? 'ON' : 'OFF'}</span>
                    </button>
                    {showGrid && (
                      <div className="grid-step-control-modern">
                        <label>Step Size:</label>
                        <select
                          value={gridStep}
                          onChange={(e) => setGridStep(Number(e.target.value))}
                          className="grid-select-modern"
                        >
                          <option value={1}>1°</option>
                          <option value={2}>2°</option>
                          <option value={5}>5°</option>
                          <option value={10}>10°</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Legend Section - Side by Side Layout */}
                <div className="sidebar-section">
                  <h4>Ship Types</h4>
                  <div className="legend-grid">
                    <div className="legend-item-compact">
                      <span className="legend-dot-cargo">●</span>
                      <span>Cargo - Green</span>
                    </div>
                    <div className="legend-item-compact">
                      <span className="legend-dot-tanker">●</span>
                      <span>Tanker/Oil - Red</span>
                    </div>
                    <div className="legend-item-compact">
                      <span className="legend-dot-passenger">●</span>
                      <span>Passenger/Cruise - Orange</span>
                    </div>
                    <div className="legend-item-compact">
                      <span className="legend-dot-fishing">●</span>
                      <span>Fishing - Blue</span>
                    </div>
                    <div className="legend-item-compact">
                      <span className="legend-dot-tug">●</span>
                      <span>Service/Tug - Purple</span>
                    </div>
                    <div className="legend-item-compact">
                      <span className="legend-dot-military">●</span>
                      <span>Military/Naval - Dark Gray</span>
                    </div>
                    <div className="legend-item-compact">
                      <span className="legend-dot-other">●</span>
                      <span>Other - Gray</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
