import React, { useState, useEffect } from 'react';
import {
  getShips,
  getShipTypeTrends,
  getFishingSeasonality,
  getCommercialRatio,
  getMonthlyShipTotal,
  getArrivalInsights
} from '../services/aisApi';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const ApiDashboard = () => {
  const [stats, setStats] = useState({
    totalShips: 0,
    monthlyTotal: {
      ships_this_month: 0,
      total_ships_in_db: 0,
      total_records: 0,
      month: 'Loading...',
    },
    lastUpdate: null,
    shipTypes: [],
    fishingData: [],
    commercialRatio: [],
    arrivals: [],
    commercialShips: {},
    nonCommercialShips: {},
    loading: true,
    error: null
  });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshCountdown, setRefreshCountdown] = useState(120);
  const [typeFilter, setTypeFilter] = useState('');

  const fetchDashboardData = async () => {
    try {
      setStats((prev) => ({ ...prev, loading: true, error: null }));

      const [ships, trends, fishing, ratio, monthlyTotal, arrivals] = await Promise.allSettled([
        getShips({ limit: 100 }),
        getShipTypeTrends(),
        getFishingSeasonality(),
        getCommercialRatio(),
        getMonthlyShipTotal(),
        getArrivalInsights(8)
      ]);

      const shipsData = ships.status === 'fulfilled' ? ships.value : [];
      const shipTypesData = trends.status === 'fulfilled' ? trends.value || [] : [];
      const fishingData = fishing.status === 'fulfilled' ? fishing.value || [] : [];
      const ratioData = ratio.status === 'fulfilled' ? ratio.value || [] : [];
      const monthlyTotalData = monthlyTotal.status === 'fulfilled' ? monthlyTotal.value || {} : {};
      const arrivalsData = arrivals.status === 'fulfilled' ? arrivals.value || [] : [];

      const commercialTypes = ['Cargo', 'Tanker', 'Passenger'];
      const commercialShips = {};
      const nonCommercialShips = {};

      shipTypesData.forEach((item) => {
        const rawType = item.ship_type || 'Unknown';
        const shipType = rawType.charAt(0).toUpperCase() + rawType.slice(1).toLowerCase();
        const count = item.count || 0;

        if (commercialTypes.some((type) => shipType.toLowerCase().includes(type.toLowerCase()))) {
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
          ...monthlyTotalData
        },
        lastUpdate: new Date().toLocaleString(),
        shipTypes: shipTypesData,
        fishingData,
        commercialRatio: ratioData,
        arrivals: arrivalsData,
        commercialShips,
        nonCommercialShips,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Dashboard data fetch failed:', error);
      setStats((prev) => ({ ...prev, loading: false, error: error.message || 'Unknown error' }));
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [autoRefresh]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const tick = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          fetchDashboardData();
          return 120;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [autoRefresh]);

  const exportSnapshot = () => {
    const snapshot = {
      generated_at: new Date().toISOString(),
      totalShips: stats.totalShips,
      monthlyTotal: stats.monthlyTotal,
      topShipTypes: stats.shipTypes.slice(0, 10),
      topDestinations: stats.arrivals.slice(0, 10),
      commercialShips: stats.commercialShips,
      nonCommercialShips: stats.nonCommercialShips
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredShipTypes = stats.shipTypes.filter((item) =>
    (item.ship_type || 'Unknown').toLowerCase().includes(typeFilter.toLowerCase())
  );
  const shipTypeChartData = {
    labels: filteredShipTypes.slice(0, 8).map((item) => item.ship_type || 'Unknown'),
    datasets: [{
      data: filteredShipTypes.slice(0, 8).map((item) => item.count || 0),
      backgroundColor: ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9', '#14b8a6', '#f97316']
    }]
  };
  const healthScore = Math.min(
    100,
    Math.round(
      ((stats.totalShips > 0 ? 40 : 0) +
      (stats.monthlyTotal?.total_records > 1000 ? 30 : 10) +
      (stats.shipTypes.length > 4 ? 30 : 15))
    )
  );

  const commercialPieData = {
    labels: ['Commercial', 'Non-Commercial'],
    datasets: [{
      data: [
        Object.values(stats.commercialShips).reduce((sum, c) => sum + c, 0),
        Object.values(stats.nonCommercialShips).reduce((sum, c) => sum + c, 0),
      ],
      backgroundColor: ['#10b981', '#3b82f6']
    }]
  };

  const fishingBarData = {
    labels: (stats.fishingData || []).map((item) => `M${item.month}`),
    datasets: [{
      label: 'Fishing Vessels',
      data: (stats.fishingData || []).map((item) => item.fishing_vessels || 0),
      backgroundColor: '#0ea5e9'
    }]
  };
  const totalTypeCount = filteredShipTypes.reduce((sum, item) => sum + (item.count || 0), 0);
  const topType = filteredShipTypes[0];
  const topTypeShare = topType ? ((topType.count || 0) / Math.max(totalTypeCount, 1)) * 100 : 0;
  const operationalAlerts = [];
  if ((stats.monthlyTotal?.total_records || 0) < 5000) operationalAlerts.push("Low record volume detected for deep trend analysis.");
  if ((stats.arrivals || []).length < 5) operationalAlerts.push("Destination diversity is limited.");
  if (healthScore < 60) operationalAlerts.push("Data health score below 60%, investigate ingestion quality.");

  if (stats.loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-950 rounded-2xl border border-slate-800">
        <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto p-3 md:p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 min-h-screen text-slate-100 rounded-2xl border border-slate-800 shadow-2xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3">
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 animate-fadeInDown">AIS Dashboard</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${autoRefresh ? 'bg-emerald-600' : 'bg-slate-700'} text-white`}
          >
            Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}
          </button>
          <span className="text-xs text-slate-400">Next: {refreshCountdown}s</span>
          <button
            onClick={() => setTimeout(fetchDashboardData, 500)}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 transition duration-300 ease-in-out transform hover:scale-105"
          >
            Refresh Data
          </button>
          <button
            onClick={exportSnapshot}
            className="px-4 py-2.5 bg-violet-600 text-white rounded-xl shadow-md hover:bg-violet-700 transition"
          >
            Export Snapshot
          </button>
        </div>
      </div>

      {stats.error && (
        <div className="bg-red-950/40 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {stats.error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900/90 border border-slate-700 p-5 rounded-2xl shadow-lg animate-fadeInUp">
          <p className="text-slate-400 text-sm">Ships in View</p>
          <p className="text-3xl font-bold text-slate-100">{(stats.totalShips || 0).toLocaleString()}</p>
        </div>
        <div className="bg-slate-900/90 border border-slate-700 p-5 rounded-2xl shadow-lg animate-fadeInUp">
          <p className="text-slate-400 text-sm">Ships This Month</p>
          <p className="text-3xl font-bold text-slate-100">{(stats.monthlyTotal?.ships_this_month || 0).toLocaleString()}</p>
        </div>
        <div className="bg-slate-900/90 border border-slate-700 p-5 rounded-2xl shadow-lg animate-fadeInUp">
          <p className="text-slate-400 text-sm">Total Ships in DB</p>
          <p className="text-3xl font-bold text-slate-100">{(stats.monthlyTotal?.total_ships_in_db || 0).toLocaleString()}</p>
        </div>
        <div className="bg-slate-900/90 border border-slate-700 p-5 rounded-2xl shadow-lg animate-fadeInUp">
          <p className="text-slate-400 text-sm">Total AIS Records</p>
          <p className="text-3xl font-bold text-slate-100">{(stats.monthlyTotal?.total_records || 0).toLocaleString()}</p>
        </div>
        <div className="bg-slate-900/90 border border-slate-700 p-5 rounded-2xl shadow-lg animate-fadeInUp">
          <p className="text-slate-400 text-sm">Data Health Score</p>
          <p className="text-3xl font-bold text-cyan-300">{healthScore}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="bg-slate-900/90 border border-slate-700 p-4 md:p-6 rounded-2xl shadow-xl animate-fadeInUp">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-bold text-slate-100">Ship Type Distribution</h3>
            <input
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              placeholder="Filter type"
              className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-100"
            />
          </div>
          <div className="h-72"><Pie data={shipTypeChartData} options={{ responsive: true, maintainAspectRatio: false }} /></div>
        </div>

        <div className="bg-slate-900/90 border border-slate-700 p-4 md:p-6 rounded-2xl shadow-xl animate-fadeInUp">
          <h3 className="text-lg font-bold text-slate-100 mb-4">Commercial Split</h3>
          <div className="h-72"><Doughnut data={commercialPieData} options={{ responsive: true, maintainAspectRatio: false }} /></div>
        </div>

        <div className="bg-slate-900/90 border border-slate-700 p-4 md:p-6 rounded-2xl shadow-xl animate-fadeInUp">
          <h3 className="text-lg font-bold text-slate-100 mb-4">Fishing Seasonality</h3>
          <div className="h-72"><Bar data={fishingBarData} options={{ responsive: true, maintainAspectRatio: false }} /></div>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="bg-slate-900/90 border border-slate-700 rounded-2xl p-4 md:p-6 shadow-xl animate-fadeInUp">
          <h3 className="text-lg font-bold text-slate-100 mb-3">Top Ship Types Ranking</h3>
          <div className="space-y-2">
            {filteredShipTypes.slice(0, 8).map((item, idx) => {
              const pct = ((item.count || 0) / Math.max(totalTypeCount, 1)) * 100;
              return (
                <div key={`${item.ship_type}-${idx}`} className="bg-slate-800/70 border border-slate-700 rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-200 truncate pr-3">{idx + 1}. {item.ship_type || 'Unknown'}</span>
                    <span className="text-cyan-300 font-semibold">{(item.count || 0).toLocaleString()}</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded bg-slate-700">
                    <div className="h-1.5 rounded bg-cyan-400" style={{ width: `${Math.min(100, pct)}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
          {topType && (
            <p className="mt-3 text-xs text-slate-400">
              Dominant type: <span className="text-slate-200 font-semibold">{topType.ship_type}</span> ({topTypeShare.toFixed(1)}%)
            </p>
          )}
        </div>
        <div className="bg-slate-900/90 border border-slate-700 rounded-2xl p-4 md:p-6 shadow-xl animate-fadeInUp">
          <h3 className="text-lg font-bold text-slate-100 mb-3">Operational Alerts</h3>
          {operationalAlerts.length === 0 ? (
            <div className="bg-emerald-950/35 border border-emerald-700 rounded-lg p-3 text-emerald-200 text-sm">
              All core monitoring indicators are healthy.
            </div>
          ) : (
            <div className="space-y-2">
              {operationalAlerts.map((alert, idx) => (
                <div key={idx} className="bg-amber-950/35 border border-amber-700 rounded-lg p-3 text-amber-200 text-sm">
                  {alert}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="mt-6 bg-slate-900/90 border border-slate-700 rounded-2xl p-4 md:p-6 shadow-xl animate-fadeInUp">
        <h3 className="text-lg font-bold text-slate-100 mb-3">Top Destinations (Arrivals)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {(stats.arrivals || []).slice(0, 8).map((row, idx) => (
            <div key={idx} className="flex items-center justify-between bg-slate-800/70 border border-slate-700 rounded-lg px-3 py-2">
              <span className="text-slate-200 text-sm truncate pr-3">{row.destination || 'Unknown'}</span>
              <span className="text-cyan-300 font-semibold text-sm">{(row.active_ships || 0).toLocaleString()} active</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">Values show latest active ships by destination from live backend data.</p>
      </div>

      <div className="text-center text-slate-400 text-sm mt-8">Last updated: {stats.lastUpdate}</div>
    </div>
  );
};

export default ApiDashboard;
