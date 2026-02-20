import React from 'react';

const ShipProfile = ({ shipDetails, routeData, onShowMap, onShowGraph, onShowAnomaly }) => {
  if (!shipDetails) {
    return <div className="p-6 text-center text-gray-600">No ship data available. Search for a ship to view its profile.</div>;
  }

  return (
    <div className="p-6 bg-white shadow-md rounded-lg text-gray-900">
      <h2 className="text-3xl font-extrabold mb-6 text-gray-800 border-b pb-3">{shipDetails.SHIP_NAME || 'Unknown Ship'}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="info-card bg-gray-50 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 flex items-center">
          <span className="material-icons text-blue-500 mr-3">tag</span>
          <div>
            <span className="font-semibold text-gray-700 block text-sm">MMSI:</span>
            <span className="text-gray-900 font-medium">{shipDetails.MMSI}</span>
          </div>
        </div>
        <div className="info-card bg-gray-50 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 flex items-center">
          <span className="material-icons text-green-500 mr-3">directions_boat</span>
          <div>
            <span className="font-semibold text-gray-700 block text-sm">Ship Type:</span>
            <span className="text-gray-900 font-medium">{shipDetails.SHIP_TYPE}</span>
          </div>
        </div>
        <div className="info-card bg-gray-50 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 flex items-center">
          <span className="material-icons text-red-500 mr-3">location_on</span>
          <div>
            <span className="font-semibold text-gray-700 block text-sm">Latitude:</span>
            <span className="text-gray-900 font-medium">{shipDetails.LATITUDE?.toFixed(4)}°</span>
          </div>
        </div>
        <div className="info-card bg-gray-50 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 flex items-center">
          <span className="material-icons text-red-500 mr-3">location_on</span>
          <div>
            <span className="font-semibold text-gray-700 block text-sm">Longitude:</span>
            <span className="text-gray-900 font-medium">{shipDetails.LONGITUDE?.toFixed(4)}°</span>
          </div>
        </div>
        <div className="info-card bg-gray-50 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 flex items-center">
          <span className="material-icons text-purple-500 mr-3">speed</span>
          <div>
            <span className="font-semibold text-gray-700 block text-sm">Speed (SOG):</span>
            <span className="text-gray-900 font-medium">{shipDetails.SOG?.toFixed(1)} knots</span>
          </div>
        </div>
        <div className="info-card bg-gray-50 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 flex items-center">
          <span className="material-icons text-yellow-500 mr-3">explore</span>
          <div>
            <span className="font-semibold text-gray-700 block text-sm">Course (COG):</span>
            <span className="text-gray-900 font-medium">{shipDetails.COG?.toFixed(0)}°</span>
          </div>
        </div>
        <div className="info-card bg-gray-50 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 flex items-center">
          <span className="material-icons text-indigo-500 mr-3">navigation</span>
          <div>
            <span className="font-semibold text-gray-700 block text-sm">Heading:</span>
            <span className="text-gray-900 font-medium">{shipDetails.HEADING?.toFixed(0)}°</span>
          </div>
        </div>
        <div className="info-card bg-gray-50 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 flex items-center">
          <span className="material-icons text-teal-500 mr-3">flag</span>
          <div>
            <span className="font-semibold text-gray-700 block text-sm">Destination:</span>
            <span className="text-gray-900 font-medium">{shipDetails.DESTINATION}</span>
          </div>
        </div>
        <div className="info-card bg-gray-50 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 flex items-center">
          <span className="material-icons text-orange-500 mr-3">access_time</span>
          <div>
            <span className="font-semibold text-gray-700 block text-sm">ETA:</span>
            <span className="text-gray-900 font-medium">{shipDetails.ETA}</span>
          </div>
        </div>
        <div className="info-card bg-gray-50 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 flex items-center">
          <span className="material-icons text-cyan-500 mr-3">straighten</span>
          <div>
            <span className="font-semibold text-gray-700 block text-sm">Dimensions:</span>
            <span className="text-gray-900 font-medium">{shipDetails.LENGTH}m x {shipDetails.WIDTH}m</span>
          </div>
        </div>
        <div className="info-card bg-gray-50 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 flex items-center">
          <span className="material-icons text-pink-500 mr-3">waves</span>
          <div>
            <span className="font-semibold text-gray-700 block text-sm">Draught:</span>
            <span className="text-gray-900 font-medium">{shipDetails.DRAUGHT?.toFixed(1)}m</span>
          </div>
        </div>
        <div className="info-card bg-gray-50 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 flex items-center">
          <span className="material-icons text-gray-500 mr-3">update</span>
          <div>
            <span className="font-semibold text-gray-700 block text-sm">Last Update:</span>
            <span className="text-gray-900 font-medium">{new Date(shipDetails.LAST_UPDATE).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Action buttons between ship details and route history */}
      <div className="flex justify-center mb-8 space-x-6">
        <button
          onClick={onShowMap}
          className="flex items-center px-8 py-3 bg-blue-600 text-white font-bold rounded-full shadow-lg hover:bg-blue-700 transform hover:scale-105 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
        >
          <span className="material-icons mr-2">map</span> Show Map
        </button>
        {routeData && routeData.length > 0 && (
          <button
            onClick={onShowGraph}
            className="flex items-center px-8 py-3 bg-green-600 text-white font-bold rounded-full shadow-lg hover:bg-green-700 transform hover:scale-105 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75"
        >
            <span className="material-icons mr-2">bar_chart</span> Show Graph
          </button>
        )}
        {routeData && routeData.length > 0 && (
          <button
            onClick={onShowAnomaly}
            className="flex items-center px-8 py-3 bg-red-600 text-white font-bold rounded-full shadow-lg hover:bg-red-700 transform hover:scale-105 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75"
          >
            <span className="material-icons mr-2">error</span> Show Anomaly
          </button>
        )}
      </div>

      <h3 className="text-2xl font-extrabold mb-4 text-gray-800 border-b pb-2">Route History</h3>
      {routeData && routeData.length > 0 ? (
        <div className="overflow-x-auto bg-white rounded-lg shadow-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Latitude</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Longitude</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Speed (knots)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {routeData.map((point, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{new Date(point.timestamp).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{point.lat?.toFixed(4)}°</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{point.lon?.toFixed(4)}°</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{point.sog?.toFixed(1) || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{point.destination || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-600 p-4 bg-gray-50 rounded-lg shadow-sm">No route history available for this ship.</p>
      )}
    </div>
  );
};

export default ShipProfile;