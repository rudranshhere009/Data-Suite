import React from 'react';
import { Line, Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
} from 'chart.js';
import { generateRandomColors } from '../utils/chartUtils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
);

const RouteGraph = ({ routeData, shipDetails }) => {
  if (!routeData || routeData.length === 0) {
    return <div className="p-4 text-center text-slate-400">No route data available to display a graph.</div>;
  }

  const sogLabels = routeData.map((point) => (point.timestamp ? new Date(point.timestamp).toLocaleString() : 'Unknown Time'));
  const sogData = routeData.map((point) => {
    const sog = point.sog;
    return sog !== null && sog !== undefined && !Number.isNaN(Number(sog)) ? parseFloat(sog) : 0;
  });

  const baseText = '#cbd5e1';
  const mutedText = '#94a3b8';
  const grid = 'rgba(148, 163, 184, 0.15)';

  const lineChartData = {
    labels: sogLabels,
    datasets: [
      {
        label: 'Speed Over Ground (knots)',
        data: sogData,
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.2)',
        tension: 0.3,
        pointRadius: 2,
        pointHoverRadius: 5,
        pointBackgroundColor: '#38bdf8',
        pointBorderColor: '#0f172a',
        pointBorderWidth: 1,
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 800, easing: 'easeOutQuart' },
    plugins: {
      legend: { position: 'top', labels: { color: baseText, font: { size: 12 } } },
      title: { display: true, text: 'Speed Over Ground', color: baseText, font: { size: 14, weight: 'bold' } },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#38bdf8',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Time', color: mutedText, font: { size: 10 } },
        ticks: { color: mutedText, font: { size: 9 }, maxTicksLimit: 8 },
        grid: { color: grid },
      },
      y: {
        title: { display: true, text: 'Speed (knots)', color: mutedText, font: { size: 10 } },
        ticks: { color: mutedText, font: { size: 9 } },
        grid: { color: grid },
      },
    },
  };

  const destinationCounts = {};
  routeData.forEach((point) => {
    const dest = point.destination && point.destination !== 'Unknown' && point.destination.trim() !== '' ? point.destination : 'Unknown';
    destinationCounts[dest] = (destinationCounts[dest] || 0) + 1;
  });

  const pieChartLabels = Object.keys(destinationCounts);
  const pieChartDataValues = Object.values(destinationCounts);
  const pieChartColors = generateRandomColors(pieChartLabels.length);

  const pieChartData = {
    labels: pieChartLabels,
    datasets: [{ data: pieChartDataValues, backgroundColor: pieChartColors, borderColor: '#0f172a', borderWidth: 2 }],
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 800, easing: 'easeOutQuart' },
    plugins: {
      legend: { position: 'bottom', labels: { color: baseText, font: { size: 11 }, padding: 12 } },
      title: { display: true, text: 'Destination Distribution', color: baseText, font: { size: 14, weight: 'bold' } },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#f59e0b',
        borderWidth: 1,
      },
    },
  };

  const destinationSpeedSums = {};
  const destinationSpeedCounts = {};
  routeData.forEach((point) => {
    const dest = point.destination && point.destination !== 'Unknown' && point.destination.trim() !== '' ? point.destination : 'Unknown';
    const sog = point.sog;
    if (sog !== null && sog !== undefined && !Number.isNaN(Number(sog)) && Number(sog) > 0) {
      destinationSpeedSums[dest] = (destinationSpeedSums[dest] || 0) + parseFloat(sog);
      destinationSpeedCounts[dest] = (destinationSpeedCounts[dest] || 0) + 1;
    }
  });

  const barChartLabels = Object.keys(destinationSpeedSums);
  const barChartDataValues = barChartLabels.map((dest) => {
    const sum = destinationSpeedSums[dest];
    const count = destinationSpeedCounts[dest];
    return count > 0 ? parseFloat((sum / count).toFixed(1)) : 0;
  });

  const barChartData = {
    labels: barChartLabels,
    datasets: [
      {
        label: 'Average Speed (knots)',
        data: barChartDataValues,
        backgroundColor: generateRandomColors(barChartLabels.length),
        borderColor: '#0f172a',
        borderWidth: 1,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 800, easing: 'easeOutQuart' },
    plugins: {
      legend: { position: 'top', labels: { color: baseText, font: { size: 12 } } },
      title: { display: true, text: 'Average Speed per Destination', color: baseText, font: { size: 14, weight: 'bold' } },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#22c55e',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Destination', color: mutedText, font: { size: 10 } },
        ticks: { color: mutedText, font: { size: 9 } },
        grid: { color: grid },
      },
      y: {
        title: { display: true, text: 'Average Speed (knots)', color: mutedText, font: { size: 10 } },
        ticks: { color: mutedText, font: { size: 9 } },
        grid: { color: grid },
      },
    },
  };

  const avgSpeed = sogData.length ? (sogData.reduce((a, b) => a + b, 0) / sogData.length).toFixed(1) : '0.0';
  const maxSpeed = sogData.length ? Math.max(...sogData).toFixed(1) : '0.0';

  return (
    <div className="h-full overflow-y-auto font-sans bg-slate-950 text-slate-100">
      <div className="sticky top-0 z-30 backdrop-blur-md bg-slate-950/90 border-b border-slate-800">
        <div className="px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h3 className="text-2xl md:text-3xl font-extrabold text-slate-100">
            Route Analysis for {shipDetails?.SHIP_NAME || 'Unknown Ship'}
          </h3>
        </div>
      </div>
      
      <div className="p-4 md:p-6 space-y-6">
        <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-700 p-4 md:p-6">
          <h4 className="text-lg font-semibold text-slate-100 mb-4 flex items-center">
            <span className="w-3 h-3 bg-cyan-400 rounded-full mr-3"></span>
            Speed Over Ground Analysis
          </h4>
          <div className="rounded-xl border border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-2" style={{ height: '390px', width: '100%' }}>
            <Line data={lineChartData} options={{ ...lineChartOptions, maintainAspectRatio: false, responsive: true }} />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-700 p-4 md:p-6">
            <h4 className="text-lg font-semibold text-slate-100 mb-4 flex items-center">
              <span className="w-3 h-3 bg-amber-400 rounded-full mr-3"></span>
              Destination Distribution
            </h4>
            <div className="rounded-xl border border-slate-700 bg-gradient-to-b from-amber-950/20 to-slate-950 p-2" style={{ height: '340px', width: '100%' }}>
              <Pie data={pieChartData} options={{ ...pieChartOptions, maintainAspectRatio: false, responsive: true }} />
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-700 p-4 md:p-6">
            <h4 className="text-lg font-semibold text-slate-100 mb-4 flex items-center">
              <span className="w-3 h-3 bg-emerald-400 rounded-full mr-3"></span>
              Average Speed per Destination
            </h4>
            <div className="rounded-xl border border-slate-700 bg-gradient-to-b from-emerald-950/20 to-slate-950 p-2" style={{ height: '340px', width: '100%' }}>
              <Bar data={barChartData} options={{ ...barChartOptions, maintainAspectRatio: false, responsive: true }} />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-700 p-4 md:p-6 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-violet-500/15 blur-3xl rounded-full pointer-events-none"></div>
          <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-cyan-500/15 blur-3xl rounded-full pointer-events-none"></div>
          <h4 className="text-lg font-semibold text-slate-100 mb-4 flex items-center">
            <span className="w-3 h-3 bg-violet-400 rounded-full mr-3"></span>
            Route Statistics Summary
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-950/40 border border-blue-800 rounded-xl">
              <div className="text-2xl font-bold text-blue-300">{routeData.length}</div>
              <div className="text-sm text-slate-400">Total Points</div>
            </div>
            <div className="text-center p-4 bg-emerald-950/40 border border-emerald-800 rounded-xl">
              <div className="text-2xl font-bold text-emerald-300">{avgSpeed}</div>
              <div className="text-sm text-slate-400">Avg Speed (knots)</div>
            </div>
            <div className="text-center p-4 bg-amber-950/40 border border-amber-800 rounded-xl">
              <div className="text-2xl font-bold text-amber-300">{maxSpeed}</div>
              <div className="text-sm text-slate-400">Max Speed (knots)</div>
            </div>
            <div className="text-center p-4 bg-violet-950/40 border border-violet-800 rounded-xl">
              <div className="text-2xl font-bold text-violet-300">{pieChartLabels.length}</div>
              <div className="text-sm text-slate-400">Destinations</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteGraph;
