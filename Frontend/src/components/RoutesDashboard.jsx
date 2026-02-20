import React, { useState } from 'react';
import Map from './Map';
import ShipProfile from "./ShipProfile";
import { getShipDetails, getShipRoute } from '../services/aisApi'; // Import API functions
import RouteGraph from './RouteGraph'; // Import the new graph component
import Welcome from './Welcome'; // Import the Welcome component

const RoutesDashboard = ({
  // Removed props: sidebarOpen, setSidebarOpen, setRefreshData, isRefreshing,
  // searchedShipDetails, searchedShipRoute, showShipProfile, showMapPopup, onShowMap, onCloseMapPopup, onSearchShip
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [shipDetails, setShipDetails] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [showShipProfile, setShowShipProfile] = useState(false);
  const [showMapPopup, setShowMapPopup] = useState(false);
  const [showGraphPopup, setShowGraphPopup] = useState(false); // New state for graph popup
  const [showAnomalyPopup, setShowAnomalyPopup] = useState(false); // New state for anomaly popup
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!searchTerm) {
      setError("Please enter an MMSI or Ship Name.");
      return;
    }

    setLoading(true);
    setError(null);
    setShipDetails(null);
    setRouteData(null);
    setShowShipProfile(false);
    setShowMapPopup(false);
    setShowGraphPopup(false); // Close graph popup on new search
    setShowAnomalyPopup(false); // Close anomaly popup on new search

    try {
      const isMMSI = /^[0-9]{7,9}$/.test(searchTerm);
      let fetchedShipDetails = null;
      let fetchedShipRoute = null;
      let mmsiForRoute = null;

      if (isMMSI) {
        fetchedShipDetails = await getShipDetails({ mmsi: searchTerm });
        mmsiForRoute = searchTerm;
      } else {
        // Attempt to search by ship name
        fetchedShipDetails = await getShipDetails({ shipName: searchTerm });
        // If ship details are found by name, try to get MMSI from it for route search
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
          setError("Route data is only available for MMSI searches or ships with known MMSI.");
          setRouteData(null);
        }
      } else {
        setError("Ship not found!");
      }
    } catch (err) {
      console.error("Error searching for ship:", err);
      setError(`Error searching for ship: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleShowMap = () => {
    setShowMapPopup(true);
  };

  const handleCloseMapPopup = () => {
    setShowMapPopup(false);
  };

  const handleShowGraph = () => { // New handler for graph
    setShowGraphPopup(true);
  };

  const handleCloseGraphPopup = () => { // New handler to close graph
    setShowGraphPopup(false);
  };

  const handleShowAnomaly = () => { // New handler for anomaly
    setShowAnomalyPopup(true);
  };

  const handleCloseAnomalyPopup = () => { // New handler to close anomaly
    setShowAnomalyPopup(false);
  };

  const getAnomalies = () => {
    if (!routeData || routeData.length === 0) {
      return [];
    }

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

  return (
    <div className="max-w-[1400px] mx-auto p-3 md:p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 min-h-screen text-slate-100 animate-fadeIn rounded-2xl border border-slate-800 shadow-2xl">
      <div className="relative mb-8 bg-slate-900/90 backdrop-blur border border-slate-700 shadow-xl rounded-2xl overflow-hidden">
        <div className="flex flex-col md:flex-row items-stretch">
        <input
          type="text"
          placeholder="Search by Ship Name or MMSI"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
          className="flex-grow p-4 text-base md:text-lg border-none outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-30 transition-all duration-300 ease-in-out bg-transparent text-slate-100 placeholder-slate-400 caret-blue-400"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
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
        <div className="mt-8 p-4 md:p-6 bg-slate-900/90 border border-slate-700 rounded-2xl shadow-xl animate-fadeInUp">
          <ShipProfile 
            shipDetails={shipDetails} 
            routeData={routeData} 
            onShowMap={handleShowMap} 
            onShowGraph={handleShowGraph} // Pass new handler to ShipProfile
            onShowAnomaly={handleShowAnomaly} // Pass new handler to ShipProfile
          />
        </div>
      )}

      {/* Map Pop-up Modal */}
      {showMapPopup && routeData && (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn p-2 md:p-4">
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-2xl w-full max-w-4xl h-[92vh] md:h-5/6 relative transform transition-all duration-300 ease-in-out scale-95 animate-scaleIn">
            <button
              onClick={handleCloseMapPopup}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-3xl font-bold transition-colors duration-200"
              aria-label="Close Map"
            >
              &times;
            </button>
            <h3 className="text-xl md:text-2xl font-extrabold mb-4 text-gray-800 border-b pb-2">Ship Route Map</h3>
            <div className="w-full h-[calc(100%-5rem)] rounded-lg overflow-hidden">
              <Map 
                routeData={routeData} 
                shipDetails={shipDetails} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Graph Pop-up Modal (New) */}
      {showGraphPopup && routeData && (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl h-[95vh] relative overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-xl">
              <h3 className="text-base md:text-xl font-bold flex items-center">
                <span className="material-icons mr-2">analytics</span>
                Ship Route Analytics Dashboard
              </h3>
              <button
                onClick={handleCloseGraphPopup}
                className="text-white hover:text-gray-300 text-2xl font-bold transition-colors duration-200 p-1 hover:bg-white hover:bg-opacity-20 rounded"
                aria-label="Close Graph"
              >
                &times;
              </button>
            </div>
            <div className="h-[calc(100%-4rem)] overflow-y-auto">
              <RouteGraph 
                routeData={routeData} 
                shipDetails={shipDetails} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Anomaly Pop-up Modal (New) */}
      {showAnomalyPopup && routeData && (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn p-2 md:p-4">
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-2xl w-full max-w-4xl h-[92vh] md:h-5/6 relative transform transition-all duration-300 ease-in-out scale-95 animate-scaleIn">
            <button
              onClick={handleCloseAnomalyPopup}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-3xl font-bold transition-colors duration-200"
              aria-label="Close Anomaly"
            >
              &times;
            </button>
            <h3 className="text-xl md:text-2xl font-extrabold mb-4 text-gray-800 border-b pb-2">Destination Change Anomalies</h3>
            <div className="w-full h-[calc(100%-5rem)] rounded-lg overflow-auto">
              {getAnomalies().length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From Destination</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To Destination</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getAnomalies().map((anomaly, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{new Date(anomaly.timestamp).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{anomaly.from || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{anomaly.to || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-center text-gray-600 p-8">No destination changes found in the available route history.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutesDashboard;
