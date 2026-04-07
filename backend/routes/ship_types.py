from flask import Blueprint, request, jsonify
from flask_cors import CORS
from sqlalchemy import text
from models import db

ship_types_bp = Blueprint("ship_types", __name__)
CORS(ship_types_bp)

# 1. Ship types per month
@ship_types_bp.route("/trends", methods=["GET"])
def ship_type_trends():
    query = text("""
        SELECT INITCAP(LOWER(ship_type)) AS normalized_ship_type,
               COUNT(DISTINCT mmsi) AS vessel_count
        FROM ais_data
        WHERE rec_time IS NOT NULL AND rec_time != ''
        GROUP BY normalized_ship_type
        ORDER BY vessel_count DESC;
    """)
    result = db.session.execute(query).fetchall()
    data = [{"ship_type": r[0], "count": r[1]} for r in result]
    return jsonify(data)



# 2. Ship type share at a destination
@ship_types_bp.route("/destinations", methods=["GET"])
def ship_types_at_destination():
    destination = request.args.get("destination")
    if not destination:
        return jsonify({"error": "destination is required"}), 400
    
    query = text("""
        SELECT ship_type,
               COUNT(DISTINCT mmsi) AS vessel_count
        FROM ais_data
        WHERE destination = :destination
        GROUP BY ship_type;
    """)
    result = db.session.execute(query, {"destination": destination}).fetchall()
    data = [{"ship_type": r[0], "count": r[1]} for r in result]
    return jsonify(data)


# 3. Fishing vessels seasonality
@ship_types_bp.route("/fishing-seasonality", methods=["GET"])
def fishing_seasonality():
    query = text("""
        SELECT EXTRACT(MONTH FROM CAST(rec_time AS TIMESTAMP)) AS month,
               COUNT(DISTINCT mmsi) AS fishing_vessels
        FROM ais_data
        WHERE ship_type = 'Fishing' AND rec_time IS NOT NULL AND rec_time != ''
        GROUP BY month
        ORDER BY month;
    """)
    result = db.session.execute(query).fetchall()
    data = [{"month": int(r[0]), "fishing_vessels": r[1]} for r in result]
    return jsonify(data)


# 4. Commercial vs Non-commercial ratio
@ship_types_bp.route("/ratio", methods=["GET"])
def commercial_vs_noncommercial():
    query = text("""
        SELECT DATE_TRUNC('month', CAST(rec_time AS TIMESTAMP)) AS month,
               COUNT(DISTINCT CASE WHEN ship_type IN ('Cargo', 'Tanker', 'Passenger') THEN mmsi END) AS commercial,
               COUNT(DISTINCT CASE WHEN ship_type NOT IN ('Cargo', 'Tanker', 'Passenger') THEN mmsi END) AS non_commercial
        FROM ais_data
        WHERE rec_time IS NOT NULL AND rec_time != ''
        GROUP BY month
        ORDER BY month;
    """)
    result = db.session.execute(query).fetchall()
    data = [{"month": str(r[0]), "commercial": r[1], "non_commercial": r[2]} for r in result]
    return jsonify(data)

# 4. Total ships in current month and overall database
@ship_types_bp.route("/monthly-total", methods=["GET"])
def monthly_ship_total():
    """Get total number of unique ships in the current month and in the entire database"""
    try:
        # Get total ships in current month
        monthly_query = text("""
            SELECT COUNT(DISTINCT mmsi) AS total_ships_this_month
            FROM ais_data
            WHERE DATE_TRUNC('month', CAST(rec_time AS TIMESTAMP)) = DATE_TRUNC('month', CURRENT_DATE)
              AND rec_time IS NOT NULL 
              AND rec_time != ''
              AND mmsi IS NOT NULL;
        """)
        monthly_result = db.session.execute(monthly_query).fetchone()
        
        # Get total ships in entire database
        total_query = text("""
            SELECT COUNT(DISTINCT mmsi) AS total_ships_in_db
            FROM ais_data
            WHERE rec_time IS NOT NULL 
              AND rec_time != ''
              AND mmsi IS NOT NULL;
        """)
        total_result = db.session.execute(total_query).fetchone()
        
        # Get the month name for context
        month_query = text("""
            SELECT TO_CHAR(CURRENT_DATE, 'Month YYYY') AS current_month;
        """)
        month_result = db.session.execute(month_query).fetchone()
        
        # Get total records count for additional context
        records_query = text("""
            SELECT COUNT(*) AS total_records
            FROM ais_data
            WHERE rec_time IS NOT NULL 
              AND rec_time != '';
        """)
        records_result = db.session.execute(records_query).fetchone()
        
        data = {
            "ships_this_month": monthly_result[0] if monthly_result else 0,
            "total_ships_in_db": total_result[0] if total_result else 0,
            "total_records": records_result[0] if records_result else 0,
            "month": month_result[0].strip() if month_result else "Unknown",
            "timestamp": str(db.session.execute(text("SELECT CURRENT_TIMESTAMP")).fetchone()[0])
        }
        
        return jsonify(data)
        
    except Exception as e:
        return jsonify({
            "error": str(e), 
            "ships_this_month": 0, 
            "total_ships_in_db": 0,
            "total_records": 0,
            "month": "Error"
        }), 500
