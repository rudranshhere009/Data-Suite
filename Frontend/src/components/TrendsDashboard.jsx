import React, { useState, useEffect } from 'react';
import {
  getShipsPerDay,
  getAvgSpeedPerDay,
  getShipsPerHour,
  getAvgSpeedPerHour,
  getShipTypeTrends,
  getCommercialRatio,
  getMonthlyShipTotal,
  getArrivals,
  getShipTypesAtDestination
} from '../services/aisApi';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement,
  Filler
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import DestinationSearch from './DestinationSearch';
import { generateRandomColors } from '../utils/chartUtils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement,
  Filler
);

export default function TrendsDashboard() {
  const [shipsPerDay, setShipsPerDay] = useState([]);
  const [avgSpeedPerDay, setAvgSpeedPerDay] = useState([]);
  const [shipsPerHour, setShipsPerHour] = useState([]);
  const [avgSpeedPerHour, setAvgSpeedPerHour] = useState([]);
  const [shipTypeTrends, setShipTypeTrends] = useState([]);
  const [commercialRatio, setCommercialRatio] = useState([]);
  const [monthlyShipTotal, setMonthlyShipTotal] = useState(null);
  const [arrivals, setArrivals] = useState([]);
  const [shipTypesAtDestination, setShipTypesAtDestination] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [selectedDestination, setSelectedDestination] = useState('');
  const [timeScale, setTimeScale] = useState('daily');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        setLoading(true);
        const results = await Promise.allSettled([
          getShipsPerDay(),
          getAvgSpeedPerDay(),
          getShipsPerHour(),
          getAvgSpeedPerHour(),
          getShipTypeTrends(),
          getCommercialRatio(),
          getMonthlyShipTotal(),
          getArrivals(),
        ]);

        const [
          shipsPerDayRes,
          avgSpeedPerDayRes,
          shipsPerHourRes,
          avgSpeedPerHourRes,
          shipTypeTrendsRes,
          commercialRatioRes,
          monthlyShipTotalRes,
          arrivalsRes,
        ] = results;

        if (shipsPerDayRes.status === 'fulfilled') setShipsPerDay(shipsPerDayRes.value || []);
        if (avgSpeedPerDayRes.status === 'fulfilled') setAvgSpeedPerDay(avgSpeedPerDayRes.value || []);
        if (shipsPerHourRes.status === 'fulfilled') setShipsPerHour(shipsPerHourRes.value || []);
        if (avgSpeedPerHourRes.status === 'fulfilled') setAvgSpeedPerHour(avgSpeedPerHourRes.value || []);
        if (shipTypeTrendsRes.status === 'fulfilled') setShipTypeTrends(shipTypeTrendsRes.value || []);
        if (commercialRatioRes.status === 'fulfilled') setCommercialRatio(commercialRatioRes.value || []);
        if (monthlyShipTotalRes.status === 'fulfilled') setMonthlyShipTotal(monthlyShipTotalRes.value || null);
        if (arrivalsRes.status === 'fulfilled') {
          setArrivals(arrivalsRes.value || []);
          const uniqueDestinations = [...new Set((arrivalsRes.value || []).map((item) => item.destination))]
            .filter(Boolean)
            .map((destination) => ({ destination }));
          setDestinations(uniqueDestinations);
        }

        if (results.some((res) => res.status === 'rejected')) {
          setError('Some trend data failed to load. Check backend/API availability.');
        } else {
          setError(null);
        }
      } catch (err) {
        console.error('Failed to fetch trend data:', err);
        setError('Failed to load trend data. Please check the API connection.');
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
  }, []);

  const handleDestinationSelect = async (destination) => {
    setSelectedDestination(destination);
    if (!destination) {
      setShipTypesAtDestination([]);
      return;
    }
    setLoading(true);
    try {
      const data = await getShipTypesAtDestination(destination);
      setShipTypesAtDestination(data || []);
    } catch (err) {
      console.error('Failed to fetch ship types for destination:', err);
      setError('Failed to load ship types for selected destination.');
    } finally {
      setLoading(false);
    }
  };

  const getChartOptions = (titleText) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: titleText },
    },
  });

  const getShipsChartData = () => ({
    labels: timeScale === 'daily' ? shipsPerDay.map((d) => d.day) : shipsPerHour.map((d) => d.hour),
    datasets: [{
      label: 'Unique Ships',
      data: timeScale === 'daily' ? shipsPerDay.map((d) => d.ships) : shipsPerHour.map((d) => d.ships),
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37,99,235,0.2)',
      fill: true,
      tension: 0.35,
    }],
  });

  const getAvgSpeedChartData = () => ({
    labels: timeScale === 'daily' ? avgSpeedPerDay.map((d) => d.day) : avgSpeedPerHour.map((d) => d.hour),
    datasets: [{
      label: 'Average Speed (knots)',
      data: timeScale === 'daily' ? avgSpeedPerDay.map((d) => d.avg_speed) : avgSpeedPerHour.map((d) => d.avg_speed),
      borderColor: '#10b981',
      backgroundColor: 'rgba(16,185,129,0.2)',
      fill: true,
      tension: 0.35,
    }],
  });

  const getShipTypeTrendsChartData = () => {
    const aggregated = {};
    shipTypeTrends.forEach((i) => {
      aggregated[i.ship_type] = (aggregated[i.ship_type] || 0) + i.count;
    });
    const colors = generateRandomColors(Object.keys(aggregated).length);
    return {
      labels: Object.keys(aggregated),
      datasets: [{
        label: 'Total Vessels',
        data: Object.values(aggregated),
        backgroundColor: colors.map((c) => `${c}CC`),
        borderColor: colors.map((c) => `${c}FF`),
      }],
    };
  };

  const getCommercialRatioChartData = () => ({
    labels: commercialRatio.map((d) => d.month),
    datasets: [
      { label: 'Commercial', data: commercialRatio.map((d) => d.commercial), backgroundColor: '#f59e0be0' },
      { label: 'Non-Commercial', data: commercialRatio.map((d) => d.non_commercial), backgroundColor: '#3b82f6e0' },
    ],
  });

  const getArrivalsChartData = () => ({
    labels: arrivals.map((d) => d.destination),
    datasets: [{ label: 'Arrivals', data: arrivals.map((d) => d.arrivals), backgroundColor: '#ef4444d9' }],
  });

  const getShipTypesAtDestinationChartData = () => {
    const colors = generateRandomColors(shipTypesAtDestination.length);
    return {
      labels: shipTypesAtDestination.map((d) => d.ship_type),
      datasets: [{
        label: `Vessels at ${selectedDestination}`,
        data: shipTypesAtDestination.map((d) => d.count),
        backgroundColor: colors.map((c) => `${c}CC`),
        borderColor: colors.map((c) => `${c}FF`),
      }],
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-950 rounded-2xl border border-slate-800">
        <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-slate-950 min-h-screen text-slate-100 flex items-center justify-center rounded-2xl border border-slate-800">
        <div className="bg-red-950/40 border border-red-500 text-red-200 px-4 py-3 rounded relative animate-shake" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto p-3 md:p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 min-h-screen text-slate-100 rounded-2xl border border-slate-800 shadow-2xl">
      <h2 className="text-2xl md:text-3xl font-extrabold mb-6 md:mb-8 tracking-tight animate-fadeInDown">Trends Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-4 shadow-md animate-fadeInLeft">
          <p className="text-sm text-slate-400">Ships This Month</p>
          <p className="text-2xl font-extrabold text-slate-100">{(monthlyShipTotal?.ships_this_month || 0).toLocaleString()}</p>
        </div>
        <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-4 shadow-md animate-fadeInLeft">
          <p className="text-sm text-slate-400">Total Ships in DB</p>
          <p className="text-2xl font-extrabold text-slate-100">{(monthlyShipTotal?.total_ships_in_db || 0).toLocaleString()}</p>
        </div>
        <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-4 shadow-md animate-fadeInLeft">
          <p className="text-sm text-slate-400">Total Records</p>
          <p className="text-2xl font-extrabold text-slate-100">{(monthlyShipTotal?.total_records || 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="flex gap-3 md:gap-4 mb-6 md:mb-8 animate-fadeInLeft">
        <button
          onClick={() => setTimeScale('daily')}
          className={`px-5 py-2.5 rounded-xl shadow transition-all duration-300 ${timeScale === 'daily' ? 'bg-blue-600 text-white scale-105' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
        >
          Daily
        </button>
        <button
          onClick={() => setTimeScale('hourly')}
          className={`px-5 py-2.5 rounded-xl shadow transition-all duration-300 ${timeScale === 'hourly' ? 'bg-blue-600 text-white scale-105' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
        >
          Hourly
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
        <div className="bg-slate-900/90 border border-slate-700 p-4 md:p-6 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 animate-fadeInUp">
          <Line data={getShipsChartData()} options={getChartOptions('Unique Ships Over Time')} height={300} />
        </div>

        <div className="bg-slate-900/90 border border-slate-700 p-4 md:p-6 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 animate-fadeInUp">
          <Line data={getAvgSpeedChartData()} options={getChartOptions('Average Speed Over Time')} height={300} />
        </div>

        <div className="bg-slate-900/90 border border-slate-700 p-4 md:p-6 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 animate-fadeInUp">
          <Pie data={getShipTypeTrendsChartData()} options={getChartOptions('Ship Type Distribution')} height={300} />
        </div>

        <div className="bg-slate-900/90 border border-slate-700 p-4 md:p-6 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 animate-fadeInUp">
          <Bar data={getCommercialRatioChartData()} options={getChartOptions('Commercial vs Non-Commercial')} height={300} />
        </div>

        <div className="bg-slate-900/90 border border-slate-700 p-4 md:p-6 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 animate-fadeInUp">
          <div className="h-80">
            <Bar data={getArrivalsChartData()} options={getChartOptions('Arrivals by Destination')} />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-700 p-4 md:p-6 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 animate-fadeInUp">
          <DestinationSearch destinations={destinations} onDestinationSelect={handleDestinationSelect} />
          {selectedDestination && shipTypesAtDestination.length > 0 && (
            <div className="h-80 mt-4">
              <Pie
                data={getShipTypesAtDestinationChartData()}
                options={getChartOptions(`Ship Types at ${selectedDestination}`)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
