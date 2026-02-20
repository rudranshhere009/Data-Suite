import React, { useState } from "react";
import { getTrafficPrediction, getSpeedForecast } from "../services/aisApi";
import { getRiskByDatetime, getRiskByShip } from "../services/riskApi";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement);

const TrafficForecasting = () => {
  // State for risk by datetime
  const [riskShipName, setRiskShipName] = useState("");
  const [riskDate, setRiskDate] = useState("");
  const [riskTime, setRiskTime] = useState("");
  const [riskDatetimeResult, setRiskDatetimeResult] = useState(null);
  const [riskDatetimeLoading, setRiskDatetimeLoading] = useState(false);
  const [riskDatetimeError, setRiskDatetimeError] = useState(null);

  // State for risk by ship
  const [riskShipOnlyName, setRiskShipOnlyName] = useState("");
  const [riskShipResult, setRiskShipResult] = useState(null);
  const [riskShipLoading, setRiskShipLoading] = useState(false);
  const [riskShipError, setRiskShipError] = useState(null);

  // State for traffic prediction
  const [trafficDate, setTrafficDate] = useState("");
  const [trafficResult, setTrafficResult] = useState(null);
  const [trafficLoading, setTrafficLoading] = useState(false);
  const [trafficError, setTrafficError] = useState(null);

  // State for speed forecast
  const [speedDays, setSpeedDays] = useState("");
  const [speedMmsi, setSpeedMmsi] = useState("");
  const [speedResult, setSpeedResult] = useState(null);
  const [speedLoading, setSpeedLoading] = useState(false);
  const [speedError, setSpeedError] = useState(null);
  const today = new Date().toISOString().slice(0, 10);
  const inThreeDays = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const inSevenDays = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  // Fetch risk by datetime
  const fetchRiskByDatetime = async () => {
    setRiskDatetimeLoading(true);
    setRiskDatetimeError(null);
    try {
      if (!riskShipName || !riskDate || !riskTime) {
        setRiskDatetimeError("Please enter ship name, date, and time.");
        return;
      }
      const response = await getRiskByDatetime(riskShipName, riskDate, riskTime);
      setRiskDatetimeResult(response);
    } catch (error) {
      setRiskDatetimeError(error.message || "An error occurred");
    } finally {
      setRiskDatetimeLoading(false);
    }
  };

  // Fetch risk by ship
  const fetchRiskByShip = async () => {
    setRiskShipLoading(true);
    setRiskShipError(null);
    try {
      if (!riskShipOnlyName) {
        setRiskShipError("Please enter ship name.");
        return;
      }
      const response = await getRiskByShip(riskShipOnlyName);
      setRiskShipResult(response);
    } catch (error) {
      setRiskShipError(error.message || "An error occurred");
    } finally {
      setRiskShipLoading(false);
    }
  };

  // Fetch traffic prediction
  const fetchTrafficPrediction = async () => {
    setTrafficLoading(true);
    setTrafficError(null);
    try {
      const response = await getTrafficPrediction(trafficDate);
      setTrafficResult(response);
    } catch (error) {
      setTrafficError(error.message || "An error occurred");
    } finally {
      setTrafficLoading(false);
    }
  };

  // Fetch speed forecast
  const fetchSpeedForecast = async () => {
    setSpeedLoading(true);
    setSpeedError(null);
    try {
      const payload = {
        mmsi: speedMmsi,
        days_ahead: parseInt(speedDays)
      };
      const response = await getSpeedForecast(payload);
      setSpeedResult(response);
    } catch (error) {
      setSpeedError(error.message || "An error occurred");
    } finally {
      setSpeedLoading(false);
    }
  };

  // Chart data for traffic prediction (port-wise)
  const getTrafficChartData = () => {
    if (!trafficResult || !trafficResult.ships_at_ports) return { labels: [], datasets: [] };
    const ports = Object.keys(trafficResult.ships_at_ports);
    const counts = ports.map(port => trafficResult.ships_at_ports[port].reached || 0);
    return {
      labels: ports,
      datasets: [{
        label: 'Ships at Port',
        data: counts,
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      }]
    };
  };

  // Chart data for speed forecast
  const getSpeedChartData = () => ({
    labels: speedResult?.data?.map((_, index) => `Day ${index + 1}`) || [],
    datasets: [{
      label: 'Predicted Speed (knots)',
      data: speedResult?.data || [],
      borderColor: 'rgb(16, 185, 129)',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      tension: 0.4,
    }]
  });

  // Chart options
  const chartOptions = (title) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: title, font: { size: 16 } },
    },
    scales: {
      x: { grid: { color: '#e5e7eb' }, ticks: { font: { size: 12 } } },
      y: { grid: { color: '#e5e7eb' }, ticks: { font: { size: 14 } } },
    },
  });

  const getTrafficPieData = () => {
    if (!trafficResult || !trafficResult.totals) return { labels: [], datasets: [] };
    return {
      labels: ['Reached', 'In Transit'],
      datasets: [{
        data: [trafficResult.totals.reached || 0, trafficResult.totals.in_transit || 0],
        backgroundColor: ['#3b82f6', '#f59e0b'],
      }]
    };
  };

  const exportForecastReport = () => {
    const report = {
      generated_at: new Date().toISOString(),
      traffic: trafficResult,
      speed: speedResult,
      risk_by_datetime: riskDatetimeResult,
      risk_by_ship: riskShipResult
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `forecast-report-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const trafficReached = trafficResult?.totals?.reached || 0;
  const trafficTransit = trafficResult?.totals?.in_transit || 0;
  const avgPredSpeed = speedResult?.data?.length
    ? speedResult.data.reduce((sum, v) => sum + v, 0) / speedResult.data.length
    : 0;
  const riskEvents =
    (riskShipResult?.risk_dates?.length || 0) +
    (riskDatetimeResult?.details?.length || 0);

  return (
    <div className="max-w-[1400px] mx-auto p-3 md:p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 min-h-screen text-slate-100 rounded-2xl border border-slate-800 shadow-2xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6 md:mb-8">
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-center md:text-left animate-fadeInDown">Forecasting Dashboard</h2>
        <button
          onClick={exportForecastReport}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-semibold text-white transition"
        >
          Export Forecast Report
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-3">
          <p className="text-xs text-slate-400">Reached</p>
          <p className="text-xl font-bold text-cyan-300">{trafficReached}</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-3">
          <p className="text-xs text-slate-400">In Transit</p>
          <p className="text-xl font-bold text-amber-300">{trafficTransit}</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-3">
          <p className="text-xs text-slate-400">Avg Predicted Speed</p>
          <p className="text-xl font-bold text-emerald-300">{avgPredSpeed ? `${avgPredSpeed.toFixed(2)} kn` : '--'}</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-3">
          <p className="text-xs text-slate-400">Risk Events</p>
          <p className="text-xl font-bold text-rose-300">{riskEvents}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 max-w-7xl mx-auto">
        
        {/* Traffic Prediction Card */}
        <div className="bg-slate-900/90 p-4 md:p-6 rounded-2xl shadow-xl flex flex-col items-center border border-slate-700 animate-fadeInUp">
          <h3 className="text-lg font-bold mb-4 text-blue-700">Traffic Prediction</h3>
          <input
            type="date"
            value={trafficDate}
            onChange={e => setTrafficDate(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && trafficDate) fetchTrafficPrediction(); }}
            className="border border-slate-600 rounded px-3 py-2 mb-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm caret-blue-600 bg-slate-800 text-slate-100"
          />
          <div className="w-full flex gap-2 mb-3">
            <button type="button" onClick={() => setTrafficDate(today)} className="flex-1 text-xs bg-slate-800 border border-slate-600 rounded py-1.5">Today</button>
            <button type="button" onClick={() => setTrafficDate(inThreeDays)} className="flex-1 text-xs bg-slate-800 border border-slate-600 rounded py-1.5">+3 Days</button>
            <button type="button" onClick={() => setTrafficDate(inSevenDays)} className="flex-1 text-xs bg-slate-800 border border-slate-600 rounded py-1.5">+7 Days</button>
          </div>
          <button
            onClick={fetchTrafficPrediction}
            className="bg-blue-600 text-white px-4 py-2 rounded font-medium shadow hover:bg-blue-700 transition mb-3 w-full text-sm"
            disabled={trafficLoading}
          >
            {trafficLoading ? "Loading..." : "Get Prediction"}
          </button>
          {trafficError && <div className="text-red-500 mb-2 text-xs">{trafficError}</div>}
          {trafficResult && (
            <>
              <div className="mb-3 text-blue-300 font-semibold text-center text-sm">{trafficResult.summary}</div>
              <div className="w-full h-48">
                <Bar data={getTrafficChartData()} options={chartOptions('Traffic by Port')} />
              </div>
              <div className="w-full h-52 mt-4">
                <Pie data={getTrafficPieData()} options={chartOptions('Reached vs In Transit')} />
              </div>
            </>
          )}
        </div>

        {/* Speed Forecast Card */}
        <div className="bg-slate-900/90 p-4 md:p-6 rounded-2xl shadow-xl flex flex-col items-center border border-slate-700 animate-fadeInUp">
          <h3 className="text-lg font-bold mb-4 text-blue-700">Speed Forecast</h3>
          <input
            type="text"
            placeholder="Enter MMSI (e.g. 101010101)"
            value={speedMmsi}
            onChange={e => setSpeedMmsi(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && speedMmsi && speedDays) fetchSpeedForecast(); }}
            className="border border-slate-600 rounded px-3 py-2 mb-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm caret-blue-600 bg-slate-800 text-slate-100"
          />
          <div className="w-full flex gap-2 mb-3">
            <button type="button" onClick={() => setSpeedMmsi('123456789')} className="flex-1 text-xs bg-slate-800 border border-slate-600 rounded py-1.5">Use Demo MMSI</button>
            <button type="button" onClick={() => setSpeedDays('7')} className="flex-1 text-xs bg-slate-800 border border-slate-600 rounded py-1.5">7-Day Window</button>
          </div>
          <input
            type="number"
            min={1}
            max={30}
            value={speedDays}
            onChange={e => setSpeedDays(e.target.value)}
            placeholder="Enter number of days ahead"
            onKeyDown={e => { if (e.key === 'Enter' && speedMmsi && speedDays) fetchSpeedForecast(); }}
            className="border border-slate-600 rounded px-3 py-2 mb-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm caret-blue-600 bg-slate-800 text-slate-100"
          />
          <button
            onClick={fetchSpeedForecast}
            className="bg-blue-600 text-white px-4 py-2 rounded font-medium shadow hover:bg-blue-700 transition mb-3 w-full text-sm"
            disabled={speedLoading}
          >
            {speedLoading ? "Loading..." : "Get Forecast"}
          </button>
          {speedError && <div className="text-red-500 mb-2 text-xs">{speedError}</div>}
          {speedResult && (
            <>
              <div className="mb-3 text-blue-300 font-semibold text-center text-sm">{speedResult.summary}</div>
              
              {/* Final Day Speed Highlight */}
              <div className="mb-4 p-3 bg-blue-950/40 border-2 border-blue-700 rounded-lg">
                <div className="text-center">
                  <div className="text-xs text-slate-400 mb-1">Day {speedResult.days_ahead} Predicted Speed:</div>
                  <div className="text-lg font-bold text-blue-300">
                    {speedResult.predicted_speed.toFixed(2)} knots
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    ({speedResult.days_ahead} days ahead)
                  </div>
                </div>
              </div>

              <div className="w-full h-48 mb-4">
                <Line data={getSpeedChartData()} options={chartOptions('Predicted Speed Over Days')} />
              </div>
              {/* Daily Speed Values */}
              <div className="w-full max-h-32 overflow-y-auto border border-slate-700 rounded p-2 bg-slate-800/60">
                <div className="text-xs font-semibold text-slate-200 mb-2">Daily Speed Predictions:</div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {speedResult.data.map((speed, index) => (
                    <div key={index} className={`flex justify-between p-1 rounded ${
                      index === speedResult.data.length - 1 
                        ? 'bg-blue-100 border border-blue-300 font-semibold' 
                        : 'bg-slate-800'
                    }`}>
                      <span>Day {index + 1}:</span>
                      <span className="font-medium">{speed.toFixed(2)} knots</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Risk Analysis by Datetime Card */}
        <div className="bg-slate-900/90 p-4 md:p-6 rounded-2xl shadow-xl flex flex-col items-center border border-slate-700 animate-fadeInUp">
          <h3 className="text-lg font-bold mb-4 text-blue-700">Risk Analysis (By Datetime)</h3>
          <input
            type="text"
            placeholder="Enter Ship Name (e.g. Victoria)"
            value={riskShipName}
            onChange={e => setRiskShipName(e.target.value)}
            className="border border-slate-600 rounded px-3 py-2 mb-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm caret-blue-600 bg-slate-800 text-slate-100"
          />
          <div className="w-full flex gap-2 mb-3">
            <button type="button" onClick={() => setRiskShipName('Victoria')} className="flex-1 text-xs bg-slate-800 border border-slate-600 rounded py-1.5">Use Demo Name</button>
            <button type="button" onClick={() => { setRiskDate(today); setRiskTime('12:00'); }} className="flex-1 text-xs bg-slate-800 border border-slate-600 rounded py-1.5">Set Today Noon</button>
          </div>
          <input
            type="date"
            value={riskDate}
            onChange={e => setRiskDate(e.target.value)}
            className="border border-slate-600 rounded px-3 py-2 mb-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm caret-blue-600 bg-slate-800 text-slate-100"
          />
          <input
            type="time"
            value={riskTime}
            onChange={e => setRiskTime(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && riskShipName && riskDate && riskTime) fetchRiskByDatetime(); }}
            className="border border-slate-600 rounded px-3 py-2 mb-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm caret-blue-600 bg-slate-800 text-slate-100"
          />
          <button
            onClick={fetchRiskByDatetime}
            className="bg-blue-600 text-white px-4 py-2 rounded font-medium shadow hover:bg-blue-700 transition mb-3 w-full text-sm"
            disabled={riskDatetimeLoading}
          >
            {riskDatetimeLoading ? "Loading..." : "Get Risk Analysis"}
          </button>
          {riskDatetimeError && <div className="text-red-500 mb-2 text-xs">{riskDatetimeError}</div>}
          {riskDatetimeResult && (
            <div className={`mb-2 text-center font-medium text-sm ${riskDatetimeResult.alert ? 'text-red-600' : 'text-green-600'}`}>
              {riskDatetimeResult.message}
              {riskDatetimeResult.alert && riskDatetimeResult.details && (
                <ul className="mt-2 text-xs text-slate-300">
                  {riskDatetimeResult.details.map((d, idx) => (
                    <li key={idx}>
                      {d.other_ship} at ({d.latitude.toFixed(4)}, {d.longitude.toFixed(4)}) - {d.distance_km} km
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Risk Analysis by Ship Card */}
        <div className="bg-slate-900/90 p-4 md:p-6 rounded-2xl shadow-xl flex flex-col items-center border border-slate-700 animate-fadeInUp">
          <h3 className="text-lg font-bold mb-4 text-blue-700">Risk Analysis (By Ship)</h3>
          <input
            type="text"
            placeholder="Enter Ship Name (e.g. Victoria)"
            value={riskShipOnlyName}
            onChange={e => setRiskShipOnlyName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && riskShipOnlyName) fetchRiskByShip(); }}
            className="border border-slate-600 rounded px-3 py-2 mb-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm caret-blue-600 bg-slate-800 text-slate-100"
          />
          <div className="w-full mb-3">
            <button type="button" onClick={() => setRiskShipOnlyName('Victoria')} className="w-full text-xs bg-slate-800 border border-slate-600 rounded py-1.5">Use Demo Name</button>
          </div>
          <button
            onClick={fetchRiskByShip}
            className="bg-blue-600 text-white px-4 py-2 rounded font-medium shadow hover:bg-blue-700 transition mb-3 w-full text-sm"
            disabled={riskShipLoading}
          >
            {riskShipLoading ? "Loading..." : "Get Risk Analysis"}
          </button>
          {riskShipError && <div className="text-red-500 mb-2 text-xs">{riskShipError}</div>}
          {riskShipResult && (
            <div className={`mb-2 text-center font-medium text-sm ${riskShipResult.alert ? 'text-red-600' : 'text-green-600'}`}>
              {riskShipResult.message}
              {riskShipResult.alert && riskShipResult.risk_dates && (
                <ul className="mt-2 text-xs text-slate-300">
                  {riskShipResult.risk_dates.map((d, idx) => (
                    <li key={idx}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default TrafficForecasting;
