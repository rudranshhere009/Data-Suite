from config import db

class AISData(db.Model):
    __tablename__ = "ais_data"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    mmsi = db.Column(db.BigInteger)
    nav_status = db.Column(db.String(255))
    rot = db.Column(db.Float)
    sog = db.Column(db.Float)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    cog = db.Column(db.Float)
    true_heading = db.Column(db.Integer)
    imo = db.Column(db.BigInteger)
    ship_name = db.Column(db.String(255))
    call_sign = db.Column(db.String(255))
    ship_type = db.Column(db.String(255))
    draught = db.Column(db.Float)
    destination = db.Column(db.String(255))
    dimbow = db.Column(db.Integer)
    dimstern = db.Column(db.Integer)
    dimport = db.Column(db.Integer)
    dimstarboard = db.Column(db.Integer)
    eta = db.Column(db.String(255))
    beam = db.Column(db.Float)
    length = db.Column(db.Float)
    rec_time = db.Column(db.String(255))
    source = db.Column(db.String(255))
    country = db.Column(db.String(255))
    flag_name = db.Column(db.String(255))

__table_args__ = (
    db.UniqueConstraint("MMSI", "timestamp", name="uq_mmsi_time"),
)