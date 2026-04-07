from flask import Blueprint, request, jsonify
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA
import numpy as np
import os
from sqlalchemy import text
from config import db

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


@traffic_bp.route("/random_seed", methods=["GET"])
def random_seed():
    """Return a random valid ship seed from ais_data for quick form fill actions."""
    try:
        row = db.session.execute(text("""
            SELECT
                CAST(mmsi AS TEXT) AS mmsi,
                ship_name,
                rec_time
            FROM ais_data
            WHERE mmsi IS NOT NULL
              AND ship_name IS NOT NULL
              AND TRIM(ship_name) <> ''
              AND rec_time IS NOT NULL
              AND TRIM(rec_time) <> ''
            ORDER BY RANDOM()
            LIMIT 1
        """)).mappings().first()

        if not row:
            return jsonify({"error": "No valid AIS records found"}), 404

        rec_time_value = str(row["rec_time"])
        date_part = ""
        time_part = ""

        try:
            parsed = pd.to_datetime(rec_time_value, format="%Y-%m-%d %H:%M:%S", errors="coerce")
            if pd.notna(parsed):
                date_part = parsed.strftime("%Y-%m-%d")
                time_part = parsed.strftime("%H:%M")
        except Exception:
            pass

        return jsonify({
            "mmsi": row["mmsi"],
            "ship_name": row["ship_name"],
            "rec_time": rec_time_value,
            "date": date_part,
            "time": time_part
        })
    except Exception as e:
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

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

@traffic_bp.route("/forecast_overview", methods=["GET"])
def forecast_overview():
    """High-level forecast insight metrics for a selected date."""
    try:
        df = get_ship_data()
        df["rec_time"] = pd.to_datetime(df["rec_time"], format="%Y-%m-%d %H:%M:%S", errors="coerce")
        date_str = request.args.get("date")
        if not date_str:
            return jsonify({"error": "date parameter is required in YYYY-MM-DD format"}), 400
        target_date = pd.to_datetime(date_str, errors="coerce")
        if pd.isna(target_date):
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

        df = df[df["rec_time"].notna() & (df["rec_time"] <= target_date)]
        if df.empty:
            return jsonify({
                "date": target_date.strftime("%Y-%m-%d"),
                "total_vessels_considered": 0,
                "active_destinations": 0,
                "top_destination": None,
                "route_pressure_index": 0.0
            })

        latest_records = df.sort_values("rec_time").groupby("mmsi").tail(1)
        latest_records["destination_norm"] = latest_records["destination"].fillna("UNKNOWN").astype(str).str.strip()
        latest_records = latest_records[latest_records["destination_norm"].ne("")]

        destination_counts = latest_records["destination_norm"].value_counts()
        top_destination = destination_counts.index[0] if len(destination_counts) else None
        top_destination_count = int(destination_counts.iloc[0]) if len(destination_counts) else 0
        total_vessels = int(latest_records["mmsi"].nunique())
        active_destinations = int(destination_counts.shape[0])
        pressure_index = round((top_destination_count / max(total_vessels, 1)) * 100, 2)

        return jsonify({
            "date": target_date.strftime("%Y-%m-%d"),
            "total_vessels_considered": total_vessels,
            "active_destinations": active_destinations,
            "top_destination": top_destination,
            "route_pressure_index": pressure_index
        })
    except Exception as e:
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

@traffic_bp.route("/time_window_intensity", methods=["GET"])
def time_window_intensity():
    """Returns activity intensity by hour and the best operating window."""
    try:
        df = get_ship_data()
        df["rec_time"] = pd.to_datetime(df["rec_time"], format="%Y-%m-%d %H:%M:%S", errors="coerce")
        date_str = request.args.get("date")
        if not date_str:
            return jsonify({"error": "date parameter is required in YYYY-MM-DD format"}), 400
        target_date = pd.to_datetime(date_str, errors="coerce")
        if pd.isna(target_date):
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

        day_df = df[df["rec_time"].dt.date == target_date.date()].copy()
        if day_df.empty:
            return jsonify({
                "date": target_date.strftime("%Y-%m-%d"),
                "best_hour_utc": None,
                "top_hours": [],
                "hourly_activity": []
            })

        day_df["hour"] = day_df["rec_time"].dt.hour
        hourly_counts = day_df.groupby("hour")["mmsi"].nunique().sort_values(ascending=False)
        top_hours = [
            {"hour_utc": int(hour), "active_vessels": int(count)}
            for hour, count in hourly_counts.head(3).items()
        ]
        best_hour = int(hourly_counts.index[0]) if len(hourly_counts) else None
        activity_series = [
            {"hour_utc": int(hour), "active_vessels": int(count)}
            for hour, count in hourly_counts.sort_index().items()
        ]

        return jsonify({
            "date": target_date.strftime("%Y-%m-%d"),
            "best_hour_utc": best_hour,
            "top_hours": top_hours,
            "hourly_activity": activity_series
        })
    except Exception as e:
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

@traffic_bp.route("/speed_risk_summary", methods=["GET"])
def speed_risk_summary():
    """Speed volatility and risk-band insights for a selected vessel."""
    try:
        df = get_ship_data()
        df["rec_time"] = pd.to_datetime(df["rec_time"], format="%Y-%m-%d %H:%M:%S", errors="coerce")
        mmsi = request.args.get("mmsi")
        ship_name = request.args.get("ship_name")
        if not mmsi and not ship_name:
            return jsonify({"error": "Provide mmsi or ship_name"}), 400

        df["mmsi"] = df["mmsi"].astype(str)
        df["ship_name"] = df["ship_name"].astype(str)
        if mmsi:
            ship_df = df[df["mmsi"] == str(mmsi)]
            identifier = str(mmsi)
        else:
            ship_df = df[df["ship_name"].str.upper() == str(ship_name).upper()]
            identifier = str(ship_name)

        if ship_df.empty:
            return jsonify({"error": "Ship not found"}), 404

        ship_df = ship_df.sort_values("rec_time")
        sog = pd.to_numeric(ship_df["sog"], errors="coerce").dropna()
        if sog.empty:
            return jsonify({"error": "No valid speed data found for this ship"}), 404

        avg_speed = float(sog.mean())
        max_speed = float(sog.max())
        min_speed = float(sog.min())
        volatility = float(sog.std(ddof=0)) if len(sog) > 1 else 0.0
        last_speed = float(sog.iloc[-1])

        if volatility < 1.5:
            risk_band = "LOW"
        elif volatility < 3.5:
            risk_band = "MEDIUM"
        else:
            risk_band = "HIGH"

        return jsonify({
            "identifier": identifier,
            "samples": int(len(sog)),
            "average_speed": round(avg_speed, 3),
            "max_speed": round(max_speed, 3),
            "min_speed": round(min_speed, 3),
            "latest_speed": round(last_speed, 3),
            "speed_volatility_index": round(volatility, 3),
            "risk_band": risk_band
        })
    except Exception as e:
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500
