from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
import jwt
import bcrypt
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})

# Database connection
def get_db_connection():
    try:
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            database=os.getenv('DB_NAME', 'CrypTrade'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', 'root'),
            cursor_factory=RealDictCursor
        )
        return conn
    except psycopg2.OperationalError as e:
        print(f"Database connection error: {e}")
        return None

def init_db():
    try:
        conn = get_db_connection()
        if conn is None:
            print("Failed to connect to database")
            return False
            
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
        return True
    except Exception as e:
        print(f"Error initializing database: {e}")
        return False
    finally:
        if conn:
            conn.close()

# Initialize database on startup
if not init_db():
    print("Warning: Database initialization failed")

# Middleware to verify JWT token
def token_required(f):
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]
        
        if not token:
            return jsonify({'message': 'Token is missing'}), 401

        try:
            data = jwt.decode(token, os.getenv('JWT_SECRET_KEY', 'your_secret_key'), algorithms=["HS256"])
            current_user = data
        except:
            return jsonify({'message': 'Token is invalid'}), 401

        return f(current_user, *args, **kwargs)
    
    decorated.__name__ = f.__name__
    return decorated

@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        username = data.get('username')
        
        if not email or not password or not username:
            return jsonify({'message': 'Missing required fields'}), 400

        # Hash the password
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed'}), 500
        
        cur = conn.cursor()
        
        try:
            # Check if user already exists
            cur.execute("SELECT * FROM users WHERE email = %s OR username = %s", (email, username))
            if cur.fetchone():
                return jsonify({'message': 'User with this email or username already exists'}), 409
            
            # Insert new user
            cur.execute(
                "INSERT INTO users (email, username, password_hash) VALUES (%s, %s, %s) RETURNING id, email, username",
                (email, username, hashed.decode('utf-8'))
            )
            new_user = cur.fetchone()
            conn.commit()
            
            # Generate JWT token
            token = jwt.encode({
                'user_id': str(new_user['id']),
                'email': new_user['email'],
                'username': new_user['username'],
                'exp': datetime.utcnow() + timedelta(days=1)
            }, os.getenv('JWT_SECRET_KEY', 'your_secret_key'))
            
            return jsonify({
                'token': token,
                'user': {
                    'id': str(new_user['id']),
                    'email': new_user['email'],
                    'username': new_user['username']
                }
            }), 201
        except Exception as e:
            print(f"SQL Error: {e}")
            return jsonify({'message': 'Database error'}), 500
        finally:
            cur.close()
            conn.close()
        
    except Exception as e:
        print(e)
        return jsonify({'message': 'Error creating user'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'message': 'Missing email or password'}), 400
        
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed'}), 500
        
        cur = conn.cursor()
        
        try:
            # Get user
            cur.execute("SELECT * FROM users WHERE email = %s", (email,))
            user = cur.fetchone()
            
            if not user:
                return jsonify({'message': 'User not found'}), 404
            
            # Check password
            if not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
                return jsonify({'message': 'Invalid password'}), 401
            
            # Generate JWT token
            token = jwt.encode({
                'user_id': str(user['id']),
                'email': user['email'],
                'username': user['username'],
                'exp': datetime.utcnow() + timedelta(days=1)
            }, os.getenv('JWT_SECRET_KEY', 'your_secret_key'))
            
            return jsonify({
                'token': token,
                'user': {
                    'id': str(user['id']),
                    'email': user['email'],
                    'username': user['username']
                }
            })
        finally:
            cur.close()
            conn.close()
        
    except Exception as e:
        print(e)
        return jsonify({'message': 'Error during login'}), 500

@app.route('/api/auth/me', methods=['GET'])
@token_required
def get_user(current_user):
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'message': 'Database connection failed'}), 500
        
        cur = conn.cursor()
        
        try:
            # Get user from database
            cur.execute("SELECT id, email, username FROM users WHERE id = %s", (current_user['user_id'],))
            user = cur.fetchone()
            
            if not user:
                return jsonify({'message': 'User not found'}), 404
                
            return jsonify({
                'id': str(user['id']),
                'email': user['email'],
                'username': user['username']
            })
        finally:
            cur.close()
            conn.close()
        
    except Exception as e:
        print(e)
        return jsonify({'message': 'Error fetching user data'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
