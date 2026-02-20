import React, { useState, useEffect } from 'react';
import {
  getShips,
  getShipTypeTrends,
  getFishingSeasonality,
  getCommercialRatio,
  getMonthlyShipTotal
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
    commercialShips: {},
    nonCommercialShips: {},
    loading: true,
    error: null
  });

  const fetchDashboardData = async () => {
    try {
      setStats((prev) => ({ ...prev, loading: true, error: null }));

      const [ships, trends, fishing, ratio, monthlyTotal] = await Promise.allSettled([
        getShips({ limit: 100 }),
        getShipTypeTrends(),
        getFishingSeasonality(),
        getCommercialRatio(),
        getMonthlyShipTotal()
      ]);

      const shipsData = ships.status === 'fulfilled' ? ships.value : [];
      const shipTypesData = trends.status === 'fulfilled' ? trends.value || [] : [];
      const fishingData = fishing.status === 'fulfilled' ? fishing.value || [] : [];
      const ratioData = ratio.status === 'fulfilled' ? ratio.value || [] : [];
      const monthlyTotalData = monthlyTotal.status === 'fulfilled' ? monthlyTotal.value || {} : {};

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
    const interval = setInterval(fetchDashboardData, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const shipTypeChartData = {
    labels: stats.shipTypes.slice(0, 8).map((item) => item.ship_type || 'Unknown'),
    datasets: [{
      data: stats.shipTypes.slice(0, 8).map((item) => item.count || 0),
      backgroundColor: ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9', '#14b8a6', '#f97316']
    }]
  };

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
        <button
          onClick={() => setTimeout(fetchDashboardData, 500)}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 transition duration-300 ease-in-out transform hover:scale-105"
        >
          Refresh Data
        </button>
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
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="bg-slate-900/90 border border-slate-700 p-4 md:p-6 rounded-2xl shadow-xl animate-fadeInUp">
          <h3 className="text-lg font-bold text-slate-100 mb-4">Ship Type Distribution</h3>
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

      <div className="text-center text-slate-400 text-sm mt-8">Last updated: {stats.lastUpdate}</div>
    </div>
  );
};

export default ApiDashboard;
