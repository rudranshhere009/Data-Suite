from flask import Blueprint, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from config import db
from user_model import User
from flask_jwt_extended import create_access_token, jwt_required, JWTManager

auth_bp = Blueprint('auth', __name__)
CORS(auth_bp)

@auth_bp.route('/signup', methods=['POST'])
def signup():
    """User registration endpoint"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '').strip()
        
        # Validation
        if not username or not email or not password:
            return jsonify({'error': 'Username, email, and password are required'}), 400
        
        if len(username) < 3:
            return jsonify({'error': 'Username must be at least 3 characters long'}), 400
        
        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters long'}), 400
        
        # Check if user already exists
        if User.get_user(username):
            return jsonify({'error': 'Username already exists'}), 409
        
        # Create new user
        user = User.create_user(username, email, password)
        if not user:
            return jsonify({'error': 'Failed to create user'}), 500
        
        # Generate token
        token = user.generate_token()
        
        return jsonify({
            'message': 'User created successfully',
            'token': token,
            'user': {
                'username': username,
                'email': email
            }
        }), 201
        
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

@auth_bp.route('/signin', methods=['POST'])
def signin():
    """User login endpoint"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        
        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400
        
        # Authenticate user
        user_data = User.authenticate(username, password)
        if not user_data:
            return jsonify({'error': 'Invalid username or password'}), 401
        
        # Create user instance for token generation
        user = User(user_data['username'], user_data['email'], '')  # Password not needed for token gen
        token = user.generate_token()
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {
                'username': user_data['username'],
                'email': user_data['email']
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

@auth_bp.route('/verify', methods=['POST'])
def verify_token():
    """Verify JWT token endpoint"""
    try:
        data = request.get_json()
        token = data.get('token') if data else None
        
        if not token:
            # Try to get token from Authorization header
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'error': 'No token provided'}), 400
        
        user_data = User.verify_token(token)
        if not user_data:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        return jsonify({
            'valid': True,
            'user': {
                'username': user_data['username'],
                'email': user_data['email']
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500