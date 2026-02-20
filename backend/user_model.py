import hashlib
import jwt
from datetime import datetime, timedelta
from config import SECRET_KEY, DATABASE_URL
from sqlalchemy import create_engine, text
import logging

logger = logging.getLogger(__name__)

class User:
    """PostgreSQL-based user storage for persistent authentication."""
    
    def __init__(self, username, email, password=None, user_id=None, created_at=None):
        self.id = user_id
        self.username = username
        self.email = email
        if password:
            self.password_hash = self._hash_password(password)
        self.created_at = created_at or datetime.utcnow()
    
    @staticmethod
    def _hash_password(password):
        """Hash password using SHA-256"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    @staticmethod
    def _get_db_connection():
        """Get database connection"""
        engine = create_engine(DATABASE_URL)
        return engine
    
    @classmethod
    def create_user(cls, username, email, password):
        """Create a new user in the database"""
        try:
            engine = cls._get_db_connection()
            password_hash = cls._hash_password(password)
            
            with engine.connect() as conn:
                # Check if user already exists
                result = conn.execute(text(
                    "SELECT id FROM users WHERE username = :username OR email = :email"
                ), {"username": username, "email": email})
                
                if result.fetchone():
                    return None  # User already exists
                
                # Create new user
                result = conn.execute(text("""
                    INSERT INTO users (username, email, password_hash, created_at) 
                    VALUES (:username, :email, :password_hash, :created_at)
                    RETURNING id, created_at
                """), {
                    "username": username,
                    "email": email,
                    "password_hash": password_hash,
                    "created_at": datetime.utcnow()
                })
                
                row = result.fetchone()
                conn.commit()
                
                if row:
                    user = cls(username, email, user_id=row[0], created_at=row[1])
                    logger.info(f"User created successfully: {username}")
                    return user
                    
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            return None
    
    @classmethod
    def authenticate(cls, username, password):
        """Authenticate user with username and password"""
        try:
            engine = cls._get_db_connection()
            password_hash = cls._hash_password(password)
            
            with engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT id, username, email, password_hash, created_at 
                    FROM users 
                    WHERE username = :username AND password_hash = :password_hash
                """), {"username": username, "password_hash": password_hash})
                
                row = result.fetchone()
                if row:
                    # Update last login
                    conn.execute(text(
                        "UPDATE users SET last_login = :last_login WHERE id = :user_id"
                    ), {"last_login": datetime.utcnow(), "user_id": row[0]})
                    conn.commit()
                    
                    return {
                        'id': row[0],
                        'username': row[1],
                        'email': row[2],
                        'password_hash': row[3],
                        'created_at': row[4]
                    }
                return None
                
        except Exception as e:
            logger.error(f"Error authenticating user: {e}")
            return None
    
    @classmethod
    def get_user(cls, username):
        """Get user by username"""
        try:
            engine = cls._get_db_connection()
            
            with engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT id, username, email, password_hash, created_at, last_login 
                    FROM users 
                    WHERE username = :username
                """), {"username": username})
                
                row = result.fetchone()
                if row:
                    return {
                        'id': row[0],
                        'username': row[1],
                        'email': row[2],
                        'password_hash': row[3],
                        'created_at': row[4],
                        'last_login': row[5]
                    }
                return None
                
        except Exception as e:
            logger.error(f"Error getting user: {e}")
            return None
    
    def generate_token(self):
        """Generate JWT token for user"""
        payload = {
            'username': self.username,
            'exp': datetime.utcnow() + timedelta(minutes=5)  # Token expires in 5 minutes
        }
        return jwt.encode(payload, SECRET_KEY, algorithm='HS256')
    
    @staticmethod
    def verify_token(token):
        """Verify JWT token and return user data"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            username = payload['username']
            return User.get_user(username)
        except jwt.ExpiredSignatureError:
            logger.warning("Token expired")
            return None
        except jwt.InvalidTokenError:
            logger.warning("Invalid token")
            return None