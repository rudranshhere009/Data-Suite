from flask import Blueprint, request, jsonify
import pandas as pd
import math
from datetime import datetime
import os

riskforecast_bp = Blueprint('riskforecast', __name__)

RISK_RADIUS_KM = 1.0

def resolve_csv_path():
    candidates = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ships_with_dynamics_heading.csv")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ships_with_dynamics_heading.csv")),
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    return candidates[0]

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def format_datetime(date_str, time_str):
    """Convert various date/time formats to CSV format (YYYY-MM-DD HH:MM:SS)"""
    try:
        # Handle different date formats
        if '-' in date_str:
            parts = date_str.split('-')
            if len(parts[0]) == 4:  # YYYY-MM-DD
                formatted_date = date_str
            else:  # DD-MM-YYYY
                formatted_date = f"{parts[2]}-{parts[1]}-{parts[0]}"
        else:
            formatted_date = date_str
        
        # Handle time format - add seconds if missing
        if time_str.count(':') == 1:  # HH:MM
            formatted_time = f"{time_str}:00"
        else:  # HH:MM:SS
            formatted_time = time_str
            
        return f"{formatted_date} {formatted_time}"
    except:
        return f"{date_str} {time_str}"

@riskforecast_bp.route('/risk_by_datetime', methods=['GET'])
def risk_by_datetime():
    ship_name = request.args.get('ship_name')
    date = request.args.get('date')
    time = request.args.get('time')
    if not ship_name or not date or not time:
        return jsonify({'error': 'Missing parameters'}), 400
    
    df = pd.read_csv(resolve_csv_path())
    dt_str = format_datetime(date, time)
    ship_row = df[(df['ship_name'] == ship_name) & (df['rec_time'] == dt_str)]
    if ship_row.empty:
        return jsonify({
            "ship_name": ship_name,
            "datetime": dt_str,
            "alert": False,
            "message": "Ship or datetime not found."
        })
    lat1 = ship_row.iloc[0]['latitude']
    lon1 = ship_row.iloc[0]['longitude']
    others = df[(df['rec_time'] == dt_str) & (df['ship_name'] != ship_name)]
    risks = []
    for _, row in others.iterrows():
        lat2, lon2 = row['latitude'], row['longitude']
        dist = haversine(lat1, lon1, lat2, lon2)
        if dist <= RISK_RADIUS_KM:
            risks.append({
                "other_ship": row['ship_name'],
                "distance_km": round(dist, 3),
                "latitude": lat2,
                "longitude": lon2
            })
    if risks:
        return jsonify({
            "ship_name": ship_name,
            "datetime": dt_str,
            "alert": True,
            "message": "Risk detected.",
            "details": risks
        })
    else:
        return jsonify({
            "ship_name": ship_name,
            "datetime": dt_str,
            "alert": False,
            "message": "Clean route. No risk detected."
        })

@riskforecast_bp.route('/risk_by_ship', methods=['GET'])
def risk_by_ship():
    ship_name = request.args.get('ship_name')
    if not ship_name:
        return jsonify({'error': 'Missing ship_name parameter'}), 400
    df = pd.read_csv(resolve_csv_path())
    ship_rows = df[df['ship_name'] == ship_name]
    if ship_rows.empty:
        return jsonify({
            "ship_name": ship_name,
            "risk_dates": [],
            "alert": False,
            "message": "Ship not found."
        })
    risk_dates = []
    for _, ship_row in ship_rows.iterrows():
        dt_str = ship_row['rec_time']
        lat1, lon1 = ship_row['latitude'], ship_row['longitude']
        others = df[(df['rec_time'] == dt_str) & (df['ship_name'] != ship_name)]
        for _, row in others.iterrows():
            lat2, lon2 = row['latitude'], row['longitude']
            dist = haversine(lat1, lon1, lat2, lon2)
            if dist <= RISK_RADIUS_KM:
                risk_dates.append(dt_str)
                break
    if risk_dates:
        return jsonify({
            "ship_name": ship_name,
            "risk_dates": risk_dates,
            "alert": True,
            "message": "Risk detected on these dates."
        })
    else:
        return jsonify({
            "ship_name": ship_name,
            "risk_dates": [],
            "alert": False,
            "message": "Clean route. No risk detected."
        })
