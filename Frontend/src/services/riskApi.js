import axios from 'axios';

const API_BASE_URL = '/api';

const aisApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false,
});

export const getRiskByDatetime = async (ship_name, date, time) => {
  try {
    const response = await aisApi.get(`/riskforecast/risk_by_datetime`, {
      params: { ship_name, date, time },
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to fetch risk by datetime');
  }
};

export const getRiskByShip = async (ship_name) => {
  try {
    const response = await aisApi.get(`/riskforecast/risk_by_ship`, {
      params: { ship_name },
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to fetch risk by ship');
  }
};
