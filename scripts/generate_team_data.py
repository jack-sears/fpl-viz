"""
Generate Static Team Data Files
================================
Fetches team data from FPL API and saves as JSON for GitHub Pages deployment.

Usage:
    python scripts/generate_team_data.py <team_id1> [team_id2] [team_id3] ...

Example:
    python scripts/generate_team_data.py 1234567 7654321
"""
import json
import os
import sys
import requests
from pathlib import Path
from datetime import datetime

FPL_API_BASE = 'https://fantasy.premierleague.com/api'
DATA_DIR = Path(__file__).parent.parent / "data"
PUBLIC_DATA_DIR = Path(__file__).parent.parent / "public" / "data"
TEAMS_DIR = PUBLIC_DATA_DIR / "teams"

def load_local_data(filename):
    """Load data from local cache file"""
    filepath = DATA_DIR / filename
    if filepath.exists():
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None

def fetch_api_data(url):
    """Fetch data from FPL API"""
    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"❌ Error fetching {url}: {e}")
        return None

def get_next_fixtures(player_team_id, fixtures, teams, num_fixtures=5):
    """Get upcoming fixtures for a player's team"""
    upcoming = [
        f for f in fixtures 
        if not f.get('finished', True) and 
        (f.get('team_h') == player_team_id or f.get('team_a') == player_team_id)
    ]
    upcoming.sort(key=lambda x: x.get('event', 99))
    upcoming = upcoming[:num_fixtures]
    
    team_map = {t['id']: t for t in teams}
    
    result = []
    for f in upcoming:
        is_home = f.get('team_h') == player_team_id
        opponent_id = f.get('team_a') if is_home else f.get('team_h')
        opponent = team_map.get(opponent_id, {})
        
        result.append({
            'opponent': opponent.get('name', 'TBD'),
            'opponentShort': opponent.get('short_name', opponent.get('name', 'TBD')[:3].upper()),
            'isHome': is_home,
            'gameweek': f.get('event', 0),
            'difficulty': f.get('team_h_difficulty' if is_home else 'team_a_difficulty', 3),
        })
    
    return result

def generate_team_data(team_id):
    """Generate team data file for a given team ID"""
    print(f"\n🔄 Processing team {team_id}...")
    
    # Load local bootstrap and fixtures data
    bootstrap = load_local_data('fpl_bootstrap.json')
    fixtures = load_local_data('fpl_fixtures.json')
    
    if not bootstrap:
        print(f"❌ Bootstrap data not found. Please run sync_data.py first.")
        return False
    
    if not fixtures:
        print(f"❌ Fixtures data not found. Please run sync_data.py first.")
        return False
    
    teams = bootstrap.get('teams', [])
    players = bootstrap.get('elements', [])
    positions = bootstrap.get('element_types', [])
    
    # Build maps
    position_map = {p['id']: p['singular_name_short'] for p in positions}
    team_map = {t['id']: t for t in teams}
    player_map = {p['id']: p for p in players}
    
    # Fetch team data from API
    entry_url = f'{FPL_API_BASE}/entry/{team_id}/'
    entry_data = fetch_api_data(entry_url)
    if not entry_data:
        print(f"❌ Failed to fetch team entry data for {team_id}")
        return False
    
    current_gw = entry_data.get('current_event', 1)
    
    # Fetch picks
    picks_url = f'{FPL_API_BASE}/entry/{team_id}/event/{current_gw}/picks/'
    picks_data = fetch_api_data(picks_url)
    if not picks_data:
        print(f"❌ Failed to fetch picks data for {team_id}")
        return False
    
    # Fetch history (optional, for transfer calculation)
    history_url = f'{FPL_API_BASE}/entry/{team_id}/history/'
    history_data = fetch_api_data(history_url)
    
    # Calculate free transfers
    free_transfers = 1
    if history_data and history_data.get('current'):
        current_history = history_data['current']
        if len(current_history) >= 1:
            last_gw = current_history[-1]
            if last_gw.get('event_transfers', 0) == 0 and last_gw.get('event_transfers_cost', 0) == 0:
                free_transfers = 2  # Banked a transfer
    
    # Build team info
    entry_history = picks_data.get('entry_history', {})
    info = {
        'id': entry_data['id'],
        'managerName': f"{entry_data.get('player_first_name', '')} {entry_data.get('player_last_name', '')}".strip(),
        'teamName': entry_data.get('name', ''),
        'totalPoints': entry_data.get('summary_overall_points', 0),
        'overallRank': entry_data.get('summary_overall_rank', 0),
        'gameweekPoints': entry_history.get('points', 0),
        'gameweekRank': entry_history.get('rank', 0),
        'currentGameweek': current_gw,
        'bank': entry_history.get('bank', 0) / 10,  # Convert to millions
        'teamValue': entry_history.get('value', 0) / 10,  # Convert to millions
        'transfersAvailable': free_transfers,
    }
    
    # Build picks
    picks = []
    fpl_picks = picks_data.get('picks', [])
    
    for fpl_pick in fpl_picks:
        player_id = fpl_pick.get('element')
        fpl_player = player_map.get(player_id)
        
        if not fpl_player:
            # Fallback for missing player
            pick = {
                'player': {
                    'id': player_id,
                    'name': f'Unknown ({player_id})',
                    'webName': 'Unknown',
                    'team': 'Unknown',
                    'teamId': 0,
                    'position': 'UNK',
                    'price': 0,
                    'form': 0,
                    'totalPoints': 0,
                    'minutes': 0,
                    'goals': 0,
                    'assists': 0,
                    'cleanSheets': 0,
                    'selectedBy': 0,
                },
                'position': fpl_pick.get('position', 0),
                'isCaptain': fpl_pick.get('is_captain', False),
                'isViceCaptain': fpl_pick.get('is_vice_captain', False),
                'multiplier': fpl_pick.get('multiplier', 1),
                'isStarter': fpl_pick.get('position', 0) <= 11,
                'nextFixtures': [],
            }
            picks.append(pick)
            continue
        
        # Map FPL player to our format
        team = team_map.get(fpl_player.get('team', 0), {})
        position = position_map.get(fpl_player.get('element_type', 0), 'UNK')
        form = float(fpl_player.get('form', '0') or '0')
        selected_by = float(fpl_player.get('selected_by_percent', '0') or '0')
        
        player = {
            'id': fpl_player['id'],
            'name': f"{fpl_player.get('first_name', '')} {fpl_player.get('second_name', '')}".strip(),
            'webName': fpl_player.get('web_name', ''),
            'team': team.get('name', 'Unknown'),
            'teamId': fpl_player.get('team', 0),
            'position': position,
            'price': fpl_player.get('now_cost', 0) / 10,  # Convert to millions
            'form': form,
            'totalPoints': fpl_player.get('total_points', 0),
            'minutes': fpl_player.get('minutes', 0),
            'goals': fpl_player.get('goals_scored', 0),
            'assists': fpl_player.get('assists', 0),
            'cleanSheets': fpl_player.get('clean_sheets', 0),
            'selectedBy': selected_by,
        }
        
        # Get next fixtures
        player_team_id = fpl_player.get('team', 0)
        next_fixtures = get_next_fixtures(player_team_id, fixtures, teams, 5)
        
        pick = {
            'player': player,
            'position': fpl_pick.get('position', 0),
            'isCaptain': fpl_pick.get('is_captain', False),
            'isViceCaptain': fpl_pick.get('is_vice_captain', False),
            'multiplier': fpl_pick.get('multiplier', 1),
            'isStarter': fpl_pick.get('position', 0) <= 11,
            'nextFixtures': next_fixtures,
        }
        
        picks.append(pick)
    
    # Sort picks by position
    picks.sort(key=lambda x: x['position'])
    
    # Build final team object
    team = {
        'info': info,
        'picks': picks,
        'starters': [p for p in picks if p['isStarter']],
        'bench': [p for p in picks if not p['isStarter']],
    }
    
    # Save to file (in public/data/teams so Vite copies it automatically)
    TEAMS_DIR.mkdir(parents=True, exist_ok=True)
    output_file = TEAMS_DIR / f'{team_id}.json'
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(team, f, indent=2, ensure_ascii=False)
    
    # Also save to data/teams for reference
    data_teams_dir = DATA_DIR / "teams"
    data_teams_dir.mkdir(parents=True, exist_ok=True)
    backup_file = data_teams_dir / f'{team_id}.json'
    with open(backup_file, 'w', encoding='utf-8') as f:
        json.dump(team, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Saved team {team_id} ({info['teamName']}) to {output_file}")
    print(f"   Manager: {info['managerName']}")
    print(f"   Points: {info['totalPoints']} (Rank: {info['overallRank']:,})")
    print(f"   Players: {len(picks)} ({len([p for p in picks if p['isStarter']])} starters, {len([p for p in picks if not p['isStarter']])} bench)")
    
    return True

def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("Usage: python scripts/generate_team_data.py <team_id1> [team_id2] [team_id3] ...")
        print("\nExample:")
        print("  python scripts/generate_team_data.py 1234567 7654321")
        sys.exit(1)
    
    team_ids = []
    for arg in sys.argv[1:]:
        try:
            team_ids.append(int(arg))
        except ValueError:
            print(f"❌ Invalid team ID: {arg}")
            sys.exit(1)
    
    print(f"🚀 Generating team data files for {len(team_ids)} team(s)...")
    print(f"📁 Output directory: {TEAMS_DIR}")
    
    success_count = 0
    for team_id in team_ids:
        if generate_team_data(team_id):
            success_count += 1
    
    print(f"\n✅ Successfully generated {success_count}/{len(team_ids)} team file(s)")
    print(f"\n📝 Note: Remember to commit these files to git for GitHub Pages deployment")

if __name__ == '__main__':
    main()

