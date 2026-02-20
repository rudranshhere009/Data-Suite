from flask import Blueprint, jsonify
from flask_cors import CORS
from models import db, AISData
from sqlalchemy import func, TIMESTAMP

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
