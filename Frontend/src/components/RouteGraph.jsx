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
  ArcElement, // Added for Pie Chart
  BarElement, // Added for Bar Chart
} from 'chart.js';
import { generateRandomColors } from '../utils/chartUtils';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement, // Registered for Pie Chart
  BarElement, // Registered for Bar Chart
);

const RouteGraph = ({ routeData, shipDetails }) => {
  if (!routeData || routeData.length === 0) {
    return (
      <div className="p-4 text-center text-gray-600">
        No route data available to display a graph.
      </div>
    );
  }

  console.log('Route data in RouteGraph:', routeData); // Debug log

  // --- Line Chart Data (Speed Over Ground) ---
  const sogLabels = routeData.map(point => {
    if (point.timestamp) {
      return new Date(point.timestamp).toLocaleString();
    }
    return 'Unknown Time';
  });
  
  const sogData = routeData.map(point => {
    const sog = point.sog;
    return (sog !== null && sog !== undefined && !isNaN(sog)) ? parseFloat(sog) : 0;
  });

  const lineChartData = {
    labels: sogLabels,
    datasets: [
      {
        label: 'Speed Over Ground (knots)',
        data: sogData,
        borderColor: '#4299e1', // Blue-500
        backgroundColor: 'rgba(66, 153, 225, 0.2)', // Blue-500 with transparency
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 7,
        pointBackgroundColor: '#4299e1',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 800,
      easing: 'easeOutQuart',
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#2d3748',
          font: { size: 12 },
        },
      },
      title: {
        display: true,
        text: `Speed Over Ground`,
        color: '#2d3748',
        font: { size: 14, weight: 'bold' },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(45, 55, 72, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#4299e1',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(1) + ' knots';
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Time',
          color: '#4a5568',
          font: { size: 10 },
        },
        ticks: {
          color: '#4a5568',
          font: { size: 9 },
          maxTicksLimit: 8,
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.08)',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Speed (knots)',
          color: '#4a5568',
          font: { size: 10 },
        },
        ticks: {
          color: '#4a5568',
          font: { size: 9 },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.08)',
        },
      },
    },
  };

  // --- Pie Chart Data (Destination Distribution) ---
  const destinationCounts = {};
  routeData.forEach(point => {
    const dest = point.destination && point.destination !== 'Unknown' && point.destination.trim() !== '' ? point.destination : 'Unknown';
    destinationCounts[dest] = (destinationCounts[dest] || 0) + 1;
  });

  const pieChartLabels = Object.keys(destinationCounts);
  const pieChartDataValues = Object.values(destinationCounts);

  console.log('Destination counts:', destinationCounts); // Debug log

  

  const pieChartColors = generateRandomColors(pieChartLabels.length);

  const pieChartData = {
    labels: pieChartLabels,
    datasets: [
      {
        data: pieChartDataValues,
        backgroundColor: pieChartColors,
        borderColor: '#fff', // White border for contrast
        borderWidth: 2,
      },
    ],
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 800,
      easing: 'easeOutQuart',
    },
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#2d3748',
          font: { size: 11 },
          padding: 15,
        },
      },
      title: {
        display: true,
        text: `Destination Distribution`,
        color: '#2d3748',
        font: { size: 14, weight: 'bold' },
      },
      tooltip: {
        backgroundColor: 'rgba(45, 55, 72, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#f6ad55',
        borderWidth: 1,
      }
    },
  };

  // --- Bar Chart Data (Average Speed per Destination) ---
  const destinationSpeedSums = {};
  const destinationSpeedCounts = {};

  routeData.forEach(point => {
    const dest = point.destination && point.destination !== 'Unknown' && point.destination.trim() !== '' ? point.destination : 'Unknown';
    const sog = point.sog;
    if (sog !== null && sog !== undefined && !isNaN(sog) && sog > 0) {
      destinationSpeedSums[dest] = (destinationSpeedSums[dest] || 0) + parseFloat(sog);
      destinationSpeedCounts[dest] = (destinationSpeedCounts[dest] || 0) + 1;
    }
  });

  const barChartLabels = Object.keys(destinationSpeedSums);
  const barChartDataValues = barChartLabels.map(dest => {
    const sum = destinationSpeedSums[dest];
    const count = destinationSpeedCounts[dest];
    return count > 0 ? parseFloat((sum / count).toFixed(1)) : 0;
  });

  console.log('Speed sums and counts:', destinationSpeedSums, destinationSpeedCounts); // Debug log

  const barChartColors = generateRandomColors(barChartLabels.length);

  const barChartData = {
    labels: barChartLabels,
    datasets: [
      {
        label: 'Average Speed (knots)',
        data: barChartDataValues,
        backgroundColor: barChartColors,
        borderColor: '#fff',
        borderWidth: 1,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 800,
      easing: 'easeOutQuart',
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#2d3748',
          font: { size: 12 },
        },
      },
      title: {
        display: true,
        text: `Average Speed per Destination`,
        color: '#2d3748',
        font: { size: 14, weight: 'bold' },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(45, 55, 72, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#68d391',
        borderWidth: 1,
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Destination',
          color: '#4a5568',
          font: { size: 10 },
        },
        ticks: {
          color: '#4a5568',
          font: { size: 9 },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.08)',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Average Speed (knots)',
          color: '#4a5568',
          font: { size: 10 },
        },
        ticks: {
          color: '#4a5568',
          font: { size: 9 },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.08)',
        },
      },
    },
  };

  return (
    <div className="p-6 bg-gray-50 text-gray-900 h-full overflow-y-auto">
      <h3 className="text-2xl font-bold mb-6 text-gray-800 text-center sticky top-0 bg-gray-50 py-2 z-10">
        Route Analysis for {shipDetails?.SHIP_NAME || 'Unknown Ship'}
      </h3>
      
      <div className="space-y-6">
        {/* Speed Over Ground Chart Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-300">
          <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
            <span className="w-3 h-3 bg-blue-500 rounded-full mr-3"></span>
            Speed Over Ground Analysis
          </h4>
          <div style={{ height: '400px', width: '100%' }}>
            <Line data={lineChartData} options={{
              ...lineChartOptions,
              maintainAspectRatio: false,
              responsive: true
            }} />
          </div>
        </div>

        {/* Two Column Layout for Pie and Bar Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Destination Distribution Chart Card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-300">
            <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
              <span className="w-3 h-3 bg-orange-500 rounded-full mr-3"></span>
              Destination Distribution
            </h4>
            <div style={{ height: '350px', width: '100%' }}>
              <Pie data={pieChartData} options={{
                ...pieChartOptions,
                maintainAspectRatio: false,
                responsive: true,
                plugins: {
                  ...pieChartOptions.plugins,
                  legend: {
                    ...pieChartOptions.plugins.legend,
                    position: 'bottom',
                  }
                }
              }} />
            </div>
          </div>

          {/* Average Speed per Destination Chart Card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-300">
            <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
              <span className="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
              Average Speed per Destination
            </h4>
            <div style={{ height: '350px', width: '100%' }}>
              <Bar data={barChartData} options={{
                ...barChartOptions,
                maintainAspectRatio: false,
                responsive: true
              }} />
            </div>
          </div>
        </div>

        {/* Additional Statistics Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-300">
          <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
            <span className="w-3 h-3 bg-purple-500 rounded-full mr-3"></span>
            Route Statistics Summary
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{routeData.length}</div>
              <div className="text-sm text-gray-600">Total Points</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {(sogData.reduce((a, b) => a + b, 0) / sogData.length).toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Avg Speed (knots)</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {Math.max(...sogData).toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Max Speed (knots)</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {pieChartLabels.length}
              </div>
              <div className="text-sm text-gray-600">Destinations</div>
            </div>
          </div>
        </div>

        {/* Spacer for better scrolling */}
        <div className="h-4"></div>
      </div>
    </div>
  );
}

export default RouteGraph;