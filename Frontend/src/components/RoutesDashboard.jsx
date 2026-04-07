import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Map from './Map';
import ShipProfile from './ShipProfile';
import { getShipDetails, getShipRoute, getShipSuggestions } from '../services/aisApi';
import RouteGraph from './RouteGraph';
import RoutePlaybackMap from './RoutePlaybackMap';
import Welcome from './Welcome';

const RoutesDashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [shipDetails, setShipDetails] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [showShipProfile, setShowShipProfile] = useState(false);
  const [showMapPopup, setShowMapPopup] = useState(false);
  const [showGraphPopup, setShowGraphPopup] = useState(false);
  const [showAnomalyPopup, setShowAnomalyPopup] = useState(false);
  const [showTrackPopup, setShowTrackPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);

  useEffect(() => {
    const query = searchTerm.trim();
    if (query.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSuggestLoading(true);
        const rows = await getShipSuggestions({ q: query, limit: 6 });
        setSuggestions(Array.isArray(rows) ? rows : []);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestLoading(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError('Please enter an MMSI or Ship Name.');
      return;
    }

    setLoading(true);
    setError(null);
    setShipDetails(null);
    setRouteData(null);
    setShowShipProfile(false);
    setShowMapPopup(false);
    setShowGraphPopup(false);
    setShowAnomalyPopup(false);
    setShowTrackPopup(false);
    setShowSuggestions(false);

    try {
      const term = searchTerm.trim();
      const isMMSI = /^[0-9]{7,9}$/.test(term);
      let fetchedShipDetails = null;
      let fetchedShipRoute = null;
      let mmsiForRoute = null;

      if (isMMSI) {
        fetchedShipDetails = await getShipDetails({ mmsi: term });
        mmsiForRoute = term;
      } else {
        fetchedShipDetails = await getShipDetails({ shipName: term });
        if (fetchedShipDetails && fetchedShipDetails.MMSI) {
          mmsiForRoute = fetchedShipDetails.MMSI;
        }
      }

      if (fetchedShipDetails) {
        setShipDetails(fetchedShipDetails);
        setShowShipProfile(true);

        if (mmsiForRoute) {
          fetchedShipRoute = await getShipRoute({ mmsi: mmsiForRoute });
          setRouteData(fetchedShipRoute);
        } else {
          setError('Route data is only available for MMSI searches or ships with known MMSI.');
          setRouteData(null);
        }
      } else {
        setError('Ship not found!');
      }
    } catch (err) {
      console.error('Error searching for ship:', err);
      setError(`Error searching for ship: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleShowMap = () => setShowMapPopup(true);
  const handleCloseMapPopup = () => setShowMapPopup(false);

  const handleShowGraph = () => setShowGraphPopup(true);
  const handleCloseGraphPopup = () => setShowGraphPopup(false);

  const handleShowAnomaly = () => setShowAnomalyPopup(true);
  const handleCloseAnomalyPopup = () => setShowAnomalyPopup(false);
  const handleShowTrack = () => setShowTrackPopup(true);
  const handleCloseTrackPopup = () => setShowTrackPopup(false);

  const getAnomalies = () => {
    if (!routeData || routeData.length === 0) return [];

    const anomalies = [];
    let lastDestination = routeData[0].destination;

    for (let i = 1; i < routeData.length; i++) {
      if (routeData[i].destination !== lastDestination) {
        anomalies.push({
          timestamp: routeData[i].timestamp,
          from: lastDestination,
          to: routeData[i].destination,
        });
        lastDestination = routeData[i].destination;
      }
    }

    return anomalies;
  };

  const getRouteDistanceKm = () => {
    if (!routeData || routeData.length < 2) return 0;
    const R = 6371;
    let total = 0;
    for (let i = 1; i < routeData.length; i++) {
      const p1 = routeData[i - 1];
      const p2 = routeData[i];
      const lat1 = (Number(p1.lat) * Math.PI) / 180;
      const lat2 = (Number(p2.lat) * Math.PI) / 180;
      const dLat = ((Number(p2.lat) - Number(p1.lat)) * Math.PI) / 180;
      const dLon = ((Number(p2.lon) - Number(p1.lon)) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      total += R * c;
    }
    return total;
  };

  const getAvgSpeed = () => {
    if (!routeData || routeData.length === 0) return 0;
    const total = routeData.reduce((sum, p) => sum + (Number(p.sog) || 0), 0);
    return total / Math.max(routeData.length, 1);
  };

  return (
    <div className="max-w-[1400px] mx-auto p-3 md:p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 min-h-screen text-slate-100 animate-fadeIn rounded-2xl border border-slate-800 shadow-2xl font-sans">
      <div className="relative mb-8 bg-slate-900/90 backdrop-blur border border-slate-700 shadow-xl rounded-2xl overflow-visible">
        <div className="flex flex-col md:flex-row items-stretch">
          <input
            type="text"
            placeholder="Search by Ship Name or MMSI"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setShowSuggestions(false);
                handleSearch();
              }
            }}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            className="flex-grow p-4 text-base md:text-lg border-none outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-30 transition-all duration-300 ease-in-out bg-transparent text-slate-100 placeholder-slate-400 caret-blue-400"
          />

          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSuggestions([]);
                setShowSuggestions(false);
              }}
              className="absolute right-4 md:right-32 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-100 transition-colors duration-200 p-2 text-2xl"
              aria-label="Clear search"
            >
              &times;
            </button>
          )}

          <button
            onClick={handleSearch}
            className={`px-8 py-4 text-base md:text-lg font-bold text-white transition-all duration-300 ease-in-out md:transform md:hover:scale-105
              ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'}
              ${loading ? 'animate-pulse' : ''}
            `}
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {showSuggestions && (
          <div className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-40 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
            {suggestLoading ? (
              <div className="px-4 py-3 text-sm text-slate-400">Loading suggestions...</div>
            ) : suggestions.length > 0 ? (
              <ul className="max-h-72 overflow-y-auto">
                {suggestions.map((item) => (
                  <li key={`${item.mmsi}-${item.ship_name}`}>
                    <button
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-slate-800 transition border-b border-slate-800 last:border-b-0"
                      onClick={() => {
                        setSearchTerm(item.ship_name || item.mmsi);
                        setShowSuggestions(false);
                      }}
                    >
                      <div className="text-slate-100 text-sm font-medium">{item.ship_name}</div>
                      <div className="text-slate-400 text-xs">MMSI: {item.mmsi}</div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-3 text-sm text-slate-500">No matches found.</div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-500 text-red-200 px-4 py-3 rounded relative mb-6 animate-shake" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center min-h-[100px] bg-slate-900 mb-6 rounded-xl border border-slate-700">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
        </div>
      )}

      {!loading && !shipDetails && !error && <Welcome />}

      {showShipProfile && shipDetails && (
        <div className="mt-8 p-3 md:p-5 bg-slate-900/90 border border-slate-700 rounded-2xl shadow-xl animate-fadeInUp">
          <ShipProfile
            shipDetails={shipDetails}
            routeData={routeData}
            onShowMap={handleShowMap}
            onShowGraph={handleShowGraph}
            onShowAnomaly={handleShowAnomaly}
            onShowTrack={handleShowTrack}
          />
        </div>
      )}

      {showMapPopup && routeData && createPortal((
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm animate-fadeIn" onClick={handleCloseMapPopup}>
          <div className="absolute top-0 right-0 h-screen w-full md:w-[96vw] lg:w-[86vw] bg-slate-900 border-l border-slate-700 shadow-2xl animate-slideInRight" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleCloseMapPopup}
              className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors duration-200"
              aria-label="Close Map"
            >
              Close
            </button>
            <div className="h-full p-4 md:p-6 flex flex-col">
              <div className="mb-4 rounded-2xl border border-slate-700 bg-gradient-to-r from-slate-900 via-blue-950/50 to-cyan-950/40 p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h3 className="text-xl md:text-2xl font-extrabold text-slate-100">Ship Route Map</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      {shipDetails?.SHIP_NAME || shipDetails?.NAME || 'Selected Ship'} • Route intelligence view
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full text-xs border border-emerald-700 bg-emerald-950/40 text-emerald-300">Start</span>
                    <span className="px-3 py-1 rounded-full text-xs border border-sky-700 bg-sky-950/40 text-sky-300">Track</span>
                    <span className="px-3 py-1 rounded-full text-xs border border-rose-700 bg-rose-950/40 text-rose-300">End</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
                    <p className="text-xs text-slate-400">Track Points</p>
                    <p className="text-lg font-bold text-slate-100">{routeData.length}</p>
                  </div>
                  <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
                    <p className="text-xs text-slate-400">Distance</p>
                    <p className="text-lg font-bold text-cyan-300">{getRouteDistanceKm().toFixed(1)} km</p>
                  </div>
                  <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
                    <p className="text-xs text-slate-400">Avg Speed</p>
                    <p className="text-lg font-bold text-emerald-300">{getAvgSpeed().toFixed(1)} kn</p>
                  </div>
                  <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
                    <p className="text-xs text-slate-400">Latest Timestamp</p>
                    <p className="text-sm font-semibold text-slate-200 truncate">
                      {routeData[routeData.length - 1]?.timestamp ? new Date(routeData[routeData.length - 1].timestamp).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="w-full flex-1 min-h-[320px] rounded-2xl overflow-hidden border border-slate-700 shadow-[0_0_40px_rgba(34,211,238,0.10)]">
                <Map routeData={routeData} shipDetails={shipDetails} />
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {showGraphPopup && routeData && createPortal((
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm animate-fadeIn" onClick={handleCloseGraphPopup}>
          <div className="absolute top-0 right-0 h-screen w-full md:w-[96vw] lg:w-[86vw] bg-slate-900 border-l border-slate-700 shadow-2xl animate-slideInRight overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-violet-600 text-white border-b border-slate-700">
              <h3 className="text-base md:text-xl font-bold flex items-center">
                <span className="material-icons mr-2">analytics</span>
                Ship Route Analytics Dashboard
              </h3>
              <button
                onClick={handleCloseGraphPopup}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors duration-200"
                aria-label="Close Graph"
              >
                Close
              </button>
            </div>
            <div className="h-[calc(100%-4rem)] overflow-y-auto bg-slate-950">
              <RouteGraph routeData={routeData} shipDetails={shipDetails} />
            </div>
          </div>
        </div>
      ), document.body)}

      {showAnomalyPopup && routeData && createPortal((
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm animate-fadeIn" onClick={handleCloseAnomalyPopup}>
          <div className="absolute top-0 right-0 h-screen w-full md:w-[96vw] lg:w-[86vw] bg-slate-900 border-l border-slate-700 shadow-2xl animate-slideInRight" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleCloseAnomalyPopup}
              className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors duration-200"
              aria-label="Close Anomaly"
            >
              Close
            </button>
            <div className="h-full p-4 md:p-6">
              <h3 className="text-xl md:text-2xl font-extrabold mb-4 text-slate-100 border-b border-slate-700 pb-2">Destination Change Anomalies</h3>
              <div className="w-full h-[calc(100%-4.5rem)] rounded-xl border border-slate-700 overflow-auto bg-slate-950/40">
                {getAnomalies().length > 0 ? (
                  <table className="min-w-full divide-y divide-slate-700">
                    <thead className="bg-slate-800/70">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Timestamp</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">From Destination</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">To Destination</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {getAnomalies().map((anomaly, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-slate-900/40 hover:bg-slate-800/60' : 'bg-slate-900/10 hover:bg-slate-800/50'}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-100">{new Date(anomaly.timestamp).toLocaleString()}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">{anomaly.from || 'N/A'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">{anomaly.to || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-center text-slate-400 p-8">No destination changes found in the available route history.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {showTrackPopup && routeData && createPortal((
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm animate-fadeIn" onClick={handleCloseTrackPopup}>
          <div className="absolute top-0 right-0 h-screen w-full md:w-[96vw] lg:w-[86vw] bg-slate-900 border-l border-slate-700 shadow-2xl animate-slideInRight overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleCloseTrackPopup}
              className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors duration-200"
              aria-label="Close Track"
            >
              Close
            </button>
            <div className="h-full p-4 md:p-6">
              <h3 className="text-xl md:text-2xl font-extrabold mb-4 text-slate-100 border-b border-slate-700 pb-2">
                Ship Track Playback
              </h3>
              <div className="h-[calc(100%-4.5rem)] rounded-2xl border border-slate-700 overflow-hidden shadow-[0_0_35px_rgba(34,211,238,0.12)]">
                <RoutePlaybackMap
                  routeData={routeData}
                  shipName={shipDetails?.SHIP_NAME || shipDetails?.NAME || searchTerm}
                />
              </div>
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
};

export default RoutesDashboard;
