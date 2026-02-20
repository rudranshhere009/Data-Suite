from flask import Blueprint, request, jsonify
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA
import numpy as np
import os

traffic_bp = Blueprint("traffic", __name__)

def resolve_csv_path():
    candidates = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ships_with_dynamics_heading.csv")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ships_with_dynamics_heading.csv")),
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    return candidates[0]

def get_ship_data():
    """Load CSV data - helper function to avoid import-time loading"""
    DATA_PATH = resolve_csv_path()
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"CSV file not found at: {DATA_PATH}")
    return pd.read_csv(DATA_PATH)

@traffic_bp.route("/traffic_prediction", methods=["GET"])
def traffic_prediction():
    try:
        df = get_ship_data()
        df["rec_time"] = pd.to_datetime(df["rec_time"], format="%Y-%m-%d %H:%M:%S")
        
        def clean_destination(dest):
            if pd.isna(dest) or dest in ["UNKNOWN", "0", "TBA", "", "PORT_REACHED"]:
                return None
            dest = dest.strip().upper()
            if dest in ["IN TRANSIT", "WAITING"]:
                return "IN_TRANSIT"
            return dest
            
        df["destination_clean"] = df["destination"].apply(clean_destination)
        target_date_str = request.args.get("date")
        if not target_date_str:
            return jsonify({"error": "Please provide a date parameter in format YYYY-MM-DD"}), 400
        try:
            target_date = pd.to_datetime(target_date_str)
        except Exception:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
        df_filtered = df[df["rec_time"] <= target_date]
        latest_records = df_filtered.sort_values("rec_time").groupby("mmsi").tail(1)
        forecast = {}
        total_reached = 0
        total_in_transit = 0
        for _, row in latest_records.iterrows():
            dest = row["destination_clean"]
            if not dest:
                continue
            if dest == "IN_TRANSIT":
                total_in_transit += 1
            else:
                forecast[dest] = {"reached": forecast.get(dest, {"reached": 0})["reached"] + 1}
                total_reached += 1
        return jsonify({
            "date": target_date.strftime("%Y-%m-%d"),
            "totals": {
                "reached": total_reached,
                "in_transit": total_in_transit
            },
            "ships_at_ports": forecast
        })
    except FileNotFoundError as e:
        return jsonify({"error": f"Data file not found: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

@traffic_bp.route("/speed_forecast", methods=["POST"])
def speed_forecast():
    try:
        df = get_ship_data()
        df["rec_time"] = pd.to_datetime(df["rec_time"], format="%Y-%m-%d %H:%M:%S")
        data = request.get_json()
        mmsi = data.get("mmsi")
        imo = data.get("imo")
        ship_name = data.get("ship_name")
        days_ahead = int(data.get("days_ahead", 1))
        df["mmsi"] = df["mmsi"].astype(str)
        df["imo"] = df["imo"].astype(str)
        df["ship_name"] = df["ship_name"].astype(str)
        if mmsi:
            ship_data = df[df["mmsi"] == str(mmsi)]
        elif imo:
            ship_data = df[df["imo"] == str(imo)]
        elif ship_name:
            ship_data = df[df["ship_name"].str.upper() == ship_name.upper()]
        else:
            return jsonify({"error": "Provide at least one identifier: mmsi, imo, or ship_name"}), 400
        if ship_data.empty:
            return jsonify({"error": "Ship not found"}), 404
        ship_data = ship_data.sort_values("rec_time")
        sog_series = ship_data["sog"].values
        if len(sog_series) < 2:
            # If not enough data for ARIMA, return the last known speed for all days
            last_speed = float(sog_series[-1])
            return jsonify({
                "identifier_used": mmsi or imo or ship_name,
                "days_ahead": days_ahead,
                "predicted_speed": last_speed,
                "data": [last_speed] * days_ahead,
                "summary": f"Predicted speed for next {days_ahead} days: {last_speed:.2f} knots (based on last known speed)"
            })
        try:
            model = ARIMA(sog_series, order=(1, 1, 0))
            model_fit = model.fit()
            forecast = model_fit.forecast(steps=days_ahead)
            forecast_list = [float(f) for f in forecast]
            return jsonify({
                "identifier_used": mmsi or imo or ship_name,
                "days_ahead": days_ahead,
                "predicted_speed": float(forecast[-1]),
                "data": forecast_list,
                "summary": f"Predicted speed for next {days_ahead} days using ARIMA model"
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    except FileNotFoundError as e:
        return jsonify({"error": f"Data file not found: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500
