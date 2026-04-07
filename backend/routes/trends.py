from flask import Blueprint, jsonify, request
from flask_cors import CORS
from models import db, AISData
from sqlalchemy import func, TIMESTAMP, text

trends_bp = Blueprint('trends', __name__)
CORS(trends_bp)

# 1. Ships active per day
@trends_bp.route("/ships-per-day")
def ships_per_day():
    result = db.session.query(
        func.date(AISData.rec_time).label("day"),
        func.count(func.distinct(AISData.mmsi)).label("unique_ships")
    ).group_by(func.date(AISData.rec_time)).all()

    return jsonify([{"day": str(r.day), "ships": r.unique_ships} for r in result])

# 2. Average speed per day
@trends_bp.route("/avg-speed-per-day")
def avg_speed_per_day():
    result = db.session.query(
        func.date(AISData.rec_time).label("day"),
        func.avg(AISData.sog).label("avg_sog")
    ).group_by(func.date(AISData.rec_time)).all()

    return jsonify([{"day": str(r.day), "avg_speed": float(r.avg_sog)} for r in result])

# 3. Port arrivals per day
@trends_bp.route("/arrivals")
def arrivals():
    result = db.session.query(
        AISData.destination,
        func.count(AISData.id).label("arrivals")
    ).filter(AISData.destination.isnot(None)) \
     .group_by(AISData.destination).all()

    return jsonify([{"destination": r.destination, "arrivals": r.arrivals} for r in result])


@trends_bp.route("/arrivals-insights")
def arrivals_insights():
    limit = 8
    try:
        limit = int(request.args.get("limit", 8))
    except Exception:
        limit = 8
    limit = max(1, min(limit, 20))

    query = text("""
        WITH cleaned AS (
            SELECT
                mmsi,
                TRIM(destination) AS destination,
                CAST(rec_time AS TIMESTAMP) AS rec_ts
            FROM ais_data
            WHERE destination IS NOT NULL
              AND TRIM(destination) <> ''
              AND UPPER(TRIM(destination)) NOT IN ('UNKNOWN', 'TBA', '0', 'IN TRANSIT', 'WAITING', 'PORT_REACHED')
              AND rec_time IS NOT NULL
        ),
        latest AS (
            SELECT DISTINCT ON (mmsi)
                mmsi,
                destination
            FROM cleaned
            ORDER BY mmsi, rec_ts DESC
        ),
        top AS (
            SELECT
                destination,
                COUNT(*)::INT AS active_ships
            FROM latest
            GROUP BY destination
            ORDER BY active_ships DESC, destination
            LIMIT :limit
        ),
        totals AS (
            SELECT
                destination,
                COUNT(*)::INT AS total_records
            FROM cleaned
            GROUP BY destination
        )
        SELECT
            top.destination,
            top.active_ships,
            COALESCE(totals.total_records, 0) AS total_records
        FROM top
        LEFT JOIN totals ON totals.destination = top.destination
        ORDER BY top.active_ships DESC, total_records DESC, top.destination
    """)

    rows = db.session.execute(query, {"limit": limit}).mappings().all()
    return jsonify([
        {
            "destination": row["destination"],
            "active_ships": int(row["active_ships"]),
            "total_records": int(row["total_records"]),
        }
        for row in rows
    ])

# 4. Ships active per hour
@trends_bp.route("/ships-per-hour")
def ships_per_hour():
    result = db.session.query(
        func.date_trunc('hour', AISData.rec_time.cast(TIMESTAMP)).label("hour"),
        func.count(func.distinct(AISData.mmsi)).label("unique_ships")
    ).group_by("hour").all()

    return jsonify([{"hour": str(r.hour), "ships": r.unique_ships} for r in result])

# 5. Average speed per hour
@trends_bp.route("/avg-speed-per-hour")
def avg_speed_per_hour():
    result = db.session.query(
        func.date_trunc('hour', AISData.rec_time.cast(TIMESTAMP)).label("hour"),
        func.avg(AISData.sog).label("avg_sog")
    ).group_by("hour").all()

    return jsonify([{"hour": str(r.hour), "avg_speed": float(r.avg_sog)} for r in result])
