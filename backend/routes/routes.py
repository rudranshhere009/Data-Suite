from flask import Blueprint, request, jsonify
from flask_cors import CORS
import pandas as pd
import os

routes_bp = Blueprint('routes', __name__)

def resolve_csv_path():
    candidates = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ships_with_dynamics_heading.csv")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ships_with_dynamics_heading.csv")),
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    return candidates[0]


@routes_bp.route('/search_ship', methods=['GET'])
def search_ship():
    ship_identifier = request.args.get('identifier')
    if not ship_identifier:
        return jsonify({'error': 'No ship identifier provided'}), 400

    df = pd.read_csv(resolve_csv_path())

    # Search by MMSI or Ship Name
    result = df[(df['mmsi'].astype(str) == ship_identifier) | (df['ship_name'] == ship_identifier)]

    if result.empty:
        return jsonify({'error': 'Ship not found'}), 404

    return jsonify(result.to_dict('records')[0])

@routes_bp.route('/ship_route', methods=['GET'])
def ship_route():
    mmsi = request.args.get('mmsi')
    if not mmsi:
        return jsonify({'error': 'No MMSI provided'}), 400

    try:
        # Read the CSV file to get route data for the specific MMSI
        df = pd.read_csv(resolve_csv_path())
        
        # Filter data for the specific MMSI
        ship_data = df[df['mmsi'].astype(str) == str(mmsi)]
        
        if ship_data.empty:
            return jsonify({'error': 'No route data found for this MMSI'}), 404
        
        # Convert to route format expected by frontend
        route_data = []
        for _, row in ship_data.iterrows():
            route_point = {
                'lat': float(row['latitude']) if pd.notna(row['latitude']) else None,
                'lon': float(row['longitude']) if pd.notna(row['longitude']) else None,
                'timestamp': row['rec_time'] if pd.notna(row['rec_time']) else '2025-09-18T10:00:00Z',
                'sog': float(row['sog']) if pd.notna(row['sog']) else 0.0,
                'cog': float(row['cog']) if pd.notna(row['cog']) else 0.0,
                'heading': float(row['true_heading']) if pd.notna(row['true_heading']) else 0.0,
                'destination': row['destination'] if pd.notna(row['destination']) else 'Unknown'
            }
            route_data.append(route_point)
        
        return jsonify(route_data)
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch route data: {str(e)}'}), 500

@routes_bp.route('/ships/<mmsi>/route', methods=['GET'])
def ship_route_alt(mmsi):
    """Alternative endpoint to match frontend API expectations"""
    if not mmsi:
        return jsonify({'error': 'No MMSI provided'}), 400

    try:
        # Read the CSV file to get route data for the specific MMSI
        df = pd.read_csv(resolve_csv_path())
        
        # Filter data for the specific MMSI
        ship_data = df[df['mmsi'].astype(str) == str(mmsi)]
        
        if ship_data.empty:
            return jsonify({'error': 'No route data found for this MMSI'}), 404
        
        # Convert to route format expected by frontend
        route_data = []
        for _, row in ship_data.iterrows():
            route_point = {
                'lat': float(row['latitude']) if pd.notna(row['latitude']) else None,
                'lon': float(row['longitude']) if pd.notna(row['longitude']) else None,
                'timestamp': row['rec_time'] if pd.notna(row['rec_time']) else '2025-09-18T10:00:00Z',
                'sog': float(row['sog']) if pd.notna(row['sog']) else 0.0,
                'cog': float(row['cog']) if pd.notna(row['cog']) else 0.0,
                'heading': float(row['true_heading']) if pd.notna(row['true_heading']) else 0.0,
                'destination': row['destination'] if pd.notna(row['destination']) else 'Unknown'
            }
            route_data.append(route_point)
        
        return jsonify(route_data)
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch route data: {str(e)}'}), 500
