from flask import Flask, jsonify, send_from_directory, request, session, Response
from analysis import analyze_trends
import os
import pandas as pd
import io

app = Flask(__name__, static_folder='../frontend', static_url_path='')
app.secret_key = os.environ.get('SECRET_KEY', 'super-secret-trendpulse-key')

# Simple User Database (for demo)
USERS = {"admin": "password123"}

@app.route('/')
def index():
    if 'user' not in session:
        return send_from_directory(app.static_folder, 'login.html')
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/login.html')
def login_page():
    return send_from_directory(app.static_folder, 'login.html')

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    if USERS.get(username) == password:
        session['user'] = username
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Invalid credentials"}), 401

@app.route('/api/logout')
def logout():
    session.pop('user', None)
    return jsonify({"success": True})

@app.route('/api/trends')
def get_trends():
    if 'user' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    csv_path = os.path.join(os.path.dirname(__file__), '../data/social_media_data.csv')
    try:
        data = analyze_trends(csv_path)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/sentiment')
def get_sentiment():
    if 'user' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    csv_path = os.path.join(os.path.dirname(__file__), '../data/social_media_data.csv')
    try:
        data = analyze_trends(csv_path)
        return jsonify(data['sentiment'])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/export')
def export_csv():
    if 'user' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    csv_path = os.path.join(os.path.dirname(__file__), '../data/social_media_data.csv')
    df = pd.read_csv(csv_path)
    output = io.StringIO()
    df.to_csv(output, index=False)
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-disposition": "attachment; filename=trends_report.csv"}
    )

if __name__ == '__main__':
    # Use environment variables for Render deployment
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
