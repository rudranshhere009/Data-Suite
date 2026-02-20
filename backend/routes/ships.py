from flask import Blueprint, jsonify, request
from flask_cors import CORS
from sqlalchemy import text
from models import db

ships_bp = Blueprint("ships", __name__)
CORS(ships_bp)


@ships_bp.route("/suggest", methods=["GET"])
def suggest_ships():
    q = (request.args.get("q") or "").strip()
    limit = request.args.get("limit", default=6, type=int)
    limit = max(1, min(limit, 12))

    if len(q) < 1:
        return jsonify([])

    like_starts = f"{q}%"
    like_contains = f"%{q}%"

    query = text("""
        WITH latest AS (
            SELECT DISTINCT ON (mmsi)
                mmsi,
                ship_name,
                rec_time
            FROM ais_data
            WHERE mmsi IS NOT NULL
              AND ship_name IS NOT NULL
              AND TRIM(ship_name) <> ''
            ORDER BY mmsi, rec_time DESC
        )
        SELECT
            CAST(mmsi AS TEXT) AS mmsi,
            ship_name
        FROM latest
        WHERE ship_name ILIKE :starts
           OR CAST(mmsi AS TEXT) LIKE :starts
           OR ship_name ILIKE :contains
        ORDER BY
            CASE WHEN ship_name ILIKE :starts THEN 0
                 WHEN CAST(mmsi AS TEXT) LIKE :starts THEN 1
                 ELSE 2 END,
            ship_name
        LIMIT :limit
    """)

    result = db.session.execute(query, {
        "starts": like_starts,
        "contains": like_contains,
        "limit": limit
    }).mappings().all()

    return jsonify([
        {
            "mmsi": row["mmsi"],
            "ship_name": row["ship_name"],
            "label": f"{row['ship_name']} ({row['mmsi']})"
        }
        for row in result
    ])

# Get current ship positions for map display
@ships_bp.route("/", methods=["GET"])
def get_ships():
    # Optional parameters for filtering - Allow large limits for showing all ships
    limit = request.args.get("limit", default=100, type=int)
    
    # For performance, cap the maximum limit but allow up to 150,000 ships
    if limit > 150000:
        limit = 150000
    
    # Get the latest position for each ship (MMSI)
    query = text("""
        WITH latest_positions AS (
            SELECT DISTINCT ON (mmsi) 
                mmsi,
                latitude,
                longitude,
                ship_name,
                ship_type,
                sog,
                cog,
                true_heading,
                destination,
                draught,
                length,
                beam as width,
                rec_time,
                eta
            FROM ais_data 
            WHERE mmsi IS NOT NULL 
            AND latitude IS NOT NULL AND longitude IS NOT NULL
            AND latitude BETWEEN -90 AND 90 
            AND longitude BETWEEN -180 AND 180
            ORDER BY mmsi, rec_time DESC
        )
        SELECT * FROM latest_positions
        WHERE latitude != 0 AND longitude != 0
        ORDER BY rec_time DESC
        LIMIT :limit
    """)
    
    result = db.session.execute(query, {"limit": limit}).fetchall()
    
    ships = []
    for row in result:
        ships.append({
            "mmsi": str(row[0]),
            "name": row[3] or f"Vessel {row[0]}",
            "lat": float(row[1]) if row[1] else 0.0,
            "lon": float(row[2]) if row[2] else 0.0,
            "shipType": row[4] or "Unknown",
            "sog": float(row[5]) if row[5] else 0.0,
            "cog": float(row[6]) if row[6] else 0.0,
            "heading": float(row[7]) if row[7] else float(row[6]) if row[6] else 0.0,
            "destination": row[8] or "Unknown",
            "draught": float(row[9]) if row[9] else 0.0,
            "length": float(row[10]) if row[10] else 0.0,
            "width": float(row[11]) if row[11] else 0.0,
            "lastUpdate": str(row[12]) if row[12] else "",
            "eta": row[13] or ""
        })
    
    return jsonify(ships)

# Get details for a single ship by MMSI
@ships_bp.route("/details", methods=["GET"])
def get_ship_details():
    mmsi = request.args.get("mmsi", type=int)
    ship_name = request.args.get("shipName")

    if not mmsi and not ship_name:
        return jsonify({"message": "Either MMSI or shipName must be provided."}), 400

    query_params = {}
    where_clause = ""

    if mmsi:
        where_clause = "WHERE mmsi = :mmsi"
        query_params["mmsi"] = mmsi
    elif ship_name:
        where_clause = "WHERE ship_name ILIKE :ship_name" # ILIKE for case-insensitive search
        query_params["ship_name"] = f"%{ship_name}%" # Partial match

    query = text(f"""
        SELECT DISTINCT ON (mmsi) 
            mmsi,
            latitude,
            longitude,
            ship_name,
            ship_type,
            sog,
            cog,
            true_heading,
            destination,
            draught,
            length,
            beam as width,
            rec_time,
            eta
        FROM ais_data 
        {where_clause}
        ORDER BY mmsi, rec_time DESC
    """)
    
    result = db.session.execute(query, query_params).fetchone()
    
    if result:
        ship_details = {
            "MMSI": str(result[0]),
            "LATITUDE": float(result[1]) if result[1] else 0.0,
            "LONGITUDE": float(result[2]) if result[2] else 0.0,
            "SHIP_NAME": result[3] or f"Vessel {result[0]}",
            "SHIP_TYPE": result[4] or "Unknown",
            "SOG": float(result[5]) if result[5] else 0.0,
            "COG": float(result[6]) if result[6] else 0.0,
            "HEADING": float(result[7]) if result[7] else float(result[6]) if result[6] else 0.0,
            "DESTINATION": result[8] or "Unknown",
            "DRAUGHT": float(result[9]) if result[9] else 0.0,
            "LENGTH": float(result[10]) if result[10] else 0.0,
            "WIDTH": float(result[11]) if result[11] else 0.0,
            "LAST_UPDATE": str(result[12]) if result[12] else "",
            "ETA": result[13] or ""
        }
        return jsonify(ship_details)
    else:
        return jsonify({"message": "Ship not found"}), 404

# Get ship history (route) by MMSI
@ships_bp.route("/<int:mmsi>/route", methods=["GET"])
def get_ship_route(mmsi):
    # Get total count of records for this ship
    count_query = text("""
        SELECT COUNT(*) as total
        FROM ais_data 
        WHERE mmsi = :mmsi
    """)
    
    count_result = db.session.execute(count_query, {"mmsi": mmsi}).fetchone()
    total_records = count_result[0] if count_result else 0
    
    if total_records == 0:
        return jsonify([])
    
    if total_records <= 500:
        # If we have 500 or fewer records, return all of them
        query = text("""
            SELECT rec_time, latitude, longitude, sog, destination
            FROM ais_data 
            WHERE mmsi = :mmsi
            ORDER BY rec_time ASC
        """)
        result = db.session.execute(query, {"mmsi": mmsi}).fetchall()
    else:
        # Get first record (start point)
        first_query = text("""
            SELECT rec_time, latitude, longitude, sog, destination
            FROM ais_data 
            WHERE mmsi = :mmsi
            ORDER BY rec_time ASC
            LIMIT 1
        """)
        
        # Get last record (end point)
        last_query = text("""
            SELECT rec_time, latitude, longitude, sog, destination
            FROM ais_data 
            WHERE mmsi = :mmsi
            ORDER BY rec_time DESC
            LIMIT 1
        """)
        
        # Get 498 evenly distributed middle points
        # Calculate step size to get evenly distributed points
        step_size = max(1, (total_records - 2) // 498)  # -2 because we exclude first and last
        
        middle_query = text("""
            WITH numbered_data AS (
                SELECT rec_time, latitude, longitude, sog, destination,
                       ROW_NUMBER() OVER (ORDER BY rec_time ASC) as row_num
                FROM ais_data 
                WHERE mmsi = :mmsi
            )
            SELECT rec_time, latitude, longitude, sog, destination
            FROM numbered_data
            WHERE row_num > 1 AND row_num < :total_records
            AND (row_num - 1) % :step_size = 0
            ORDER BY rec_time ASC
            LIMIT 498
        """)
        
        # Execute all queries
        first_result = db.session.execute(first_query, {"mmsi": mmsi}).fetchall()
        last_result = db.session.execute(last_query, {"mmsi": mmsi}).fetchall()
        middle_result = db.session.execute(middle_query, {
            "mmsi": mmsi, 
            "total_records": total_records,
            "step_size": step_size
        }).fetchall()
        
        # Combine results: first + middle + last
        result = first_result + middle_result + last_result
    
    route_data = []
    for row in result:
        route_data.append({
            "timestamp": str(row[0]),
            "lat": float(row[1]) if row[1] else 0.0,
            "lon": float(row[2]) if row[2] else 0.0,
            "sog": float(row[3]) if row[3] else 0.0,
            "destination": row[4] or "Unknown"
        })
    
    return jsonify(route_data)
