import React, { useMemo, useState } from 'react';

const ShipProfile = ({ shipDetails, routeData, onShowMap, onShowGraph, onShowAnomaly }) => {
  const [showAllRoutes, setShowAllRoutes] = useState(false);
  const latestVisibleCount = 5;

  if (!shipDetails) {
    return <div className="p-6 text-center text-slate-400">No ship data available. Search for a ship to view its profile.</div>;
  }

  const normalizedRoutes = useMemo(() => {
    if (!routeData || routeData.length === 0) return [];
    return [...routeData].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [routeData]);

  const visibleRoutes = showAllRoutes ? normalizedRoutes : normalizedRoutes.slice(0, latestVisibleCount);
  const hasMoreRoutes = normalizedRoutes.length > latestVisibleCount;

  const formatNumber = (value, digits = 1) => (
    value === null || value === undefined || Number.isNaN(Number(value)) ? 'N/A' : Number(value).toFixed(digits)
  );

  const infoCards = [
    { label: 'MMSI', value: shipDetails.MMSI, icon: 'tag', color: 'text-blue-400' },
    { label: 'Ship Type', value: shipDetails.SHIP_TYPE || 'N/A', icon: 'directions_boat', color: 'text-emerald-400' },
    { label: 'Latitude', value: `${formatNumber(shipDetails.LATITUDE, 4)}°`, icon: 'location_on', color: 'text-rose-400' },
    { label: 'Longitude', value: `${formatNumber(shipDetails.LONGITUDE, 4)}°`, icon: 'location_on', color: 'text-rose-400' },
    { label: 'Speed (SOG)', value: `${formatNumber(shipDetails.SOG, 1)} knots`, icon: 'speed', color: 'text-fuchsia-400' },
    { label: 'Course (COG)', value: `${formatNumber(shipDetails.COG, 0)}°`, icon: 'explore', color: 'text-amber-400' },
    { label: 'Heading', value: `${formatNumber(shipDetails.HEADING, 0)}°`, icon: 'navigation', color: 'text-indigo-400' },
    { label: 'Destination', value: shipDetails.DESTINATION || 'N/A', icon: 'flag', color: 'text-teal-400' },
    { label: 'ETA', value: shipDetails.ETA || 'N/A', icon: 'access_time', color: 'text-orange-400' },
    { label: 'Dimensions', value: `${shipDetails.LENGTH || 'N/A'}m x ${shipDetails.WIDTH || 'N/A'}m`, icon: 'straighten', color: 'text-cyan-400' },
    { label: 'Draught', value: `${formatNumber(shipDetails.DRAUGHT, 1)}m`, icon: 'waves', color: 'text-pink-400' },
    {
      label: 'Last Update',
      value: shipDetails.LAST_UPDATE ? new Date(shipDetails.LAST_UPDATE).toLocaleString() : 'N/A',
      icon: 'update',
      color: 'text-slate-400'
    },
  ];

  return (
    <div className="p-5 md:p-6 bg-slate-900/95 border border-slate-700 shadow-2xl rounded-2xl text-slate-100 font-sans">
      <h2 className="text-3xl font-extrabold mb-6 text-slate-100 border-b border-slate-700 pb-3">
        {shipDetails.SHIP_NAME || 'Unknown Ship'}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {infoCards.map((card) => (
          <div key={card.label} className="bg-slate-800/70 border border-slate-700 p-4 rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-200 flex items-center">
            <span className={`material-icons ${card.color} mr-3`}>{card.icon}</span>
            <div>
              <span className="font-semibold text-slate-400 block text-sm">{card.label}:</span>
              <span className="text-slate-100 font-medium">{card.value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap justify-center mb-8 gap-4">
        <button
          onClick={onShowMap}
          className="flex items-center px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-lg rounded-full shadow-lg hover:from-blue-500 hover:to-blue-400 transform hover:scale-105 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
        >
          <span className="material-icons mr-2">map</span> Show Map
        </button>
        {routeData && routeData.length > 0 && (
          <button
            onClick={onShowGraph}
            className="flex items-center px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-semibold text-lg rounded-full shadow-lg hover:from-emerald-500 hover:to-teal-400 transform hover:scale-105 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-75"
          >
            <span className="material-icons mr-2">bar_chart</span> Show Graph
          </button>
        )}
        {routeData && routeData.length > 0 && (
          <button
            onClick={onShowAnomaly}
            className="flex items-center px-8 py-3 bg-gradient-to-r from-red-600 to-rose-500 text-white font-semibold text-lg rounded-full shadow-lg hover:from-red-500 hover:to-rose-400 transform hover:scale-105 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75"
          >
            <span className="material-icons mr-2">error</span> Show Anomaly
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 mb-4 border-b border-slate-700 pb-2">
        <h3 className="text-2xl font-extrabold text-slate-100">Route History</h3>
        {hasMoreRoutes && (
          <button
            type="button"
            onClick={() => setShowAllRoutes((v) => !v)}
            className="px-3 py-1.5 text-xs md:text-sm rounded-lg bg-slate-800 border border-slate-600 text-slate-100 hover:bg-slate-700 transition"
          >
            {showAllRoutes ? 'Show Latest 5' : `Show All (${normalizedRoutes.length})`}
          </button>
        )}
      </div>

      {normalizedRoutes.length > 0 ? (
        <div className="overflow-x-auto bg-slate-950/40 border border-slate-700 rounded-xl shadow-lg">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-800/70">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Timestamp</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Latitude</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Longitude</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Speed (knots)</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Destination</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {visibleRoutes.map((point, index) => (
                <tr key={`${point.timestamp}-${index}`} className={index % 2 === 0 ? 'bg-slate-900/40 hover:bg-slate-800/60' : 'bg-slate-900/10 hover:bg-slate-800/50'}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-100">{new Date(point.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">{formatNumber(point.lat, 4)}°</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">{formatNumber(point.lon, 4)}°</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">{formatNumber(point.sog, 1)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">{point.destination || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-slate-400 p-4 bg-slate-800/40 border border-slate-700 rounded-lg shadow-sm">No route history available for this ship.</p>
      )}
    </div>
  );
};

export default ShipProfile;
