
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

  // Fetch risk by datetime
  const fetchRiskByDatetime = async () => {
    setRiskDatetimeLoading(true);
    setRiskDatetimeError(null);
    try {
      if (!riskShipName || !riskDate || !riskTime) {
        setRiskDatetimeError("Please enter ship name, date, and time.");
        setRiskDatetimeLoading(false);
        return;
      }
      const data = await getRiskByDatetime(riskShipName, riskDate, riskTime);
      setRiskDatetimeResult(data);
    } catch (err) {
      setRiskDatetimeError(err.message || "Failed to fetch risk by datetime.");
      setRiskDatetimeResult(null);
    }
    setRiskDatetimeLoading(false);
  };

  // Fetch risk by ship
  const fetchRiskByShip = async () => {
    setRiskShipLoading(true);
    setRiskShipError(null);
    try {
      if (!riskShipOnlyName) {
        setRiskShipError("Please enter ship name.");
        setRiskShipLoading(false);
        return;
      }
      const data = await getRiskByShip(riskShipOnlyName);
      setRiskShipResult(data);
    } catch (err) {
      setRiskShipError(err.message || "Failed to fetch risk by ship.");
      setRiskShipResult(null);
    }
    setRiskShipLoading(false);
  };

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

  // Fetch traffic prediction
  const fetchTrafficPrediction = async () => {
    setTrafficLoading(true);
    setTrafficError(null);
    try {
      // Convert DD-MM-YYYY or other formats to YYYY-MM-DD
      let formattedDate = trafficDate;
      if (trafficDate && trafficDate.includes("-")) {
        const parts = trafficDate.split("-");
        // If input is DD-MM-YYYY, convert to YYYY-MM-DD
        if (parts[0].length === 2 && parts[2].length === 4) {
          formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }
      const data = await getTrafficPrediction(formattedDate);
      if (data.error) {
        setTrafficError(data.error || "Failed to fetch traffic prediction.");
        setTrafficResult(null);
      } else {
        // Format chart data for BarChart
        const chartData = [];
        if (data.ships_at_ports) {
          for (const [port, info] of Object.entries(data.ships_at_ports)) {
            chartData.push({ label: port, value: info.reached });
          }
        }
        chartData.push({ label: "In Transit", value: data.totals?.in_transit || 0 });
        setTrafficResult({
          summary: `Total reached: ${data.totals?.reached || 0}, In transit: ${data.totals?.in_transit || 0}`,
          chartData,
        });
      }
    } catch (err) {
      setTrafficError(err.message || "Failed to fetch traffic prediction.");
      setTrafficResult(null);
    }
    setTrafficLoading(false);
  };

  // Fetch speed forecast
  const fetchSpeedForecast = async () => {
    setSpeedLoading(true);
    setSpeedError(null);
    try {
      if (!speedMmsi) {
        setSpeedError("Please enter a valid MMSI.");
        setSpeedLoading(false);
        return;
      }
      const payload = {
        mmsi: String(speedMmsi).trim(),
        days_ahead: speedDays,
      };
      const data = await getSpeedForecast(payload);
      if (data.error) {
        setSpeedError(data.error || "Failed to fetch speed forecast.");
        setSpeedResult(null);
      } else {
        // Format chart data for LineChart
        const chartData = [];
        if (data.predicted_speed !== undefined) {
          for (let i = 1; i <= payload.days_ahead; i++) {
            chartData.push({ label: `Day ${i}`, value: data.predicted_speed });
          }
        }
        setSpeedResult({
          summary: `Predicted speed for MMSI ${payload.mmsi}, day ${payload.days_ahead}: ${data.predicted_speed || "N/A"}`,
          chartData,
        });
      }
    } catch (err) {
      setSpeedError(err.message || "Failed to fetch speed forecast.");
      setSpeedResult(null);
    }
    setSpeedLoading(false);
  };

  // Chart.js data formatters
  const getTrafficChartData = () => ({
    labels: trafficResult?.chartData?.map(d => d.label) || [],
    datasets: [
      {
        label: 'Ships',
        data: trafficResult?.chartData?.map(d => d.value) || [],
        backgroundColor: '#6366f1',
        borderRadius: 8,
      },
    ],
  });

  const getSpeedChartData = () => ({
    labels: speedResult?.chartData?.map(d => d.label) || [],
    datasets: [
      {
        label: 'Predicted Speed',
        data: speedResult?.chartData?.map(d => d.value) || [],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.2)',
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: '#10b981',
      },
    ],
  });

  const chartOptions = title => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: title, font: { size: 18 } },
    },
    scales: {
      x: { grid: { color: '#e5e7eb' }, ticks: { font: { size: 14 } } },
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
            className="bg-blue-600 text-white px-4 py-2 rounded font-medium shadow hover:bg-blue-700 transition mb-3 w-full"
            disabled={!trafficDate || trafficLoading}
          >
            {trafficLoading ? "Loading..." : "Get Prediction"}
          </button>
          {trafficError && <div className="text-red-500 mb-2 text-sm">{trafficError}</div>}
          {trafficResult && (
            <>
              <div className="mb-3 text-blue-700 font-medium text-center text-sm">{trafficResult.summary}</div>
              <div className="w-full h-48">
                <Bar data={getTrafficChartData()} options={chartOptions('Ships at Ports & In Transit')} />
              </div>
            </>
          )}
        </div>

        {/* Speed Forecast Card */}
        <div className="bg-white p-6 rounded-xl shadow-md flex flex-col items-center border border-gray-200">
            <h3 className="text-xl font-bold mb-4 text-blue-700">Speed Forecast</h3>
            <input
              type="text"
              placeholder="Enter MMSI (e.g. 101010101)"
              value={speedMmsi}
              onChange={e => setSpeedMmsi(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && speedMmsi && speedDays) fetchSpeedForecast(); }}
              className="border border-gray-300 rounded-lg px-4 py-2 mb-4 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
            />
            <input
              type="number"
              min={1}
              max={30}
              value={speedDays}
              onChange={e => setSpeedDays(e.target.value)}
              placeholder="Enter number of days ahead"
              onKeyDown={e => { if (e.key === 'Enter' && speedMmsi && speedDays) fetchSpeedForecast(); }}
              className="border border-gray-300 rounded-lg px-4 py-2 mb-4 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
            />
            <button
              onClick={fetchSpeedForecast}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold shadow hover:bg-blue-700 transition mb-4 w-full"
              disabled={speedLoading}
            >
              {speedLoading ? "Loading..." : "Get Forecast"}
            </button>
            {speedError && <div className="text-red-500 mb-2">{speedError}</div>}
            {speedResult && (
              <>
                <div className="mb-4 text-blue-700 font-semibold text-center">{speedResult.summary}</div>
                <div className="w-full h-64">
                  <Line data={getSpeedChartData()} options={chartOptions('Predicted Speed Over Days')} />
                </div>
              </>
            )}
          </div>

        {/* Risk Analysis by Datetime Card */}
        <div className="bg-white p-6 rounded-xl shadow-md flex flex-col items-center border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 text-blue-700">Risk Analysis (By Datetime)</h3>
            <input
              type="text"
              placeholder="Enter Ship Name (e.g. Victoria)"
              value={riskShipName}
              onChange={e => setRiskShipName(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 mb-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
            />
            <input
              type="date"
              value={riskDate}
              onChange={e => setRiskDate(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 mb-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
            />
            <input
              type="time"
              value={riskTime}
              onChange={e => setRiskTime(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 mb-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
            />
            <button
              onClick={fetchRiskByDatetime}
              className="bg-blue-600 text-white px-4 py-2 rounded font-medium shadow hover:bg-blue-700 transition mb-3 w-full"
              disabled={riskDatetimeLoading}
            >
              {riskDatetimeLoading ? "Loading..." : "Get Risk Analysis"}
            </button>
            {riskDatetimeError && <div className="text-red-500 mb-2 text-sm">{riskDatetimeError}</div>}
            {riskDatetimeResult && (
              <div className={`mb-2 text-center font-medium ${riskDatetimeResult.alert ? 'text-red-600' : 'text-green-600'}`}>
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
            <h3 className="text-lg font-semibold mb-4 text-blue-700">Risk Analysis (By Ship)</h3>
            <input
              type="text"
              placeholder="Enter Ship Name (e.g. Victoria)"
              value={riskShipOnlyName}
              onChange={e => setRiskShipOnlyName(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 mb-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
            />
            <button
              onClick={fetchRiskByShip}
              className="bg-blue-600 text-white px-4 py-2 rounded font-medium shadow hover:bg-blue-700 transition mb-3 w-full"
              disabled={riskShipLoading}
            >
              {riskShipLoading ? "Loading..." : "Get Risk Analysis"}
            </button>
            {riskShipError && <div className="text-red-500 mb-2 text-sm">{riskShipError}</div>}
            {riskShipResult && (
              <div className={`mb-2 text-center font-medium ${riskShipResult.alert ? 'text-red-600' : 'text-green-600'}`}>
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

        {/* Speed Forecast Card */}
        <div className="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 animate-fadeInUp flex flex-col items-center">
          <h3 className="text-xl font-bold mb-4 text-blue-700">Speed Forecast</h3>
          <input
            type="text"
            placeholder="Enter MMSI (e.g. 101010101)"
            value={speedMmsi}
            onChange={e => setSpeedMmsi(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && speedMmsi && speedDays) fetchSpeedForecast(); }}
            className="border border-gray-300 rounded-lg px-4 py-2 mb-4 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
          />
          <input
            type="number"
            min={1}
            max={30}
            value={speedDays}
            onChange={e => setSpeedDays(e.target.value)}
            placeholder="Enter number of days ahead"
            onKeyDown={e => { if (e.key === 'Enter' && speedMmsi && speedDays) fetchSpeedForecast(); }}
            className="border border-gray-300 rounded-lg px-4 py-2 mb-4 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
          />
          <button
            onClick={fetchSpeedForecast}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold shadow hover:bg-blue-700 transition mb-4 w-full"
            disabled={speedLoading}
          >
            {speedLoading ? "Loading..." : "Get Forecast"}
          </button>
          {speedError && <div className="text-red-500 mb-2">{speedError}</div>}
          {speedResult && (
            <>
              <div className="mb-4 text-blue-700 font-semibold text-center">{speedResult.summary}</div>
              <div className="w-full h-64">
                <Line data={getSpeedChartData()} options={chartOptions('Predicted Speed Over Days')} />
              </div>
            </>
          )}
        </div>
          <input
            type="text"
            placeholder="Enter Ship Name (e.g. Victoria)"
            value={riskShipName}
            onChange={e => setRiskShipName(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 mb-4 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
          />
          <input
            type="date"
            value={riskDate}
            onChange={e => setRiskDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 mb-4 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
          />
          <input
            type="time"
            value={riskTime}
            onChange={e => setRiskTime(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 mb-4 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
          />
          <button
            onClick={fetchRiskByDatetime}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold shadow hover:bg-blue-700 transition mb-4 w-full"
            disabled={riskDatetimeLoading}
          >
            {riskDatetimeLoading ? "Loading..." : "Get Risk Analysis"}
          </button>
          {riskDatetimeError && <div className="text-red-500 mb-2">{riskDatetimeError}</div>}
          {riskDatetimeResult && (
            <div className={`mb-2 text-center font-semibold ${riskDatetimeResult.alert ? 'text-red-600' : 'text-green-600'}`}>
              {riskDatetimeResult.message}
              {riskDatetimeResult.alert && riskDatetimeResult.details && (
                <ul className="mt-2 text-sm text-gray-700">
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
        <div className="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 animate-fadeInUp flex flex-col items-center">
          <h3 className="text-xl font-bold mb-4 text-blue-700">Risk Analysis (By Ship)</h3>
          <input
            type="text"
            placeholder="Enter Ship Name (e.g. Victoria)"
            value={riskShipOnlyName}
            onChange={e => setRiskShipOnlyName(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 mb-4 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
          />
          <button
            onClick={fetchRiskByShip}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold shadow hover:bg-blue-700 transition mb-4 w-full"
            disabled={riskShipLoading}
          >
            {riskShipLoading ? "Loading..." : "Get Risk Analysis"}
          </button>
          {riskShipError && <div className="text-red-500 mb-2">{riskShipError}</div>}
          {riskShipResult && (
            <div className={`mb-2 text-center font-semibold ${riskShipResult.alert ? 'text-red-600' : 'text-green-600'}`}>
              {riskShipResult.message}
              {riskShipResult.alert && riskShipResult.risk_dates && (
                <ul className="mt-2 text-sm text-gray-700">
                  {riskShipResult.risk_dates.map((d, idx) => (
                    <li key={idx}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
          <input
            type="text"
            placeholder="Enter MMSI (e.g. 101010101)"
            value={speedMmsi}
            onChange={e => setSpeedMmsi(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && speedMmsi && speedDays) fetchSpeedForecast(); }}
            className="border border-gray-300 rounded-lg px-4 py-2 mb-4 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
          />
          <input
            type="number"
            min={1}
            max={30}
            value={speedDays}
            onChange={e => setSpeedDays(e.target.value)}
            placeholder="Enter number of days ahead"
            onKeyDown={e => { if (e.key === 'Enter' && speedMmsi && speedDays) fetchSpeedForecast(); }}
            className="border border-gray-300 rounded-lg px-4 py-2 mb-4 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
          />
          <button
            onClick={fetchSpeedForecast}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold shadow hover:bg-blue-700 transition mb-4 w-full"
            disabled={speedLoading}
          >
            {speedLoading ? "Loading..." : "Get Forecast"}
          </button>
          {speedError && <div className="text-red-500 mb-2">{speedError}</div>}
          {speedResult && (
            <>
              <div className="mb-4 text-blue-700 font-semibold text-center">{speedResult.summary}</div>
              <div className="w-full h-64">
                <Line data={getSpeedChartData()} options={chartOptions('Predicted Speed Over Days')} />
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default TrafficForecasting;
