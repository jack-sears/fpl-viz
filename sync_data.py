"""
FPL Data Sync Script
====================
Run this script to fetch and cache all data locally.
Run once after each gameweek finishes to update the app with fresh data.

Usage:
    python sync_data.py           # Full sync (all data)
    python sync_data.py --quick   # Quick sync (skip player histories)
"""

import os
import sys
import json
import time
import argparse
import requests
import math
from datetime import datetime
from dataclasses import asdict

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from understat_api import UnderstatAPI

# ============================================================================
# Configuration
# ============================================================================

DATA_DIR = "data"
FPL_API_BASE = "https://fantasy.premierleague.com/api"

# Files to create
FILES = {
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

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
}

# Position constants
POSITION_MAP = {1: 'GKP', 2: 'DEF', 3: 'MID', 4: 'FWD'}

# ============================================================================
# FPL API Functions
# ============================================================================

def fetch_fpl_bootstrap():
    """Fetch FPL bootstrap-static data (players, teams, gameweeks)"""
    print("📊 Fetching FPL bootstrap data...")
    url = f"{FPL_API_BASE}/bootstrap-static/"
    response = requests.get(url, headers=HEADERS, timeout=30)
    response.raise_for_status()
    data = response.json()
    print(f"   ✅ {len(data.get('elements', []))} players, {len(data.get('teams', []))} teams")
    return data


def fetch_fpl_fixtures():
    """Fetch all FPL fixtures"""
    print("📅 Fetching FPL fixtures...")
    url = f"{FPL_API_BASE}/fixtures/"
    response = requests.get(url, headers=HEADERS, timeout=30)
    response.raise_for_status()
    data = response.json()
    finished = len([f for f in data if f.get('finished')])
    print(f"   ✅ {len(data)} fixtures ({finished} completed)")
    return data


def fetch_player_history(player_id):
    """Fetch a single player's gameweek history"""
    url = f"{FPL_API_BASE}/element-summary/{player_id}/"
    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return None


def fetch_player_histories(players, min_minutes=450, max_players=200):
    """
    Fetch gameweek histories for players (for breakout analysis).
    Only fetches players with minimum minutes to reduce API calls.
    """
    print(f"📈 Fetching player histories (min {min_minutes} mins, max {max_players} players)...")
    
    # Filter to players with enough minutes and sort by form
    qualified = [p for p in players if p.get('minutes', 0) >= min_minutes]
    qualified.sort(key=lambda x: float(x.get('form', 0) or 0), reverse=True)
    qualified = qualified[:max_players]
    
    print(f"   Fetching data for {len(qualified)} players...")
    
    histories = {}
    batch_size = 5
    
    for i in range(0, len(qualified), batch_size):
        batch = qualified[i:i+batch_size]
        
        for player in batch:
            player_id = player['id']
            history = fetch_player_history(player_id)
            
            if history and history.get('history'):
                histories[player_id] = {
                    'id': player_id,
                    'name': f"{player.get('first_name', '')} {player.get('second_name', '')}".strip(),
                    'web_name': player.get('web_name', ''),
                    'team': player.get('team', 0),
                    'position': player.get('element_type', 0),
                    'history': history['history'],
                    'fixtures': history.get('fixtures', []),
                }
        
        # Progress update
        done = min(i + batch_size, len(qualified))
        if done % 20 == 0 or done == len(qualified):
            print(f"   📊 {done}/{len(qualified)} players fetched")
        
        # Rate limiting
        time.sleep(0.2)
    
    print(f"   ✅ {len(histories)} player histories cached")
    return histories


# ============================================================================
# Understat Functions
# ============================================================================

def sync_understat_matches(start_id=28778):
    """Scrape new Understat matches"""
    print("⚽ Syncing Understat match data...")
    
    api = UnderstatAPI()
    initial_count = len(api.matches)
    
    new_matches = api.scrape_matches(
        start_id=start_id,
        league="EPL",
        max_consecutive_404=30,
        delay=0.3
    )
    
    print(f"   ✅ {new_matches} new matches, {len(api.matches)} total")
    return [asdict(m) for m in api.matches]


# ============================================================================
# Pre-calculation Functions
# ============================================================================

def calculate_team_strengths(understat_matches, fpl_teams):
    """Pre-calculate team strengths from Understat data"""
    print("💪 Calculating team strengths...")
    
    # Aggregate stats per team
    team_stats = {}
    
    for match in understat_matches:
        if not match.get('home_team') or not match.get('away_team'):
            continue
        
        home = match['home_team']
        away = match['away_team']
        
        for team in [home, away]:
            if team not in team_stats:
                team_stats[team] = {
                    'matches': 0, 'home_matches': 0, 'away_matches': 0,
                    'xG': 0, 'xGA': 0, 'goals': 0, 'goals_against': 0,
                    'home_xG': 0, 'home_xGA': 0,
                    'away_xG': 0, 'away_xGA': 0,
                    'recent_xG_diff': [],
                    'clean_sheets': 0,
                }
        
        # Home team stats
        team_stats[home]['matches'] += 1
        team_stats[home]['home_matches'] += 1
        team_stats[home]['xG'] += match['home_xG']
        team_stats[home]['xGA'] += match['away_xG']
        team_stats[home]['home_xG'] += match['home_xG']
        team_stats[home]['home_xGA'] += match['away_xG']
        team_stats[home]['goals'] += match['home_goals']
        team_stats[home]['goals_against'] += match['away_goals']
        team_stats[home]['recent_xG_diff'].append(match['home_xG'] - match['away_xG'])
        if match['away_goals'] == 0:
            team_stats[home]['clean_sheets'] += 1
        
        # Away team stats
        team_stats[away]['matches'] += 1
        team_stats[away]['away_matches'] += 1
        team_stats[away]['xG'] += match['away_xG']
        team_stats[away]['xGA'] += match['home_xG']
        team_stats[away]['away_xG'] += match['away_xG']
        team_stats[away]['away_xGA'] += match['home_xG']
        team_stats[away]['goals'] += match['away_goals']
        team_stats[away]['goals_against'] += match['home_goals']
        team_stats[away]['recent_xG_diff'].append(match['away_xG'] - match['home_xG'])
        if match['home_goals'] == 0:
            team_stats[away]['clean_sheets'] += 1
    
    # Map Understat names to FPL team names
    UNDERSTAT_TO_FPL = {
        "Arsenal": "Arsenal",
        "Aston Villa": "Aston Villa", 
        "Bournemouth": "Bournemouth",
        "Brentford": "Brentford",
        "Brighton": "Brighton",
        "Burnley": "Burnley",
        "Chelsea": "Chelsea",
        "Crystal Palace": "Crystal Palace",
        "Everton": "Everton",
        "Fulham": "Fulham",
        "Ipswich Town": "Ipswich",
        "Ipswich": "Ipswich",
        "Leeds United": "Leeds",
        "Leeds": "Leeds",
        "Leicester City": "Leicester",
        "Leicester": "Leicester",
        "Liverpool": "Liverpool",
        "Manchester City": "Man City",
        "Manchester United": "Man Utd",
        "Newcastle United": "Newcastle",
        "Nottingham Forest": "Nott'm Forest",
        "Southampton": "Southampton",
        "Sunderland": "Sunderland",
        "Tottenham": "Spurs",
        "West Ham": "West Ham",
        "Wolverhampton Wanderers": "Wolves",
    }
    
    fpl_team_map = {t['name']: t['id'] for t in fpl_teams}
    
    # Calculate per-match stats and create output
    result = []
    
    for understat_name, stats in team_stats.items():
        m = stats['matches']
        hm = stats['home_matches']
        am = stats['away_matches']
        
        if m == 0:
            continue
        
        # Find FPL team ID and name
        fpl_name = UNDERSTAT_TO_FPL.get(understat_name)
        if not fpl_name:
            for u_name, f_name in UNDERSTAT_TO_FPL.items():
                if u_name.lower() in understat_name.lower():
                    fpl_name = f_name
                    break
        
        fpl_team_id = fpl_team_map.get(fpl_name) if fpl_name else None
        
        # Calculate averages
        xg_per90 = stats['xG'] / m
        xga_per90 = stats['xGA'] / m
        gf_per90 = stats['goals'] / m
        ga_per90 = stats['goals_against'] / m
        cs_rate = stats['clean_sheets'] / m
        
        home_xg_per90 = stats['home_xG'] / hm if hm > 0 else xg_per90
        home_xga_per90 = stats['home_xGA'] / hm if hm > 0 else xga_per90
        away_xg_per90 = stats['away_xG'] / am if am > 0 else xg_per90
        away_xga_per90 = stats['away_xGA'] / am if am > 0 else xga_per90
        
        # Home bonuses
        home_attack_bonus = home_xg_per90 - xg_per90
        home_defense_bonus = xga_per90 - home_xga_per90
        
        # Form factor (last 5 matches xG diff)
        recent = stats['recent_xG_diff'][-5:]
        form_factor = sum(recent) / len(recent) if recent else 0
        
        result.append({
            'team_name': understat_name,
            'team_id': fpl_team_id,
            'fpl_name': fpl_name,
            'matches': m,
            'home_matches': hm,
            'away_matches': am,
            'xg_per90': xg_per90,
            'xga_per90': xga_per90,
            'gf_per90': gf_per90,
            'ga_per90': ga_per90,
            'cs_rate': cs_rate,
            'home_xg_per90': home_xg_per90,
            'home_xga_per90': home_xga_per90,
            'home_gf_per90': stats['goals'] / hm if hm > 0 else gf_per90,
            'home_ga_per90': stats['goals_against'] / hm if hm > 0 else ga_per90,
            'away_xg_per90': away_xg_per90,
            'away_xga_per90': away_xga_per90,
            'away_gf_per90': stats['goals'] / am if am > 0 else gf_per90,
            'away_ga_per90': stats['goals_against'] / am if am > 0 else ga_per90,
            'home_attack_bonus': home_attack_bonus,
            'home_defense_bonus': home_defense_bonus,
            'form_factor': form_factor,
        })
    
    print(f"   ✅ {len(result)} teams calculated")
    return result


def get_upcoming_fixtures(fixtures, team_id, num_fixtures=5):
    """Get next N upcoming fixtures for a team"""
    upcoming = []
    for f in fixtures:
        if f.get('finished'):
            continue
        if f.get('team_h') == team_id:
            upcoming.append({'opponent_id': f['team_a'], 'is_home': True, 'gameweek': f['event']})
        elif f.get('team_a') == team_id:
            upcoming.append({'opponent_id': f['team_h'], 'is_home': False, 'gameweek': f['event']})
    
    upcoming.sort(key=lambda x: x['gameweek'] or 99)
    return upcoming[:num_fixtures]


def calculate_fixture_difficulty(upcoming_fixtures, team_strengths_by_id, is_defender=False):
    """
    Calculate fixture difficulty for upcoming games.
    For defenders: based on opponent xG (how much they'll concede)
    For attackers: based on opponent xGA (how much they'll score)
    Returns average difficulty (lower = easier)
    """
    if not upcoming_fixtures:
        return 1.0  # Neutral
    
    difficulties = []
    for fix in upcoming_fixtures:
        opp = team_strengths_by_id.get(fix['opponent_id'])
        if not opp:
            continue
        
        if is_defender:
            # For defenders: easier if opponent has low xG
            diff = opp['xg_per90'] if fix['is_home'] else opp['away_xg_per90']
        else:
            # For attackers: easier if opponent has high xGA
            diff = -opp['xga_per90'] if fix['is_home'] else -opp['away_xga_per90']
        
        difficulties.append(diff)
    
    return sum(difficulties) / len(difficulties) if difficulties else 1.0


def calculate_cs_potential(team_id, upcoming_fixtures, team_strengths_by_id, team_strengths_by_name):
    """
    Calculate clean sheet potential for a defender.
    Based on: team's defensive strength + opponent's attacking weakness
    """
    # Get player's team defensive stats
    team_strength = team_strengths_by_id.get(team_id)
    if not team_strength:
        return 0.0
    
    # Base CS potential from team's xGA
    base_cs = max(0, 1.5 - team_strength['xga_per90'])  # Lower xGA = higher CS potential
    
    # Adjust for upcoming opponents
    if upcoming_fixtures:
        opp_xg_total = 0
        for fix in upcoming_fixtures:
            opp = team_strengths_by_id.get(fix['opponent_id'])
            if opp:
                opp_xg = opp['away_xg_per90'] if fix['is_home'] else opp['xg_per90']
                opp_xg_total += opp_xg
        
        avg_opp_xg = opp_xg_total / len(upcoming_fixtures)
        fixture_boost = max(0, 1.5 - avg_opp_xg)  # Lower opponent xG = easier fixtures
    else:
        fixture_boost = 0.5  # Neutral
    
    return (base_cs + fixture_boost) / 2


def calculate_std_dev(values):
    """Calculate standard deviation"""
    if len(values) < 2:
        return 0
    mean = sum(values) / len(values)
    variance = sum((x - mean) ** 2 for x in values) / len(values)
    return math.sqrt(variance)


def calculate_breakout_players(player_histories, fpl_teams, fpl_positions, team_strengths, fixtures):
    """
    Pre-calculate breakout scores for all players.
    Now includes CS potential for defenders/goalkeepers.
    """
    print("🔥 Calculating breakout scores...")
    
    RECENT_GAMEWEEKS = 4
    
    # Create maps
    team_map = {t['id']: t['name'] for t in fpl_teams}
    position_map = {p['id']: p['singular_name_short'] for p in fpl_positions}
    team_strengths_by_id = {ts['team_id']: ts for ts in team_strengths if ts['team_id']}
    team_strengths_by_name = {ts['fpl_name']: ts for ts in team_strengths if ts['fpl_name']}
    
    breakout_players = []
    
    for player_id, data in player_histories.items():
        history = data.get('history', [])
        
        if len(history) < 3:
            continue
        
        # Filter to games with minutes
        games_with_minutes = [g for g in history if g.get('minutes', 0) > 0]
        if len(games_with_minutes) < 3:
            continue
        
        position = position_map.get(data.get('position'), 'UNK')
        team_id = data.get('team')
        is_defender = position in ['GKP', 'DEF']
        
        # Calculate xGI per gameweek
        xgi_data = []
        for game in games_with_minutes:
            xg = float(game.get('expected_goals', 0) or 0)
            xa = float(game.get('expected_assists', 0) or 0)
            mins = game.get('minutes', 0)
            cs = 1 if game.get('clean_sheets', 0) > 0 else 0
            xgi_data.append({
                'gameweek': game.get('round', 0),
                'xGI': xg + xa,
                'minutes': mins,
                'clean_sheet': cs,
            })
        
        # Calculate season xGI/90
        total_xgi = sum(g['xGI'] for g in xgi_data)
        total_mins = sum(g['minutes'] for g in xgi_data)
        season_xgi_per90 = (total_xgi / total_mins) * 90 if total_mins > 0 else 0
        
        # Calculate recent xGI/90 (last N gameweeks)
        recent = xgi_data[-RECENT_GAMEWEEKS:]
        recent_xgi = sum(g['xGI'] for g in recent)
        recent_mins = sum(g['minutes'] for g in recent)
        recent_xgi_per90 = (recent_xgi / recent_mins) * 90 if recent_mins > 0 else 0
        
        # Skip if not enough recent minutes
        if recent_mins < 180:
            continue
        
        # Calculate trend ratio
        if season_xgi_per90 > 0.01:
            trend_ratio = (recent_xgi_per90 - season_xgi_per90) / season_xgi_per90
        else:
            trend_ratio = 1 if recent_xgi_per90 > 0 else 0
        
        # Calculate breakout score
        trend_bonus = max(-0.5, min(1.0, trend_ratio))
        breakout_score = recent_xgi_per90 * (1 + trend_bonus)
        
        # Calculate consistency (standard deviation of xGI/90)
        xgi_per90_values = [
            (g['xGI'] / g['minutes']) * 90 
            for g in xgi_data 
            if g['minutes'] >= 45
        ]
        consistency = calculate_std_dev(xgi_per90_values) if xgi_per90_values else 0
        
        # For defenders: calculate CS potential
        cs_potential_season = 0
        cs_potential_recent = 0
        cs_trend_ratio = 0
        
        if is_defender:
            # Season CS rate
            total_cs = sum(g['clean_sheet'] for g in xgi_data)
            games_played = len([g for g in xgi_data if g['minutes'] >= 60])
            cs_potential_season = total_cs / games_played if games_played > 0 else 0
            
            # Recent CS rate
            recent_cs = sum(g['clean_sheet'] for g in recent)
            recent_games = len([g for g in recent if g['minutes'] >= 60])
            cs_potential_recent = recent_cs / recent_games if recent_games > 0 else 0
            
            # CS trend
            if cs_potential_season > 0.01:
                cs_trend_ratio = (cs_potential_recent - cs_potential_season) / cs_potential_season
            else:
                cs_trend_ratio = 1 if cs_potential_recent > 0 else 0
            
            # Get upcoming fixture difficulty
            upcoming = get_upcoming_fixtures(fixtures, team_id, 5)
            fixture_cs_potential = calculate_cs_potential(
                team_id, upcoming, team_strengths_by_id, team_strengths_by_name
            )
        else:
            fixture_cs_potential = 0
        
        breakout_players.append({
            'player_id': int(player_id),
            'name': data.get('name', ''),
            'web_name': data.get('web_name', ''),
            'team': team_map.get(team_id, 'Unknown'),
            'team_id': team_id,
            'position': position,
            'recent_xgi_per90': recent_xgi_per90,
            'season_xgi_per90': season_xgi_per90,
            'trend_ratio': trend_ratio,
            'breakout_score': breakout_score,
            'consistency': consistency,
            'recent_minutes': recent_mins,
            'total_minutes': total_mins,
            'xgi_history': xgi_data,
            # CS fields for defenders
            'cs_potential_season': cs_potential_season,
            'cs_potential_recent': cs_potential_recent,
            'cs_trend_ratio': cs_trend_ratio,
            'fixture_cs_potential': fixture_cs_potential,
        })
    
    # Sort by breakout score
    breakout_players.sort(key=lambda x: x['breakout_score'], reverse=True)
    
    print(f"   ✅ {len(breakout_players)} players calculated")
    return breakout_players


def calculate_downfall_players(breakout_players):
    """
    Calculate downfall players - those trending DOWN.
    Uses same data as breakout but filters for negative trends.
    """
    print("📉 Calculating downfall players...")
    
    downfall = []
    
    for player in breakout_players:
        # Include players with significant negative trend
        if player['trend_ratio'] < -0.15:
            # Calculate downfall score (inverse of breakout)
            # Higher score = worse decline
            downfall_score = abs(player['trend_ratio']) * player['season_xgi_per90']
            
            downfall.append({
                **player,
                'downfall_score': downfall_score,
            })
    
    # Sort by downfall score (worst declines first)
    downfall.sort(key=lambda x: x['downfall_score'], reverse=True)
    
    print(f"   ✅ {len(downfall)} downfall players identified")
    return downfall


def calculate_consistent_players(breakout_players):
    """
    Calculate consistent performers - steady output, not trending.
    These are "set and forget" players.
    """
    print("⚖️ Calculating consistent players...")
    
    consistent = []
    
    # Calculate median xGI for threshold
    xgi_values = [p['season_xgi_per90'] for p in breakout_players]
    median_xgi = sorted(xgi_values)[len(xgi_values) // 2] if xgi_values else 0.3
    
    for player in breakout_players:
        # Consistent = low trend variance + above average output
        is_steady_trend = abs(player['trend_ratio']) < 0.15
        is_good_output = player['season_xgi_per90'] > median_xgi
        is_low_variance = player['consistency'] < 0.5  # Low std dev
        has_minutes = player['total_minutes'] >= 900  # Played enough
        
        if is_steady_trend and is_good_output and is_low_variance and has_minutes:
            # Calculate consistency score
            # Higher = more consistent AND productive
            consistency_score = player['season_xgi_per90'] * (1 - player['consistency'])
            
            consistent.append({
                **player,
                'consistency_score': consistency_score,
            })
    
    # Sort by consistency score
    consistent.sort(key=lambda x: x['consistency_score'], reverse=True)
    
    print(f"   ✅ {len(consistent)} consistent players identified")
    return consistent


def calculate_recommendations(breakout_players, downfall_players, team_strengths, fixtures, fpl_teams):
    """
    Calculate buy/sell recommendations combining trends + fixture difficulty.
    """
    print("🎯 Calculating recommendations...")
    
    team_map = {t['id']: t['name'] for t in fpl_teams}
    team_strengths_by_id = {ts['team_id']: ts for ts in team_strengths if ts['team_id']}
    
    buy_recommendations = []
    sell_recommendations = []
    
    # BUY: Breakout players with good upcoming fixtures
    for player in breakout_players[:50]:  # Top 50 breakout
        if player['trend_ratio'] < 0.05:  # Must be trending up
            continue
        
        team_id = player.get('team_id')
        is_defender = player['position'] in ['GKP', 'DEF']
        
        # Calculate fixture ease
        upcoming = get_upcoming_fixtures(fixtures, team_id, 5)
        fixture_difficulty = calculate_fixture_difficulty(
            upcoming, team_strengths_by_id, is_defender
        )
        
        # For attackers: lower opponent xGA = easier (we negated it, so lower is better)
        # For defenders: lower opponent xG = easier
        fixture_ease = -fixture_difficulty if not is_defender else -fixture_difficulty
        
        # Buy score combines breakout + fixture ease
        buy_score = player['breakout_score'] + (fixture_ease * 0.3)
        
        buy_recommendations.append({
            'player_id': player['player_id'],
            'name': player['name'],
            'web_name': player['web_name'],
            'team': player['team'],
            'team_id': team_id,
            'position': player['position'],
            'buy_score': buy_score,
            'breakout_score': player['breakout_score'],
            'trend_ratio': player['trend_ratio'],
            'recent_xgi_per90': player['recent_xgi_per90'],
            'fixture_ease': fixture_ease,
            'upcoming_fixtures': upcoming[:3],
            'reason': 'trending_up' if player['trend_ratio'] > 0.3 else 'good_form',
        })
    
    # SELL: Downfall players OR players with tough upcoming fixtures
    for player in downfall_players[:30]:  # Top 30 downfall
        team_id = player.get('team_id')
        is_defender = player['position'] in ['GKP', 'DEF']
        
        # Calculate fixture difficulty
        upcoming = get_upcoming_fixtures(fixtures, team_id, 5)
        fixture_difficulty = calculate_fixture_difficulty(
            upcoming, team_strengths_by_id, is_defender
        )
        
        # Sell score combines downfall + fixture difficulty
        sell_score = player['downfall_score'] + (fixture_difficulty * 0.3)
        
        sell_recommendations.append({
            'player_id': player['player_id'],
            'name': player['name'],
            'web_name': player['web_name'],
            'team': player['team'],
            'team_id': team_id,
            'position': player['position'],
            'sell_score': sell_score,
            'downfall_score': player['downfall_score'],
            'trend_ratio': player['trend_ratio'],
            'recent_xgi_per90': player['recent_xgi_per90'],
            'season_xgi_per90': player['season_xgi_per90'],
            'fixture_difficulty': fixture_difficulty,
            'upcoming_fixtures': upcoming[:3],
            'reason': 'trending_down' if player['trend_ratio'] < -0.3 else 'declining_form',
        })
    
    # Sort recommendations
    buy_recommendations.sort(key=lambda x: x['buy_score'], reverse=True)
    sell_recommendations.sort(key=lambda x: x['sell_score'], reverse=True)
    
    result = {
        'buy': buy_recommendations[:20],
        'sell': sell_recommendations[:20],
    }
    
    print(f"   ✅ {len(result['buy'])} buy, {len(result['sell'])} sell recommendations")
    return result


# ============================================================================
# File I/O Functions
# ============================================================================

def ensure_data_dir():
    """Create data directory if it doesn't exist"""
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
        print(f"📁 Created {DATA_DIR}/ directory")


def save_json(filename, data):
    """Save data to JSON file"""
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"   💾 Saved {filepath}")


def load_json(filename):
    """Load data from JSON file"""
    filepath = os.path.join(DATA_DIR, filename)
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None


# ============================================================================
# Main Sync Function
# ============================================================================

def sync_all(quick=False):
    """
    Run full data sync.
    
    Args:
        quick: If True, skip player histories (faster but no breakout data)
    """
    print("=" * 60)
    print("🔄 FPL DATA SYNC")
    print("=" * 60)
    print()
    
    start_time = time.time()
    ensure_data_dir()
    
    # 1. Fetch FPL bootstrap data
    bootstrap = fetch_fpl_bootstrap()
    save_json(FILES["bootstrap"], bootstrap)
    
    # 2. Fetch FPL fixtures
    fixtures = fetch_fpl_fixtures()
    save_json(FILES["fixtures"], fixtures)
    
    # 3. Sync Understat matches
    understat_matches = sync_understat_matches()
    save_json(FILES["understat_matches"], understat_matches)
    
    # 4. Calculate team strengths
    team_strengths = calculate_team_strengths(
        understat_matches, 
        bootstrap.get('teams', [])
    )
    save_json(FILES["team_strengths"], team_strengths)
    
    # 5. Fetch player histories and calculate all player metrics (unless quick mode)
    if not quick:
        player_histories = fetch_player_histories(
            bootstrap.get('elements', []),
            min_minutes=450,
            max_players=200
        )
        save_json(FILES["player_histories"], player_histories)
        
        # Calculate breakout players (with CS potential for defenders)
        breakout_players = calculate_breakout_players(
            player_histories,
            bootstrap.get('teams', []),
            bootstrap.get('element_types', []),
            team_strengths,
            fixtures
        )
        save_json(FILES["breakout_players"], breakout_players)
        
        # Calculate downfall players
        downfall_players = calculate_downfall_players(breakout_players)
        save_json(FILES["downfall_players"], downfall_players)
        
        # Calculate consistent players
        consistent_players = calculate_consistent_players(breakout_players)
        save_json(FILES["consistent_players"], consistent_players)
        
        # Calculate recommendations
        recommendations = calculate_recommendations(
            breakout_players,
            downfall_players,
            team_strengths,
            fixtures,
            bootstrap.get('teams', [])
        )
        save_json(FILES["recommendations"], recommendations)
    else:
        print("⏩ Skipping player histories (quick mode)")
        breakout_players = []
        downfall_players = []
        consistent_players = []
        recommendations = {'buy': [], 'sell': []}
    
    # 6. Save metadata
    metadata = {
        "last_sync": datetime.now().isoformat(),
        "sync_type": "quick" if quick else "full",
        "fpl_players": len(bootstrap.get('elements', [])),
        "fpl_teams": len(bootstrap.get('teams', [])),
        "fixtures": len(fixtures),
        "understat_matches": len(understat_matches),
        "team_strengths": len(team_strengths),
    }
    
    if not quick:
        metadata["player_histories"] = len(player_histories)
        metadata["breakout_players"] = len(breakout_players)
        metadata["downfall_players"] = len(downfall_players)
        metadata["consistent_players"] = len(consistent_players)
        metadata["buy_recommendations"] = len(recommendations['buy'])
        metadata["sell_recommendations"] = len(recommendations['sell'])
    
    save_json(FILES["metadata"], metadata)
    
    elapsed = time.time() - start_time
    
    print()
    print("=" * 60)
    print(f"✅ SYNC COMPLETE ({elapsed:.1f}s)")
    print("=" * 60)
    print()
    print(f"📊 Summary:")
    print(f"   FPL Players: {metadata['fpl_players']}")
    print(f"   FPL Teams: {metadata['fpl_teams']}")
    print(f"   Fixtures: {metadata['fixtures']}")
    print(f"   Understat Matches: {metadata['understat_matches']}")
    print(f"   Team Strengths: {metadata['team_strengths']}")
    if not quick:
        print(f"   Player Histories: {metadata['player_histories']}")
        print(f"   Breakout Players: {metadata['breakout_players']}")
        print(f"   Downfall Players: {metadata['downfall_players']}")
        print(f"   Consistent Players: {metadata['consistent_players']}")
        print(f"   Buy Recommendations: {metadata['buy_recommendations']}")
        print(f"   Sell Recommendations: {metadata['sell_recommendations']}")
    print()


# ============================================================================
# CLI
# ============================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sync FPL and Understat data")
    parser.add_argument(
        "--quick", "-q",
        action="store_true",
        help="Quick sync (skip player histories for breakout analysis)"
    )
    args = parser.parse_args()
    
    sync_all(quick=args.quick)
