"""
Understat Match Data API
========================
Scrapes and provides team xG data from Understat match pages.

Usage:
    from understat_api import UnderstatAPI
    
    api = UnderstatAPI()
    api.scrape_matches(start_id=28778, league="EPL")  # Scrape EPL matches
    
    # Get team stats
    stats = api.get_team_stats()
    
    # Get specific team
    liverpool = api.get_team("Liverpool")
"""

import json
import os
import time
import requests
from bs4 import BeautifulSoup
from dataclasses import dataclass, asdict
from typing import Optional
from datetime import datetime


# Data file for caching scraped matches
DATA_FILE = "understat_matches_cache.json"

# Request headers
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}


@dataclass
class Match:
    """Single match data from Understat"""
    id: int
    date: str
    season: int
    league: str
    home_team: str
    away_team: str
    home_goals: int
    away_goals: int
    home_xG: float
    away_xG: float
    home_shots: int
    away_shots: int
    home_shots_on_target: int
    away_shots_on_target: int
    home_deep: int
    away_deep: int
    home_ppda: float
    away_ppda: float
    home_win_prob: float
    home_draw_prob: float
    home_loss_prob: float


@dataclass
class TeamStats:
    """Aggregated team statistics"""
    team: str
    matches: int
    home_matches: int
    away_matches: int
    goals: int
    goals_against: int
    xG: float
    xGA: float
    home_xG: float
    home_xGA: float
    away_xG: float
    away_xGA: float
    shots: int
    shots_against: int
    shots_on_target: int
    shots_on_target_against: int
    
    @property
    def xG_per_match(self) -> float:
        return self.xG / self.matches if self.matches > 0 else 0
    
    @property
    def xGA_per_match(self) -> float:
        return self.xGA / self.matches if self.matches > 0 else 0
    
    @property
    def home_xG_per_match(self) -> float:
        return self.home_xG / self.home_matches if self.home_matches > 0 else 0
    
    @property
    def home_xGA_per_match(self) -> float:
        return self.home_xGA / self.home_matches if self.home_matches > 0 else 0
    
    @property
    def away_xG_per_match(self) -> float:
        return self.away_xG / self.away_matches if self.away_matches > 0 else 0
    
    @property
    def away_xGA_per_match(self) -> float:
        return self.away_xGA / self.away_matches if self.away_matches > 0 else 0
    
    @property
    def xG_difference(self) -> float:
        return self.xG - self.xGA


class UnderstatAPI:
    """
    API for fetching and analyzing Understat match data.
    """
    
    BASE_URL = "https://understat.com/match"
    
    def __init__(self, cache_file: str = DATA_FILE):
        self.cache_file = cache_file
        self.matches: list[Match] = []
        self._load_cache()
    
    def _load_cache(self):
        """Load cached matches from file"""
        if os.path.exists(self.cache_file):
            try:
                with open(self.cache_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.matches = [Match(**m) for m in data.get('matches', [])]
                    print(f"📂 Loaded {len(self.matches)} cached matches")
            except (json.JSONDecodeError, KeyError) as e:
                print(f"⚠️ Could not load cache: {e}")
                self.matches = []
    
    def _save_cache(self):
        """Save matches to cache file"""
        data = {
            'last_updated': datetime.now().isoformat(),
            'matches': [asdict(m) for m in self.matches]
        }
        with open(self.cache_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"💾 Saved {len(self.matches)} matches to cache")
    
    def _scrape_match(self, match_id: int) -> Optional[Match]:
        """Scrape a single match by ID"""
        url = f"{self.BASE_URL}/{match_id}"
        
        try:
            res = requests.get(url, headers=HEADERS, timeout=15)
            
            if res.status_code == 404:
                return None
            
            res.raise_for_status()
            
            soup = BeautifulSoup(res.content, 'lxml')
            scripts = soup.find_all('script')
            
            if len(scripts) < 3:
                return None
            
            script_content = scripts[2].string
            if not script_content:
                return None
            
            # Extract JSON data
            try:
                ind_start = script_content.index("('") + 2
                ind_end = script_content.index("')")
                json_str = script_content[ind_start:ind_end]
                json_str = json_str.encode('utf-8').decode('unicode_escape')
                data = json.loads(json_str)
            except (ValueError, json.JSONDecodeError):
                return None
            
            # Check if match has data
            if not data.get('isData', False):
                return None
            
            return Match(
                id=int(data.get('id', match_id)),
                date=data.get('date', ''),
                season=int(data.get('season', 0)),
                league=data.get('league', ''),
                home_team=data.get('team_h', ''),
                away_team=data.get('team_a', ''),
                home_goals=int(data.get('h_goals', 0)),
                away_goals=int(data.get('a_goals', 0)),
                home_xG=float(data.get('h_xg', 0)),
                away_xG=float(data.get('a_xg', 0)),
                home_shots=int(data.get('h_shot', 0)),
                away_shots=int(data.get('a_shot', 0)),
                home_shots_on_target=int(data.get('h_shotOnTarget', 0)),
                away_shots_on_target=int(data.get('a_shotOnTarget', 0)),
                home_deep=int(data.get('h_deep', 0)),
                away_deep=int(data.get('a_deep', 0)),
                home_ppda=float(data.get('h_ppda', 0)),
                away_ppda=float(data.get('a_ppda', 0)),
                home_win_prob=float(data.get('h_w', 0)),
                home_draw_prob=float(data.get('h_d', 0)),
                home_loss_prob=float(data.get('h_l', 0)),
            )
            
        except requests.RequestException as e:
            print(f"❌ Request error for match {match_id}: {e}")
            return None
    
    def scrape_matches(
        self,
        start_id: int = 28778,
        league: Optional[str] = "EPL",
        season: Optional[int] = None,
        max_consecutive_404: int = 50,
        delay: float = 0.3,
        max_matches: Optional[int] = None
    ) -> int:
        """
        Scrape matches starting from start_id until hitting consecutive 404s.
        
        Args:
            start_id: Starting match ID (default is start of 2024/25 EPL season)
            league: Filter by league (e.g., "EPL", "La_Liga", None for all)
            season: Filter by season year (e.g., 2025 for 2024/25)
            max_consecutive_404: Stop after this many consecutive 404 responses
            delay: Delay between requests in seconds
            max_matches: Maximum number of matches to scrape (None for unlimited)
        
        Returns:
            Number of new matches scraped
        """
        print(f"🔄 Starting scrape from match ID {start_id}...")
        if league:
            print(f"   Filtering for league: {league}")
        if season:
            print(f"   Filtering for season: {season}")
        
        # Get existing match IDs to avoid re-scraping
        existing_ids = {m.id for m in self.matches}
        
        current_id = start_id
        consecutive_404 = 0
        new_matches = 0
        total_checked = 0
        
        while consecutive_404 < max_consecutive_404:
            if max_matches and new_matches >= max_matches:
                print(f"   Reached max_matches limit ({max_matches})")
                break
            
            # Skip if already scraped
            if current_id in existing_ids:
                current_id += 1
                continue
            
            total_checked += 1
            
            # Progress update every 50 matches
            if total_checked % 50 == 0:
                print(f"   Checked {total_checked} IDs, found {new_matches} new matches...")
            
            match = self._scrape_match(current_id)
            
            if match is None:
                consecutive_404 += 1
                current_id += 1
                time.sleep(delay / 2)  # Shorter delay for 404s
                continue
            
            consecutive_404 = 0  # Reset counter
            
            # Apply filters
            if league and match.league != league:
                current_id += 1
                time.sleep(delay)
                continue
            
            if season and match.season != season:
                current_id += 1
                time.sleep(delay)
                continue
            
            # Add match
            self.matches.append(match)
            existing_ids.add(current_id)
            new_matches += 1
            
            print(f"   ✅ {match.date[:10]} {match.home_team} {match.home_goals}-{match.away_goals} {match.away_team} (xG: {match.home_xG:.2f}-{match.away_xG:.2f})")
            
            current_id += 1
            time.sleep(delay)
        
        print(f"\n📊 Scraping complete!")
        print(f"   Checked {total_checked} match IDs")
        print(f"   Found {new_matches} new matches")
        print(f"   Total matches in cache: {len(self.matches)}")
        
        # Save to cache
        if new_matches > 0:
            self._save_cache()
        
        return new_matches
    
    def get_matches(
        self,
        league: Optional[str] = None,
        season: Optional[int] = None,
        team: Optional[str] = None
    ) -> list[Match]:
        """
        Get matches with optional filters.
        
        Args:
            league: Filter by league
            season: Filter by season
            team: Filter by team (home or away)
        
        Returns:
            List of matching Match objects
        """
        matches = self.matches
        
        if league:
            matches = [m for m in matches if m.league == league]
        
        if season:
            matches = [m for m in matches if m.season == season]
        
        if team:
            team_lower = team.lower()
            matches = [m for m in matches if 
                      team_lower in m.home_team.lower() or 
                      team_lower in m.away_team.lower()]
        
        return sorted(matches, key=lambda m: m.date)
    
    def get_team_stats(
        self,
        league: Optional[str] = "EPL",
        season: Optional[int] = None
    ) -> dict[str, TeamStats]:
        """
        Calculate aggregated stats for all teams.
        
        Returns:
            Dictionary mapping team name to TeamStats
        """
        matches = self.get_matches(league=league, season=season)
        
        stats: dict[str, dict] = {}
        
        for match in matches:
            # Initialize teams
            for team in [match.home_team, match.away_team]:
                if team not in stats:
                    stats[team] = {
                        'team': team,
                        'matches': 0, 'home_matches': 0, 'away_matches': 0,
                        'goals': 0, 'goals_against': 0,
                        'xG': 0.0, 'xGA': 0.0,
                        'home_xG': 0.0, 'home_xGA': 0.0,
                        'away_xG': 0.0, 'away_xGA': 0.0,
                        'shots': 0, 'shots_against': 0,
                        'shots_on_target': 0, 'shots_on_target_against': 0,
                    }
            
            # Home team stats
            home = match.home_team
            stats[home]['matches'] += 1
            stats[home]['home_matches'] += 1
            stats[home]['goals'] += match.home_goals
            stats[home]['goals_against'] += match.away_goals
            stats[home]['xG'] += match.home_xG
            stats[home]['xGA'] += match.away_xG
            stats[home]['home_xG'] += match.home_xG
            stats[home]['home_xGA'] += match.away_xG
            stats[home]['shots'] += match.home_shots
            stats[home]['shots_against'] += match.away_shots
            stats[home]['shots_on_target'] += match.home_shots_on_target
            stats[home]['shots_on_target_against'] += match.away_shots_on_target
            
            # Away team stats
            away = match.away_team
            stats[away]['matches'] += 1
            stats[away]['away_matches'] += 1
            stats[away]['goals'] += match.away_goals
            stats[away]['goals_against'] += match.home_goals
            stats[away]['xG'] += match.away_xG
            stats[away]['xGA'] += match.home_xG
            stats[away]['away_xG'] += match.away_xG
            stats[away]['away_xGA'] += match.home_xG
            stats[away]['shots'] += match.away_shots
            stats[away]['shots_against'] += match.home_shots
            stats[away]['shots_on_target'] += match.away_shots_on_target
            stats[away]['shots_on_target_against'] += match.home_shots_on_target
        
        return {name: TeamStats(**data) for name, data in stats.items()}
    
    def get_team(self, team_name: str, league: str = "EPL", season: Optional[int] = None) -> Optional[TeamStats]:
        """Get stats for a specific team"""
        all_stats = self.get_team_stats(league=league, season=season)
        
        # Try exact match first
        if team_name in all_stats:
            return all_stats[team_name]
        
        # Try partial match
        team_lower = team_name.lower()
        for name, stats in all_stats.items():
            if team_lower in name.lower():
                return stats
        
        return None
    
    def get_recent_form(self, team_name: str, num_matches: int = 5, league: str = "EPL") -> list[Match]:
        """Get recent matches for a team"""
        matches = self.get_matches(league=league, team=team_name)
        return matches[-num_matches:] if matches else []
    
    def print_league_table(self, league: str = "EPL", season: Optional[int] = None):
        """Print xG-based league table"""
        stats = self.get_team_stats(league=league, season=season)
        
        if not stats:
            print("No data available")
            return
        
        # Sort by xG difference
        sorted_teams = sorted(stats.values(), key=lambda x: x.xG_difference, reverse=True)
        
        print(f"\n{'Team':<22} {'M':>3} {'xG':>6} {'xGA':>6} {'xG/M':>6} {'xGA/M':>6} {'xGD':>7}")
        print("-" * 60)
        
        for team in sorted_teams:
            print(f"{team.team[:21]:<22} {team.matches:>3} {team.xG:>6.1f} {team.xGA:>6.1f} "
                  f"{team.xG_per_match:>6.2f} {team.xGA_per_match:>6.2f} {team.xG_difference:>+7.1f}")


# ============================================================================
# CLI for testing
# ============================================================================

if __name__ == "__main__":
    import sys
    
    api = UnderstatAPI()
    
    # Check for command line args
    if len(sys.argv) > 1:
        if sys.argv[1] == "scrape":
            # Scrape new matches
            start_id = int(sys.argv[2]) if len(sys.argv) > 2 else 28778
            api.scrape_matches(start_id=start_id, league="EPL")
        elif sys.argv[1] == "stats":
            # Show stats
            api.print_league_table()
    else:
        # Default: show current cached data
        print("=" * 60)
        print("📊 UNDERSTAT API - Cached Data Summary")
        print("=" * 60)
        
        if api.matches:
            epl_matches = [m for m in api.matches if m.league == "EPL"]
            print(f"\nTotal cached matches: {len(api.matches)}")
            print(f"EPL matches: {len(epl_matches)}")
            
            if epl_matches:
                print("\n📋 EPL xG Table:")
                api.print_league_table(league="EPL")
                
                # Show recent matches
                recent = sorted(epl_matches, key=lambda m: m.date, reverse=True)[:5]
                print(f"\n📅 Recent EPL Matches:")
                print(f"{'Date':<12} {'Home':<18} {'xG':>5} {'Score':^7} {'xG':<5} {'Away':<18}")
                print("-" * 70)
                for m in recent:
                    score = f"{m.home_goals}-{m.away_goals}"
                    print(f"{m.date[:10]:<12} {m.home_team[:17]:<18} {m.home_xG:>5.2f} {score:^7} {m.away_xG:<5.2f} {m.away_team[:17]:<18}")
        else:
            print("\nNo cached data. Run: python understat_api.py scrape")
        
        print("\n" + "=" * 60)
        print("Usage:")
        print("  python understat_api.py scrape [start_id]  - Scrape new matches")
        print("  python understat_api.py stats              - Show xG table")
        print("=" * 60)

