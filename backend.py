"""
Simple Flask backend to proxy FPL API requests
This bypasses CORS restrictions by making requests from the server side
"""
from flask import Flask, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# FPL API base URL
FPL_API_BASE = 'https://fantasy.premierleague.com/api'

@app.route('/api/bootstrap-static/', methods=['GET'])
def get_bootstrap_static():
    """Proxy for FPL bootstrap-static endpoint"""
    try:
        url = f'{FPL_API_BASE}/bootstrap-static/'
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/element-summary/<int:player_id>/', methods=['GET'])
def get_element_summary(player_id):
    """Proxy for FPL element-summary endpoint"""
    try:
        url = f'{FPL_API_BASE}/element-summary/{player_id}/'
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'message': 'FPL API Proxy is running'})

if __name__ == '__main__':
    print('🚀 Starting FPL API Proxy Server...')
    print('📡 Server will run on http://localhost:5000')
    print('🔗 Frontend should connect to http://localhost:5000/api/')
    app.run(debug=True, port=5000)

