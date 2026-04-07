import os
from dotenv import load_dotenv
from flask_sqlalchemy import SQLAlchemy
from flask import Flask
from flask_cors import CORS

# Load .env file
load_dotenv()


def normalize_database_url(url):
    """Force SQLAlchemy to use psycopg (v3) driver for Postgres URLs."""
    if not url:
        return url
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    if url.startswith("postgresql://") and not url.startswith("postgresql+"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


DATABASE_URL = normalize_database_url(os.getenv("DATABASE_URL"))
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")


def get_allowed_origins():
    """
    Build CORS allow-list from env with local defaults.
    Use comma-separated ALLOWED_ORIGINS for deployed frontend URLs.
    """
    raw = os.getenv("ALLOWED_ORIGINS", "")
    env_origins = [o.strip() for o in raw.split(",") if o.strip()]
    local_defaults = [
        "http://localhost",
        "http://localhost:80",
        "http://localhost:5173",
        "http://localhost:5174",
    ]
    return env_origins or local_defaults

db = SQLAlchemy()

def resolve_csv_path():
    """Resolve the dataset path for both local and docker layouts."""
    candidates = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "ships_with_dynamics_heading.csv")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ships_with_dynamics_heading.csv")),
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    # Return the first candidate for clearer downstream error messaging
    return candidates[0]

def create_app():
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SECRET_KEY"] = SECRET_KEY

    # CORS: set ALLOWED_ORIGINS in production (e.g. Vercel URL).
    CORS(
        app,
        origins=get_allowed_origins(),
        supports_credentials=False,
        allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )

    db.init_app(app)

    # Ensure tables exist on app startup
    from utils.db_loader import ensure_database_exists
    from sqlalchemy import inspect, create_engine, text
    engine = create_engine(DATABASE_URL)
    with app.app_context():
        # Optional DB creation is disabled by default for managed services (Render/Supabase).
        ensure_database_exists()
        # Import models so SQLAlchemy knows about them
        import models
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        print("Existing tables:", existing_tables)
        
        # Create ais_data table if it doesn't exist
        if "ais_data" not in existing_tables:
            print("Creating ais_data table...")
            db.create_all()
        else:
            print("ais_data table already exists.")
        
        # Create users table if it doesn't exist
        if "users" not in existing_tables:
            print("Creating users table...")
            with engine.connect() as conn:
                conn.execute(text("""
                    CREATE TABLE users (
                        id SERIAL PRIMARY KEY,
                        username VARCHAR(50) UNIQUE NOT NULL,
                        email VARCHAR(100) UNIQUE NOT NULL,
                        password_hash VARCHAR(255) NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        last_login TIMESTAMP
                    );
                """))
                conn.commit()
            print("Users table created successfully.")
        else:
            print("Users table already exists.")

        # Check if ais_data table is empty and load data if it is
        from models import AISData
        if db.session.query(AISData).count() == 0:
            print("ais_data table is empty. Loading data...")
            from utils.db_loader import load_csv_to_db
            csv_path = resolve_csv_path()
            load_csv_to_db(csv_path, app=app)
        else:
            print("ais_data table already contains data. Skipping data loading.")

    # Register blueprints

    from routes.trends import trends_bp
    from routes.ships import ships_bp
    from routes.ship_types import ship_types_bp
    from routes.auth import auth_bp
    from routes.routes import routes_bp
    from routes.traffic import traffic_bp
    from routes.riskforecast import riskforecast_bp

    app.register_blueprint(trends_bp, url_prefix="/api/trends")
    app.register_blueprint(ships_bp, url_prefix="/api/ships")
    app.register_blueprint(ship_types_bp, url_prefix="/api/ship-types")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(routes_bp, url_prefix='/api/routes')
    app.register_blueprint(traffic_bp, url_prefix='/api/traffic')
    app.register_blueprint(riskforecast_bp, url_prefix='/api/riskforecast')

    return app
