import React, { useState } from "react";
import { getTrafficPrediction, getSpeedForecast } from "../services/aisApi";
import { getRiskByDatetime, getRiskByShip } from "../services/riskApi";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

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

  return (
    <div className="p-6 bg-gradient-to-br from-gray-100 to-gray-200 min-h-screen text-gray-900">
      <h2 className="text-3xl font-extrabold mb-8 tracking-tight text-center">Forecasting Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
        
        {/* Traffic Prediction Card */}
        <div className="bg-white p-6 rounded-xl shadow-md flex flex-col items-center border border-gray-200">
          <h3 className="text-lg font-bold mb-4 text-blue-700">Traffic Prediction</h3>
          <input
            type="date"
            value={trafficDate}
            onChange={e => setTrafficDate(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && trafficDate) fetchTrafficPrediction(); }}
            className="border border-gray-300 rounded px-3 py-2 mb-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
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
              <div className="mb-3 text-blue-700 font-semibold text-center text-sm">{trafficResult.summary}</div>
              <div className="w-full h-48">
                <Bar data={getTrafficChartData()} options={chartOptions('Traffic by Port')} />
              </div>
            </>
          )}
        </div>

        {/* Speed Forecast Card */}
        <div className="bg-white p-6 rounded-xl shadow-md flex flex-col items-center border border-gray-200">
          <h3 className="text-lg font-bold mb-4 text-blue-700">Speed Forecast</h3>
          <input
            type="text"
            placeholder="Enter MMSI (e.g. 101010101)"
            value={speedMmsi}
            onChange={e => setSpeedMmsi(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && speedMmsi && speedDays) fetchSpeedForecast(); }}
            className="border border-gray-300 rounded px-3 py-2 mb-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <input
            type="number"
            min={1}
            max={30}
            value={speedDays}
            onChange={e => setSpeedDays(e.target.value)}
            placeholder="Enter number of days ahead"
            onKeyDown={e => { if (e.key === 'Enter' && speedMmsi && speedDays) fetchSpeedForecast(); }}
            className="border border-gray-300 rounded px-3 py-2 mb-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
              <div className="mb-3 text-blue-700 font-semibold text-center text-sm">{speedResult.summary}</div>
              
              {/* Final Day Speed Highlight */}
              <div className="mb-4 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <div className="text-center">
                  <div className="text-xs text-gray-600 mb-1">Day {speedResult.days_ahead} Predicted Speed:</div>
                  <div className="text-lg font-bold text-blue-800">
                    {speedResult.predicted_speed.toFixed(2)} knots
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    ({speedResult.days_ahead} days ahead)
                  </div>
                </div>
              </div>

              <div className="w-full h-48 mb-4">
                <Line data={getSpeedChartData()} options={chartOptions('Predicted Speed Over Days')} />
              </div>
              {/* Daily Speed Values */}
              <div className="w-full max-h-32 overflow-y-auto border border-gray-200 rounded p-2">
                <div className="text-xs font-semibold text-gray-700 mb-2">Daily Speed Predictions:</div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {speedResult.data.map((speed, index) => (
                    <div key={index} className={`flex justify-between p-1 rounded ${
                      index === speedResult.data.length - 1 
                        ? 'bg-blue-100 border border-blue-300 font-semibold' 
                        : 'bg-gray-50'
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
        <div className="bg-white p-6 rounded-xl shadow-md flex flex-col items-center border border-gray-200">
          <h3 className="text-lg font-bold mb-4 text-blue-700">Risk Analysis (By Datetime)</h3>
          <input
            type="text"
            placeholder="Enter Ship Name (e.g. Victoria)"
            value={riskShipName}
            onChange={e => setRiskShipName(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 mb-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <input
            type="date"
            value={riskDate}
            onChange={e => setRiskDate(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 mb-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <input
            type="time"
            value={riskTime}
            onChange={e => setRiskTime(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && riskShipName && riskDate && riskTime) fetchRiskByDatetime(); }}
            className="border border-gray-300 rounded px-3 py-2 mb-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                <ul className="mt-2 text-xs text-gray-700">
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
        <div className="bg-white p-6 rounded-xl shadow-md flex flex-col items-center border border-gray-200">
          <h3 className="text-lg font-bold mb-4 text-blue-700">Risk Analysis (By Ship)</h3>
          <input
            type="text"
            placeholder="Enter Ship Name (e.g. Victoria)"
            value={riskShipOnlyName}
            onChange={e => setRiskShipOnlyName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && riskShipOnlyName) fetchRiskByShip(); }}
            className="border border-gray-300 rounded px-3 py-2 mb-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
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
                <ul className="mt-2 text-xs text-gray-700">
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