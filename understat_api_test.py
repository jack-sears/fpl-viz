from understatapi import UnderstatClient
import requests
import json
import sys
import io

# Fix Unicode encoding for Windows console
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def scale_to_100(value, min_val, max_val):
    """Scale a value to 0-100 range"""
    if max_val == min_val:
        return 50
    return ((value - min_val) / (max_val - min_val)) * 100

def scale_to_100_inverted(value, min_val, max_val):
    """Scale a value to 0-100 range with inversion (for xGA - lower is better)"""
    if max_val == min_val:
        return 50
    # Invert: lower xGA (better defense) should give higher rating
    return ((max_val - value) / (max_val - min_val)) * 100

def scale_to_difficulty(rating):
    """Convert 0-100 scale to 1-5 difficulty rating"""
    if rating <= 20:
        return 1
    if rating <= 40:
        return 2
    if rating <= 60:
        return 3
    if rating <= 80:
        return 4
    return 5

def get_difficulty_label(difficulty):
    """Get label for difficulty rating"""
    labels = {1: "Very Easy", 2: "Easy", 3: "Medium", 4: "Hard", 5: "Very Hard"}
    return labels.get(difficulty, "Unknown")

# Get all teams and their match data with xG
# Try current season first, then fallback to previous season if data not available
seasons_to_try = ["2025"]
league_results = None
season_used = None

try:
    with UnderstatClient() as understat:
        for season in seasons_to_try:
            try:
                print(f"📊 Fetching EPL match data for season {season}...")
                # Try to get the data
                league_results = understat.league(league="EPL").get_match_data(season=season)
                
                # Check if we got valid data
                if league_results is None:
                    print(f"⚠️  API returned None for season {season}")
                    print(f"   This might mean the season data is not available yet.")
                    continue
                    
                if len(league_results) == 0:
                    print(f"⚠️  API returned empty list for season {season}")
                    print(f"   This might mean the season hasn't started or no matches have been played yet.")
                    continue
                    
                # Success!
                season_used = season
                print(f"✅ Found {len(league_results)} matches for season {season}\n")
                break
                
            except Exception as e:
                error_msg = str(e)
                error_type = type(e).__name__
                print(f"⚠️  Could not fetch data for season {season}: {error_type}: {error_msg}")
                
                if "JSONDecodeError" in error_type or "Expecting value" in error_msg:
                    print(f"   → The API returned invalid/empty JSON")
                    print(f"   → This usually means:")
                    print(f"      - Season {season} data is not available yet")
                    print(f"      - The Understat website structure has changed")
                    print(f"      - The website is blocking automated requests")
                    print(f"   → Try checking https://understat.com/league/EPL/{season} manually")
                elif "Connection" in error_type or "Timeout" in error_type:
                    print(f"   → Network/connection issue")
                else:
                    print(f"   → Unexpected error type")
                continue
except Exception as e:
    print(f"❌ Error initializing UnderstatClient: {e}")
    print("   Make sure you have internet connection and understatapi is installed correctly")
    sys.exit(1)

if not league_results:
    print("❌ No match data found for any season")
    print("   The Understat API may be experiencing issues or the data structure has changed.")
    print("   Try checking https://understat.com/league/EPL manually to see if the site is accessible.")
    sys.exit(1)

# Process the data
print(f"✅ Found {len(league_results)} matches for season {season_used}\n")

# Aggregate team stats
team_stats = {}
for match in league_results:
            is_result = match.get('isResult', False)
            if not is_result:
                continue
            
            home_team = match.get('h', {})
            away_team = match.get('a', {})
            home_team_name = home_team.get('title', '')
            away_team_name = away_team.get('title', '')
            
            if not home_team_name or not away_team_name:
                continue
            
            xg_data = match.get('xG', {})
            if isinstance(xg_data, dict):
                home_xg = float(xg_data.get('h', 0) or 0)
                away_xg = float(xg_data.get('a', 0) or 0)
                home_xga = away_xg
                away_xga = home_xg
            else:
                continue
            
            # Initialize teams
            if home_team_name not in team_stats:
                team_stats[home_team_name] = {
                    'xg': [], 'xga': [], 'home_xg': [], 'home_xga': [],
                    'away_xg': [], 'away_xga': [], 'matches': 0, 'home_matches': 0, 'away_matches': 0
                }
            if away_team_name not in team_stats:
                team_stats[away_team_name] = {
                    'xg': [], 'xga': [], 'home_xg': [], 'home_xga': [],
                    'away_xg': [], 'away_xga': [], 'matches': 0, 'home_matches': 0, 'away_matches': 0
                }
            
            # Add match data
            team_stats[home_team_name]['xg'].append(home_xg)
            team_stats[home_team_name]['xga'].append(home_xga)
            team_stats[home_team_name]['home_xg'].append(home_xg)
            team_stats[home_team_name]['home_xga'].append(home_xga)
            team_stats[home_team_name]['matches'] += 1
            team_stats[home_team_name]['home_matches'] += 1
            
            team_stats[away_team_name]['xg'].append(away_xg)
            team_stats[away_team_name]['xga'].append(away_xga)
            team_stats[away_team_name]['away_xg'].append(away_xg)
            team_stats[away_team_name]['away_xga'].append(away_xga)
            team_stats[away_team_name]['matches'] += 1
            team_stats[away_team_name]['away_matches'] += 1

# Calculate team strengths
team_strengths = {}
all_xg = []
all_xga = []

for team_name, stats in team_stats.items():
            matches = stats['matches']
            if matches == 0:
                continue
            
            # Calculate averages
            xg_per90 = sum(stats['xg']) / matches
            xga_per90 = sum(stats['xga']) / matches
            
            home_matches = stats['home_matches']
            away_matches = stats['away_matches']
            
            home_xg_per90 = sum(stats['home_xg']) / home_matches if home_matches > 0 else xg_per90
            home_xga_per90 = sum(stats['home_xga']) / home_matches if home_matches > 0 else xga_per90
            away_xg_per90 = sum(stats['away_xg']) / away_matches if away_matches > 0 else xg_per90
            away_xga_per90 = sum(stats['away_xga']) / away_matches if away_matches > 0 else xga_per90
            
            # Recent form (last 5 matches)
            recent_xg = stats['xg'][-5:] if len(stats['xg']) >= 5 else stats['xg']
            recent_xga = stats['xga'][-5:] if len(stats['xga']) >= 5 else stats['xga']
            recent_xg_per90 = sum(recent_xg) / len(recent_xg) if recent_xg else xg_per90
            recent_xga_per90 = sum(recent_xga) / len(recent_xga) if recent_xga else xga_per90
            
            team_strengths[team_name] = {
                'xg_per90': xg_per90,
                'xga_per90': xga_per90,
                'home_xg_per90': home_xg_per90,
                'home_xga_per90': home_xga_per90,
                'away_xg_per90': away_xg_per90,
                'away_xga_per90': away_xga_per90,
                'recent_xg_per90': recent_xg_per90,
                'recent_xga_per90': recent_xga_per90,
                'matches': matches,
                'home_matches': home_matches,
                'away_matches': away_matches
            }
            
            all_xg.append(xg_per90)
            all_xga.append(xga_per90)

min_xg = min(all_xg) if all_xg else 0
max_xg = max(all_xg) if all_xg else 0
min_xga = min(all_xga) if all_xga else 0
max_xga = max(all_xga) if all_xga else 0

# Get upcoming fixtures from FPL API
print("📊 Fetching upcoming fixtures from FPL API...")
try:
    fpl_response = requests.get('https://fantasy.premierleague.com/api/bootstrap-static/', timeout=15)
    fpl_data = fpl_response.json()
    fpl_teams = {team['name']: team['id'] for team in fpl_data.get('teams', [])}
    
    fixtures_response = requests.get('https://fantasy.premierleague.com/api/fixtures/', timeout=15)
    all_fixtures = fixtures_response.json()
    
    # Map Understat team names to FPL team names
    team_name_map = {}
    for fpl_name, fpl_id in fpl_teams.items():
        # Try to find matching Understat team name
        matched = False
        for understat_name in team_strengths.keys():
            # Handle specific mappings first
            if fpl_name == "Man City" and "Manchester City" in understat_name:
                team_name_map[fpl_id] = understat_name
                matched = True
                break
            elif fpl_name == "Man Utd" and "Manchester United" in understat_name:
                team_name_map[fpl_id] = understat_name
                matched = True
                break
            elif fpl_name == "Spurs" and "Tottenham" in understat_name:
                team_name_map[fpl_id] = understat_name
                matched = True
                break
            elif fpl_name == "Nott'm Forest" and "Nottingham" in understat_name:
                team_name_map[fpl_id] = understat_name
                matched = True
                break
            elif fpl_name == "Wolves" and "Wolverhampton" in understat_name:
                team_name_map[fpl_id] = understat_name
                matched = True
                break
            elif fpl_name == "Newcastle" and "Newcastle" in understat_name:
                team_name_map[fpl_id] = understat_name
                matched = True
                break
            # Try partial match
            elif fpl_name.lower() in understat_name.lower() or understat_name.lower() in fpl_name.lower():
                team_name_map[fpl_id] = understat_name
                matched = True
                break
    
    # Get upcoming fixtures for each team
    upcoming_fixtures_by_team = {}
    for fixture in all_fixtures:
        if fixture.get('finished', True):
            continue
        
        team_h_id = fixture.get('team_h')
        team_a_id = fixture.get('team_a')
        gameweek = fixture.get('event')
        
        if team_h_id in team_name_map:
            team_name = team_name_map[team_h_id]
            if team_name not in upcoming_fixtures_by_team:
                upcoming_fixtures_by_team[team_name] = []
            opponent_name = team_name_map.get(team_a_id, 'Unknown')
            upcoming_fixtures_by_team[team_name].append({
                'gameweek': gameweek,
                'opponent': opponent_name,
                'is_home': True
            })
        
        if team_a_id in team_name_map:
            team_name = team_name_map[team_a_id]
            if team_name not in upcoming_fixtures_by_team:
                upcoming_fixtures_by_team[team_name] = []
            opponent_name = team_name_map.get(team_h_id, 'Unknown')
            upcoming_fixtures_by_team[team_name].append({
                'gameweek': gameweek,
                'opponent': opponent_name,
                'is_home': False
            })
    
    print("✅ Fixtures loaded\n")
except Exception as e:
    print(f"⚠️  Could not load FPL fixtures: {e}\n")
    upcoming_fixtures_by_team = {}

# Print comprehensive team stats with FDR
print("="*80)
print("📊 COMPREHENSIVE TEAM STATS & FDR")
print("="*80 + "\n")

for team_name in sorted(team_strengths.keys()):
            strength = team_strengths[team_name]
            
            print(f"🏆 {team_name}")
            print("-" * 80)
            print(f"📈 Season Stats:")
            print(f"   Matches: {strength['matches']} (H: {strength['home_matches']}, A: {strength['away_matches']})")
            print(f"   xG/90: {strength['xg_per90']:.2f}")
            print(f"   xGA/90: {strength['xga_per90']:.2f}")
            print(f"   Home xG/90: {strength['home_xg_per90']:.2f}")
            print(f"   Home xGA/90: {strength['home_xga_per90']:.2f}")
            print(f"   Away xG/90: {strength['away_xg_per90']:.2f}")
            print(f"   Away xGA/90: {strength['away_xga_per90']:.2f}")
            print(f"   Recent Form (Last 5):")
            print(f"      xG/90: {strength['recent_xg_per90']:.2f}")
            print(f"      xGA/90: {strength['recent_xga_per90']:.2f}")
            
            # Calculate and display FDR for upcoming fixtures
            if team_name in upcoming_fixtures_by_team:
                fixtures = sorted(upcoming_fixtures_by_team[team_name], key=lambda x: x['gameweek'])[:5]
                if fixtures:
                    print(f"\n   🔮 Upcoming Fixtures (FDR):")
                    for fixture in fixtures:
                        opponent = fixture['opponent']
                        is_home = fixture['is_home']
                        gameweek = fixture['gameweek']
                        
                        if opponent not in team_strengths:
                            print(f"      GW{gameweek}: vs {opponent} ({'H' if is_home else 'A'}) - No data")
                            continue
                        
                        opponent_strength = team_strengths[opponent]
                        
                        # Get opponent stats based on venue
                        if is_home:
                            # We're home, opponent is away
                            opponent_xga = opponent_strength['away_xga_per90']
                            opponent_xg = opponent_strength['away_xg_per90']
                            opponent_xga_form = opponent_strength['recent_xga_per90']
                            opponent_xg_form = opponent_strength['recent_xg_per90']
                        else:
                            # We're away, opponent is home
                            opponent_xga = opponent_strength['home_xga_per90']
                            opponent_xg = opponent_strength['home_xg_per90']
                            opponent_xga_form = opponent_strength['recent_xga_per90']
                            opponent_xg_form = opponent_strength['recent_xg_per90']
                        
                        # Calculate FDR (using inverted scaling for xGA)
                        # Attack Difficulty = based on opponent's defense (xGA)
                        # Higher xGA (worse defense) = easier for our attack = lower difficulty
                        # So we invert: lower xGA (better defense) = harder for our attack = higher difficulty
                        defensive_rating = scale_to_100_inverted(opponent_xga, min_xga, max_xga)
                        defensive_form_rating = scale_to_100_inverted(opponent_xga_form, min_xga, max_xga)
                        home_boost = 10 if is_home else 0  # Home advantage reduces difficulty
                        attack_difficulty_raw = (defensive_rating * 0.70) + (defensive_form_rating * 0.20) + (home_boost * 0.10)
                        attack_difficulty = scale_to_difficulty(attack_difficulty_raw)
                        
                        # Defense Difficulty = based on opponent's attack (xG)
                        # Higher xG (better attack) = harder for our defense = higher difficulty
                        attacking_rating = scale_to_100(opponent_xg, min_xg, max_xg)
                        attacking_form_rating = scale_to_100(opponent_xg_form, min_xg, max_xg)
                        home_boost_def = 10 if is_home else 0  # Home advantage reduces difficulty
                        defense_difficulty_raw = (attacking_rating * 0.70) + (attacking_form_rating * 0.20) + (home_boost_def * 0.10)
                        defense_difficulty = scale_to_difficulty(defense_difficulty_raw)
                        
                        avg_difficulty = (attack_difficulty + defense_difficulty) / 2
                        
                        print(f"      GW{gameweek}: vs {opponent} ({'H' if is_home else 'A'})")
                        print(f"         Attack FDR: {attack_difficulty:.1f} ({get_difficulty_label(attack_difficulty)})")
                        print(f"         Defense FDR: {defense_difficulty:.1f} ({get_difficulty_label(defense_difficulty)})")
                        print(f"         Avg FDR: {avg_difficulty:.1f}")
            
            print()