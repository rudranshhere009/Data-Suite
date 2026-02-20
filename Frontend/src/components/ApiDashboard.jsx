import { useState, useEffect } from 'react';
import { 
  getShips, 
  getShipTypeTrends, 
  getFishingSeasonality,
  getCommercialRatio,
  getMonthlyShipTotal
} from '../services/aisApi';

const ApiDashboard = () => {
  const [stats, setStats] = useState({
    totalShips: 0,
    monthlyTotal: { 
      ships_this_month: 0, 
      total_ships_in_db: 0, 
      total_records: 0,
      month: 'Loading...', 
      timestamp: null 
    },
    lastUpdate: null,
    shipTypes: [],
    fishingData: [],
    commercialRatio: [],
    commercialShips: {},
    nonCommercialShips: {},
    loading: true,
    error: null
  });

  const fetchDashboardData = async () => {
    try {
      setStats(prev => ({ ...prev, loading: true, error: null }));

      // Fetch all dashboard data in parallel
      const [ships, trends, fishing, ratio, monthlyTotal] = await Promise.allSettled([
        getShips({ limit: 100 }),
        getShipTypeTrends(),
        getFishingSeasonality(),
        getCommercialRatio(),
        getMonthlyShipTotal()
      ]);

      // Safe extraction
      const shipsData = ships.status === 'fulfilled' ? ships.value : [];
      const shipTypesData = trends.status === 'fulfilled' ? trends.value || [] : [];
      const fishingData = fishing.status === 'fulfilled' ? fishing.value || [] : [];
      const ratioData = ratio.status === 'fulfilled' ? ratio.value || [] : [];
      const monthlyTotalData = monthlyTotal.status === 'fulfilled' ? monthlyTotal.value || {} : {};

      // Process ship types into commercial and non-commercial categories
      const commercialTypes = ['Cargo', 'Tanker', 'Passenger'];
      const commercialShips = {};
      const nonCommercialShips = {};

      shipTypesData
        .filter(Boolean)
        .forEach(item => {
          // Normalize ship type: capitalize first letter, lowercase the rest
          let rawType = item.ship_type || 'Unknown';
          let shipType = rawType.charAt(0).toUpperCase() + rawType.slice(1).toLowerCase();
          const count = item.count || 0;

          if (commercialTypes.some(type => shipType.toLowerCase().includes(type.toLowerCase()))) {
            commercialShips[shipType] = (commercialShips[shipType] || 0) + count;
          } else {
            nonCommercialShips[shipType] = (nonCommercialShips[shipType] || 0) + count;
          }
        });

      setStats({
        totalShips: Array.isArray(shipsData) ? shipsData.length : (shipsData.total || 0),
        monthlyTotal: {
          ships_this_month: 0,
          total_ships_in_db: 0,
          total_records: 0,
          month: 'Unknown',
          timestamp: null,
          ...monthlyTotalData
        },
        lastUpdate: new Date().toLocaleString(),
        shipTypes: shipTypesData,
        fishingData,
        commercialRatio: ratioData,
        commercialShips,
        nonCommercialShips,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Dashboard data fetch failed:', error);
      setStats(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message || 'Unknown error' 
      }));
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (stats.loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-32 w-32 border-t-4 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen text-gray-900">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-extrabold text-gray-800">AIS Dashboard</h2>
        <button
          onClick={() => setTimeout(fetchDashboardData, 500)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition duration-300 ease-in-out transform hover:scale-105"
        >
          Refresh Data
        </button>
      </div>

      {stats.error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {stats.error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Total Ships */}
        <div className="bg-white p-6 rounded-xl shadow-lg transform transition duration-300 hover:scale-105">
          <h3 className="text-lg font-semibold text-blue-600 mb-2">Total Ships</h3>
          <p className="text-4xl font-bold text-gray-800">{(stats.totalShips || 0).toLocaleString()}</p>
        </div>

        {/* Ship Types */}
        <div className="bg-white p-6 rounded-xl shadow-lg transform transition duration-300 hover:scale-105">
          <h3 className="text-lg font-semibold text-purple-600 mb-2">Unique Ship Types</h3>
          <p className="text-4xl font-bold text-gray-800">{(stats.shipTypes || []).length}</p>
        </div>

        {/* Fishing Vessels */}
        <div className="bg-white p-6 rounded-xl shadow-lg transform transition duration-300 hover:scale-105">
          <h3 className="text-lg font-semibold text-orange-600 mb-2">Fishing Vessels</h3>
          <p className="text-4xl font-bold text-gray-800">
            {(stats.fishingData || []).reduce((sum, item) => sum + (item?.fishing_vessels || 0), 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-lg transform transition duration-300 hover:scale-105">
          <h3 className="text-lg font-semibold text-blue-600 mb-2">Total Ships in Database</h3>
          <p className="text-4xl font-bold text-gray-800">
            {(stats.monthlyTotal?.total_ships_in_db || 0).toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-1">Unique vessels tracked over time</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg transform transition duration-300 hover:scale-105">
          <h3 className="text-lg font-semibold text-purple-600 mb-2">Total AIS Records</h3>
          <p className="text-4xl font-bold text-gray-800">
            {(stats.monthlyTotal?.total_records || 0).toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-1">All recorded AIS positions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Ship Types */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Ship Types</h3>
          <div className="space-y-3">
            {(() => {
              const uniqueTypes = [];
              const seen = new Set();
              (stats.shipTypes || [])
                .filter(Boolean)
                .sort((a, b) => (b?.count || 0) - (a?.count || 0))
                .forEach(type => {
                  const name = type?.ship_type || 'Unknown';
                  if (!seen.has(name)) {
                    uniqueTypes.push(type);
                    seen.add(name);
                  }
                });
              return uniqueTypes.slice(0, 10).map((type, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                  <span className="text-gray-700 font-medium">{type?.ship_type || 'Unknown'}</span>
                  <span className="text-blue-600 font-bold">{(type?.count || 0).toLocaleString()}</span>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Commercial vs Non-Commercial */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Commercial vs Non-Commercial Vessels</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-lg font-semibold text-green-600 mb-3">Commercial Ships</h4>
              <div className="space-y-2">
                {Object.entries(stats.commercialShips || {})
                  .sort(([, a], [, b]) => (b || 0) - (a || 0))
                  .map(([shipType, count], index) => (
                    <div key={`commercial-${index}`} className="flex justify-between items-center">
                      <span className="text-gray-700">{shipType}</span>
                      <span className="text-green-600 font-bold">{(count || 0).toLocaleString()}</span>
                    </div>
                  ))}
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-red-600 mb-3">Non-Commercial Ships</h4>
              <div className="space-y-2">
                {(() => {
                  const entries = Object.entries(stats.nonCommercialShips || {})
                    .sort(([, a], [, b]) => (b || 0) - (a || 0));
                  return (entries.length > 0
                    ? entries.map(([shipType, count], index) => (
                        <div key={`non-commercial-${index}`} className="flex justify-between items-center">
                          <span className="text-gray-700">{shipType}</span>
                          <span className="text-red-600 font-bold">{(count || 0).toLocaleString()}</span>
                        </div>
                      ))
                    : <span className="text-gray-500">No non-commercial ships found.</span>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center text-gray-500 text-sm mt-8">
        Last updated: {stats.lastUpdate}
      </div>
    </div>
  );
};

export default ApiDashboard;
