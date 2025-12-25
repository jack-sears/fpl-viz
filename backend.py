"""
FPL API Backend Server
======================
Serves data from local cache files for fast response times.
Run sync_data.py to update the cached data.

Usage:
    python backend.py
"""
from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import json
import requests
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# ============================================================================
# Configuration
# ============================================================================

DATA_DIR = "data"
FPL_API_BASE = 'https://fantasy.premierleague.com/api'

# Cache files
CACHE_FILES = {
    "bootstrap": "fpl_bootstrap.json",
    "fixtures": "fpl_fixtures.json",
    "player_histories": "fpl_player_histories.json",
    "understat_matches": "understat_matches.json",
    "team_strengths": "team_strengths.json",
    "breakout_players": "breakout_players.json",
    "downfall_players": "downfall_players.json",
    "consistent_players": "consistent_players.json",
    "recommendations": "recommendations.json",
    "metadata": "sync_metadata.json",
}

# In-memory cache
_cache = {}


# ============================================================================
# Cache Functions
# ============================================================================

def load_cache(name):
    """Load data from cache file (with in-memory caching)"""
    if name in _cache:
        return _cache[name]
    
    filepath = os.path.join(DATA_DIR, CACHE_FILES.get(name, f"{name}.json"))
    if os.path.exists(filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
                _cache[name] = data
                return data
        except (json.JSONDecodeError, IOError) as e:
            print(f"⚠️ Error loading {filepath}: {e}")
    return None


def is_cache_available():
    """Check if local cache is available"""
    metadata_path = os.path.join(DATA_DIR, CACHE_FILES["metadata"])
    return os.path.exists(metadata_path)


def clear_memory_cache():
    """Clear in-memory cache (call after sync)"""
    global _cache
    _cache = {}


# ============================================================================
# FPL API Endpoints (from local cache)
# ============================================================================

@app.route('/api/bootstrap-static/', methods=['GET'])
def get_bootstrap_static():
    """Serve FPL bootstrap data from cache"""
    data = load_cache("bootstrap")
    if data:
        return jsonify(data)
    
    # Fallback to live API if no cache
    print("⚠️ No cache, fetching from live API...")
    try:
        url = f'{FPL_API_BASE}/bootstrap-static/'
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/element-summary/<int:player_id>/', methods=['GET'])
def get_element_summary(player_id):
    """Serve player history from cache or live API"""
    # Try cache first
    histories = load_cache("player_histories")
    if histories and str(player_id) in histories:
        cached = histories[str(player_id)]
        return jsonify({
            'history': cached.get('history', []),
            'fixtures': cached.get('fixtures', []),
            'history_past': [],
        })
    
    # Fallback to live API
    try:
        url = f'{FPL_API_BASE}/element-summary/{player_id}/'
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/fixtures/', methods=['GET'])
def get_fixtures():
    """Serve FPL fixtures from cache"""
    data = load_cache("fixtures")
    if data:
        return jsonify(data)
    
    # Fallback to live API
    print("⚠️ No cache, fetching from live API...")
    try:
        url = f'{FPL_API_BASE}/fixtures/'
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# FPL Team Endpoints (always live - user-specific data)
# ============================================================================

@app.route('/api/entry/<int:team_id>/', methods=['GET'])
def get_team_info(team_id):
    """Get basic info for a user's FPL team"""
    try:
        url = f'{FPL_API_BASE}/entry/{team_id}/'
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/entry/<int:team_id>/history/', methods=['GET'])
def get_team_history(team_id):
    """Get history for a user's FPL team"""
    try:
        url = f'{FPL_API_BASE}/entry/{team_id}/history/'
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/entry/<int:team_id>/event/<int:event_id>/picks/', methods=['GET'])
def get_team_picks(team_id, event_id):
    """Get picks for a user's FPL team for a specific gameweek"""
    try:
        url = f'{FPL_API_BASE}/entry/{team_id}/event/{event_id}/picks/'
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/entry/<int:team_id>/transfers/', methods=['GET'])
def get_team_transfers(team_id):
    """Get transfer history for a user's FPL team"""
    try:
        url = f'{FPL_API_BASE}/entry/{team_id}/transfers/'
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# Understat Endpoints (from local cache)
# ============================================================================

@app.route('/api/understat/team-stats', methods=['GET'])
def get_understat_team_stats():
    """Serve pre-calculated team strengths from cache"""
    data = load_cache("team_strengths")
    if data:
        print(f"📊 Serving {len(data)} teams from cache")
        return jsonify(data)
    
    return jsonify({
        'error': 'No team data cached. Run: python sync_data.py'
    }), 500


@app.route('/api/understat/matches', methods=['GET'])
def get_understat_matches():
    """Serve Understat match data from cache"""
    data = load_cache("understat_matches")
    if data:
        return jsonify(data)
    
    return jsonify({
        'error': 'No match data cached. Run: python sync_data.py'
    }), 500


# ============================================================================
# Breakout Players Endpoint (from local cache)
# ============================================================================

@app.route('/api/breakout-players', methods=['GET'])
def get_breakout_players():
    """Serve pre-calculated breakout players from cache"""
    data = load_cache("breakout_players")
    if data:
        # Apply optional filters from query params
        position = request.args.get('position')
        limit = request.args.get('limit', default=50, type=int)
        
        filtered = data
        
        if position:
            filtered = [p for p in filtered if p.get('position') == position]
        
        filtered = filtered[:limit]
        
        print(f"🔥 Serving {len(filtered)} breakout players from cache")
        return jsonify(filtered)
    
    return jsonify({
        'error': 'No breakout data cached. Run: python sync_data.py'
    }), 500


# ============================================================================
# Downfall Players Endpoint (from local cache)
# ============================================================================

@app.route('/api/downfall-players', methods=['GET'])
def get_downfall_players():
    """Serve pre-calculated downfall players from cache"""
    data = load_cache("downfall_players")
    if data:
        position = request.args.get('position')
        limit = request.args.get('limit', default=50, type=int)
        
        filtered = data
        
        if position:
            filtered = [p for p in filtered if p.get('position') == position]
        
        filtered = filtered[:limit]
        
        print(f"📉 Serving {len(filtered)} downfall players from cache")
        return jsonify(filtered)
    
    return jsonify({
        'error': 'No downfall data cached. Run: python sync_data.py'
    }), 500


# ============================================================================
# Consistent Players Endpoint (from local cache)
# ============================================================================

@app.route('/api/consistent-players', methods=['GET'])
def get_consistent_players():
    """Serve pre-calculated consistent players from cache"""
    data = load_cache("consistent_players")
    if data:
        position = request.args.get('position')
        limit = request.args.get('limit', default=50, type=int)
        
        filtered = data
        
        if position:
            filtered = [p for p in filtered if p.get('position') == position]
        
        filtered = filtered[:limit]
        
        print(f"⚖️ Serving {len(filtered)} consistent players from cache")
        return jsonify(filtered)
    
    return jsonify({
        'error': 'No consistent player data cached. Run: python sync_data.py'
    }), 500


# ============================================================================
# Recommendations Endpoint (from local cache)
# ============================================================================

@app.route('/api/recommendations', methods=['GET'])
def get_recommendations():
    """Serve buy/sell recommendations from cache"""
    data = load_cache("recommendations")
    if data:
        rec_type = request.args.get('type')  # 'buy' or 'sell'
        limit = request.args.get('limit', default=20, type=int)
        
        if rec_type == 'buy':
            result = data.get('buy', [])[:limit]
            print(f"🎯 Serving {len(result)} buy recommendations")
        elif rec_type == 'sell':
            result = data.get('sell', [])[:limit]
            print(f"🎯 Serving {len(result)} sell recommendations")
        else:
            result = {
                'buy': data.get('buy', [])[:limit],
                'sell': data.get('sell', [])[:limit],
            }
            print(f"🎯 Serving {len(result['buy'])} buy, {len(result['sell'])} sell recommendations")
        
        return jsonify(result)
    
    return jsonify({
        'error': 'No recommendations cached. Run: python sync_data.py'
    }), 500


# ============================================================================
# Utility Endpoints
# ============================================================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check with cache status"""
    metadata = load_cache("metadata")
    
    status = {
        'status': 'ok',
        'message': 'FPL API Backend is running',
        'cache_available': is_cache_available(),
    }
    
    if metadata:
        status['last_sync'] = metadata.get('last_sync')
        status['sync_type'] = metadata.get('sync_type')
        status['cached_data'] = {
            'fpl_players': metadata.get('fpl_players', 0),
            'fpl_teams': metadata.get('fpl_teams', 0),
            'fixtures': metadata.get('fixtures', 0),
            'understat_matches': metadata.get('understat_matches', 0),
            'team_strengths': metadata.get('team_strengths', 0),
            'breakout_players': metadata.get('breakout_players', 0),
            'downfall_players': metadata.get('downfall_players', 0),
            'consistent_players': metadata.get('consistent_players', 0),
            'buy_recommendations': metadata.get('buy_recommendations', 0),
            'sell_recommendations': metadata.get('sell_recommendations', 0),
        }
    
    return jsonify(status)


@app.route('/api/cache/clear', methods=['POST'])
def clear_cache():
    """Clear in-memory cache (forces reload from files)"""
    clear_memory_cache()
    return jsonify({'status': 'ok', 'message': 'Memory cache cleared'})


@app.route('/api/sync/status', methods=['GET'])
def sync_status():
    """Get sync status and last update time"""
    metadata = load_cache("metadata")
    
    if not metadata:
        return jsonify({
            'synced': False,
            'message': 'No data synced. Run: python sync_data.py'
        })
    
    return jsonify({
        'synced': True,
        'last_sync': metadata.get('last_sync'),
        'sync_type': metadata.get('sync_type'),
        'data': {
            'fpl_players': metadata.get('fpl_players', 0),
            'fpl_teams': metadata.get('fpl_teams', 0),
            'fixtures': metadata.get('fixtures', 0),
            'understat_matches': metadata.get('understat_matches', 0),
            'team_strengths': metadata.get('team_strengths', 0),
            'breakout_players': metadata.get('breakout_players', 0),
            'downfall_players': metadata.get('downfall_players', 0),
            'consistent_players': metadata.get('consistent_players', 0),
            'buy_recommendations': metadata.get('buy_recommendations', 0),
            'sell_recommendations': metadata.get('sell_recommendations', 0),
        }
    })


# ============================================================================
# Main
# ============================================================================

def preload_cache():
    """Preload all cache files into memory at startup for fast responses"""
    print('📂 Preloading cache into memory...')
    for name in CACHE_FILES.keys():
        data = load_cache(name)
        if data:
            if name == "breakout_players":
                print(f'   ✅ {name}: {len(data)} players')
            elif name == "downfall_players":
                print(f'   ✅ {name}: {len(data)} players')
            elif name == "consistent_players":
                print(f'   ✅ {name}: {len(data)} players')
            elif name == "recommendations":
                print(f'   ✅ {name}: {len(data.get("buy", []))} buy, {len(data.get("sell", []))} sell')
            elif name == "bootstrap":
                print(f'   ✅ {name}: {len(data.get("elements", []))} players')
            elif name == "team_strengths":
                print(f'   ✅ {name}: {len(data)} teams')
            elif name == "fixtures":
                print(f'   ✅ {name}: {len(data)} fixtures')
            elif name != "metadata":
                print(f'   ✅ {name}')


if __name__ == '__main__':
    print('🚀 Starting FPL API Backend Server...')
    print('📡 Server will run on http://localhost:5000')
    print()
    
    if is_cache_available():
        metadata = load_cache("metadata")
        if metadata:
            print(f'📅 Last sync: {metadata.get("last_sync", "unknown")}')
        preload_cache()
    else:
        print('⚠️  No cache available!')
        print('   Run: python sync_data.py')
    
    print()
    # Production mode for faster responses (no auto-reload, no debugger)
    app.run(debug=False, port=5000, threaded=True)
