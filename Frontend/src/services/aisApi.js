import axios from 'axios';

// Production: always use nginx proxy
const API_BASE_URL = '/api';

// Create axios instance with default configuration
const aisApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 seconds timeout for large datasets
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false, // Disable credentials for CORS
});

// Request interceptor for logging
aisApi.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for logging and error handling
aisApi.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} - ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error);
    if (error.response) {
      // Server responded with error status
      console.error(`Status: ${error.response.status}, Data:`, error.response.data);
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response received:', error.request);
    } else {
      // Something else happened
      console.error('Error message:', error.message);
    }
    return Promise.reject(error);
  }
);

// ===== SHIPS API ENDPOINTS =====

// ===== TRAFFIC FORECASTING ENDPOINTS =====

/**
 * Get traffic prediction for a given date (YYYY-MM-DD)
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Object>} Traffic prediction data
 */
export const getTrafficPrediction = async (date) => {
  try {
    const response = await aisApi.get(`/traffic/traffic_prediction`, { params: { date } });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to fetch traffic prediction');
  }
};

/**
 * Get speed forecast for a ship
 * @param {Object} payload - { mmsi, imo, ship_name, days_ahead }
 * @returns {Promise<Object>} Speed forecast data
 */
export const getSpeedForecast = async (payload) => {
  try {
    const response = await aisApi.post(`/traffic/speed_forecast`, payload);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to fetch speed forecast');
  }
};

export const getForecastOverview = async (date) => {
  try {
    const response = await aisApi.get('/traffic/forecast_overview', { params: { date } });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to fetch forecast overview');
  }
};

export const getTimeWindowIntensity = async (date) => {
  try {
    const response = await aisApi.get('/traffic/time_window_intensity', { params: { date } });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to fetch time window intensity');
  }
};

export const getSpeedRiskSummary = async ({ mmsi, ship_name }) => {
  try {
    const response = await aisApi.get('/traffic/speed_risk_summary', { params: { mmsi, ship_name } });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to fetch speed risk summary');
  }
};

export const getRandomForecastSeed = async () => {
  try {
    const response = await aisApi.get('/traffic/random_seed');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to fetch random ship seed');
  }
};

/**
 * Get current ship positions for map display
 * @param {Object} params - Query parameters
 * @param {number} params.limit - Maximum number of ships to return (default: 100)
 * @returns {Promise<Array>} Array of ship objects
 */
export const getShips = async (params = {}) => {
  try {
    const response = await aisApi.get('/ships/', { params });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch ships: ${error.message}`);
  }
};

/**
 * Get details for a single ship by MMSI or Ship Name.
 * @param {Object} params - Query parameters
 * @param {string} params.mmsi - Ship's MMSI identifier
 * @param {string} params.shipName - Ship's name
 * @returns {Promise<Object>} Single ship object
 */
export const getShipDetails = async ({ mmsi, shipName }) => {
  try {
    let url = '/ships/details'; // Assuming a new endpoint for single ship details
    const params = {};
    if (mmsi) {
      params.mmsi = mmsi;
    } else if (shipName) {
      params.shipName = shipName;
    } else {
      throw new Error("Either MMSI or shipName must be provided.");
    }
    const response = await aisApi.get(url, { params });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch ship details: ${error.message}`);
  }
};

/**
 * Get ship history (route) by MMSI
 * @param {Object} params - Query parameters
 * @param {string} params.mmsi - Ship's MMSI identifier
 * @returns {Promise<Array>} Array of historical positions
 */
export const getShipRoute = async ({ mmsi }) => {
  try {
    const response = await aisApi.get(`/ships/${mmsi}/route`); // Assuming a new endpoint for ship route
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch ship route for MMSI ${mmsi}: ${error.message}`);
  }
};

// ===== TRENDS API ENDPOINTS =====

/**
 * Get ships active per day
 * @returns {Promise<Array>} Array of daily ship counts
 */
export const getShipsPerDay = async () => {
  try {
    const response = await aisApi.get('/trends/ships-per-day');
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch ships per day: ${error.message}`);
  }
};

/**
 * Get average speed per day
 * @returns {Promise<Array>} Array of daily average speeds
 */
export const getAvgSpeedPerDay = async () => {
  try {
    const response = await aisApi.get('/trends/avg-speed-per-day');
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch average speed per day: ${error.message}`);
  }
};

/**
 * Get ships active per hour
 * @returns {Promise<Array>} Array of hourly ship counts
 */
export const getShipsPerHour = async () => {
  try {
    const response = await aisApi.get('/trends/ships-per-hour');
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch ships per hour: ${error.message}`);
  }
};

/**
 * Get average speed per hour
 * @returns {Promise<Array>} Array of hourly average speeds
 */
export const getAvgSpeedPerHour = async () => {
  try {
    const response = await aisApi.get('/trends/avg-speed-per-hour');
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch average speed per hour: ${error.message}`);
  }
};


/**
 * Get port arrivals per destination
 * @returns {Promise<Array>} Array of destination arrival counts
 */
export const getArrivals = async () => {
  try {
    const response = await aisApi.get('/trends/arrivals');
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch port arrivals: ${error.message}`);
  }
};

export const getArrivalInsights = async (limit = 8) => {
  try {
    const response = await aisApi.get('/trends/arrivals-insights', { params: { limit } });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to fetch arrival insights');
  }
};


// ===== SHIP TYPES API ENDPOINTS =====

/**
 * Get ship type trends per month
 * @returns {Promise<Array>} Array of ship type trends
 */
export const getShipTypeTrends = async () => {
  try {
    const response = await aisApi.get('/ship-types/trends');
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch ship type trends: ${error.message}`);
  }
};

/**
 * Get ship types at a specific destination
 * @param {string} destination - Destination name
 * @returns {Promise<Array>} Array of ship types at destination
 */
export const getShipTypesAtDestination = async (destination) => {
  try {
    const response = await aisApi.get('/ship-types/destinations', {
      params: { destination }
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch ship types at ${destination}: ${error.message}`);
  }
};

/**
 * Get fishing vessels seasonality data
 * @param {Object} params - Query parameters
 * @param {number} params.lat_min - Minimum latitude
 * @param {number} params.lat_max - Maximum latitude  
 * @param {number} params.lon_min - Minimum longitude
 * @param {number} params.lon_max - Maximum longitude
 * @param {number} params.limit - Maximum number of results
 * @returns {Promise<Array>} Array of fishing vessel counts by month
 */
export const getFishingSeasonality = async (params = {}) => {
  try {
    const response = await aisApi.get('/ship-types/fishing-seasonality', { params });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch fishing seasonality: ${error.message}`);
  }
};

/**
 * Get commercial vs non-commercial vessel ratio
 * @returns {Promise<Array>} Array of monthly commercial vs non-commercial data
 */
export const getCommercialRatio = async () => {
  try {
    const response = await aisApi.get('/ship-types/ratio');
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch commercial ratio: ${error.message}`);
  }
};

/**
 * Get total number of ships in the current month
 * @returns {Promise<Object>} Object with total ships count and month info
 */
export const getMonthlyShipTotal = async () => {
  try {
    const response = await aisApi.get('/ship-types/monthly-total');
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch monthly ship total: ${error.message}`);
  }
};




// ===== UTILITY FUNCTIONS =====

/**
 * Test API connection
 * @returns {Promise<boolean>} True if API is reachable
 */
export const testApiConnection = async () => {
  try {
    const response = await aisApi.get('/ships/', { params: { limit: 1 } });
    return response.status === 200;
  } catch (error) {
    console.error('API connection test failed:', error);
    return false;
  }
};

/**
 * Get API health status
 * @returns {Promise<Object>} API health information
 */
export const getApiHealth = async () => {
  try {
    const isConnected = await testApiConnection();
    return {
      status: isConnected ? 'healthy' : 'unhealthy',
      baseUrl: API_BASE_URL,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'error',
      baseUrl: API_BASE_URL,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
};

// Default export
export default aisApi;
