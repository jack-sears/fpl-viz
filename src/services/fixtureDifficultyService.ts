import axios from 'axios';
import type { Player, FPLPlayerHistory } from '../types/fpl';
import { dataService } from './dataService';

const BACKEND_API_BASE = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:5000';

export interface TeamStrength {
  teamId: number;
  teamName: string;
  // Season averages (xG/xGA)
  xGPer90: number;
  xGAPer90: number;
  // Actual goals (GF/GA)
  gfPer90: number;
  gaPer90: number;
  // Home/away splits (xG/xGA)
  xGPer90Home: number;
  xGAPer90Home: number;
  xGPer90Away: number;
  xGAPer90Away: number;
  // Home/away splits (GF/GA)
  gfPer90Home: number;
  gaPer90Home: number;
  gfPer90Away: number;
  gaPer90Away: number;
  // Home/away bonuses (team-specific)
  homeAttackBonus: number;  // xG_home - xG_overall
  homeDefenseBonus: number;  // xGA_overall - xGA_home
  // Recent form (rolling xG difference)
  formFactor: number;  // Average (xG - xGA) over last 5 matches
}

export interface FixtureDifficulty {
  gameweek: number;
  opponentTeamId: number;
  opponentTeamName: string;
  isHome: boolean;
  attackDifficulty: number; // 1-5 scale
  defenseDifficulty: number; // 1-5 scale
  attackDifficultyRaw: number; // 0-100 scale
  defenseDifficultyRaw: number; // 0-100 scale
}

export interface FPLFixture {
  id: number;
  event: number; // gameweek
  team_h: number; // home team id
  team_a: number; // away team id
  team_h_score: number | null;
  team_a_score: number | null;
  finished: boolean;
  kickoff_time: string;
  is_home: boolean;
  difficulty: number;
}

class FixtureDifficultyService {
  private teamStrengths: Map<number, TeamStrength> = new Map();
  private players: Player[] = [];
  private calculatingTeamStrengths: Promise<Map<number, TeamStrength>> | null = null;
  private playerHistoryCache: Map<number, FPLPlayerHistory[]> = new Map();
  private fixturesCache: any[] | null = null;
  private bootstrapCache: any | null = null;

  /**
   * Get player history with caching
   */
  private async getPlayerHistory(playerId: number): Promise<FPLPlayerHistory[]> {
    if (this.playerHistoryCache.has(playerId)) {
      return this.playerHistoryCache.get(playerId)!;
    }

    try {
      const summaryUrl = `${BACKEND_API_BASE}/api/element-summary/${playerId}/`;
      const response = await axios.get<any>(summaryUrl);
      const history = response.data.history || [];
      this.playerHistoryCache.set(playerId, history);
      return history;
    } catch (error) {
      console.warn(`Failed to fetch history for player ${playerId}:`, error);
      return [];
    }
  }

  /**
   * Calculate team strengths from match-level player history data
   * This aggregates xG/xGA from all players on each team for accurate team-level stats
   */
  async calculateTeamStrengths(): Promise<Map<number, TeamStrength>> {
    // Return cached result if available
    if (this.teamStrengths.size > 0) {
      return this.teamStrengths;
    }

    // If already calculating, wait for that promise
    if (this.calculatingTeamStrengths) {
      return this.calculatingTeamStrengths;
    }

    // Start calculation and cache the promise
    this.calculatingTeamStrengths = this._calculateTeamStrengths();
    
    try {
      const result = await this.calculatingTeamStrengths;
      this.calculatingTeamStrengths = null; // Clear promise cache after completion
      return result;
    } catch (error) {
      this.calculatingTeamStrengths = null; // Clear on error too
      throw error;
    }
  }

  private async _calculateTeamStrengths(): Promise<Map<number, TeamStrength>> {
    try {
      console.log('🔄 Calculating team strengths from Understat data...');

      // Get data from Understat (required, no fallback)
      const understatUrl = `${BACKEND_API_BASE}/api/understat/team-stats`;
      const understatResponse = await axios.get<any[]>(understatUrl);
      const understatData = understatResponse.data || [];
      
      if (understatData.length === 0) {
        throw new Error('No team data received from Understat');
      }
      
      console.log(`✅ Loaded ${understatData.length} teams from Understat`);

      // Get FPL teams for mapping
      const bootstrapUrl = `${BACKEND_API_BASE}/api/bootstrap-static/`;
      const bootstrapResponse = await axios.get<any>(bootstrapUrl);
      const teams = bootstrapResponse.data.teams;

      // Map FPL team names to Understat team names
      const fplToUnderstatMap: Record<string, string> = {
        'Arsenal': 'Arsenal',
        'Aston Villa': 'Aston Villa',
        'Bournemouth': 'Bournemouth',
        'Brentford': 'Brentford',
        'Brighton': 'Brighton',
        'Burnley': 'Burnley',
        'Chelsea': 'Chelsea',
        'Crystal Palace': 'Crystal Palace',
        'Everton': 'Everton',
        'Fulham': 'Fulham',
        'Ipswich': 'Ipswich',
        'Leeds': 'Leeds United',
        'Leicester': 'Leicester',
        'Liverpool': 'Liverpool',
        'Man City': 'Manchester City',
        'Man Utd': 'Manchester United',
        'Newcastle': 'Newcastle United',
        "Nott'm Forest": 'Nottingham Forest',
        'Southampton': 'Southampton',
        'Spurs': 'Tottenham',
        'Sunderland': 'Sunderland',
        'West Ham': 'West Ham',
        'Wolves': 'Wolverhampton Wanderers'
      };

      // Create a map from FPL team ID to Understat data (backend returns team_id)
      const understatMapById = new Map<number, any>();
      const understatMapByName = new Map<string, any>();
      
      understatData.forEach(team => {
        // Map by team_id (FPL ID) - this is the primary mapping
        if (team.team_id) {
          understatMapById.set(team.team_id, team);
        }
        // Also map by name for fallback
        understatMapByName.set(team.team_name, team);
      });

      console.log(`📊 Understat data: ${understatData.length} teams`);
      console.log(`📊 Teams mapped by ID: ${understatMapById.size}`);
      console.log(`📊 Sample team names from backend:`, understatData.slice(0, 3).map(t => t.team_name));

      // Get min/max for scaling
      const allXGA: number[] = [];
      const allXG: number[] = [];

      // Process each FPL team and match with Understat data
      teams.forEach((team: any) => {
        // Try to find by team ID first (most reliable)
        let understatTeam = understatMapById.get(team.id);
        
        // Fallback to name mapping if ID doesn't work
        if (!understatTeam) {
          const understatName = fplToUnderstatMap[team.name];
          understatTeam = understatName ? understatMapByName.get(understatName) : null;
        }

        if (!understatTeam) {
          console.warn(`No Understat data found for ${team.name} (ID: ${team.id})`);
          return;
        }

        // Extract all the new fields from backend
        const teamStrength: TeamStrength = {
          teamId: team.id,
          teamName: team.name,
          // xG/xGA averages
          xGPer90: understatTeam.xg_per90 || 0,
          xGAPer90: understatTeam.xga_per90 || 0,
          // GF/GA averages
          gfPer90: understatTeam.gf_per90 || 0,
          gaPer90: understatTeam.ga_per90 || 0,
          // Home/away xG/xGA
          xGPer90Home: understatTeam.home_xg_per90 || 0,
          xGAPer90Home: understatTeam.home_xga_per90 || 0,
          xGPer90Away: understatTeam.away_xg_per90 || 0,
          xGAPer90Away: understatTeam.away_xga_per90 || 0,
          // Home/away GF/GA
          gfPer90Home: understatTeam.home_gf_per90 || 0,
          gaPer90Home: understatTeam.home_ga_per90 || 0,
          gfPer90Away: understatTeam.away_gf_per90 || 0,
          gaPer90Away: understatTeam.away_ga_per90 || 0,
          // Home/away bonuses
          homeAttackBonus: understatTeam.home_attack_bonus || 0,
          homeDefenseBonus: understatTeam.home_defense_bonus || 0,
          // Form factor (rolling xG difference)
          formFactor: understatTeam.form_factor || 0,
        };

        this.teamStrengths.set(team.id, teamStrength);
        allXGA.push(teamStrength.xGAPer90);
        allXG.push(teamStrength.xGPer90);
      });

      // Calculate min/max for debug logging
      const allXGForDebug = Array.from(this.teamStrengths.values()).map(t => t.xGPer90).filter(v => v > 0);
      const allXGAForDebug = Array.from(this.teamStrengths.values()).map(t => t.xGAPer90).filter(v => v > 0);
      
      console.log(`✅ Calculated team strengths for ${this.teamStrengths.size} teams from Understat`);
      
      // Debug: Log sample team strengths
      if (this.teamStrengths.size > 0 && allXGForDebug.length > 0 && allXGAForDebug.length > 0) {
        const sampleTeam = Array.from(this.teamStrengths.values())[0];
        const minXGDebug = Math.min(...allXGForDebug);
        const maxXGDebug = Math.max(...allXGForDebug);
        const minXGADebug = Math.min(...allXGAForDebug);
        const maxXGADebug = Math.max(...allXGAForDebug);
        
        console.log(`📊 Sample team strength:`, {
          name: sampleTeam.teamName,
          xGPer90: sampleTeam.xGPer90,
          xGAPer90: sampleTeam.xGAPer90,
        });
        console.log(`📊 Min/Max xG: ${minXGDebug.toFixed(2)} - ${maxXGDebug.toFixed(2)}`);
        console.log(`📊 Min/Max xGA: ${minXGADebug.toFixed(2)} - ${maxXGADebug.toFixed(2)}`);
      }
      
      return this.teamStrengths;
    } catch (error) {
      console.error('❌ Error calculating team strengths from Understat:', error);
      throw error; // Throw error instead of falling back
    }
  }

  // Removed _calculateTeamStrengthsFromPlayers - no longer using fallback

  /**
   * Scale a value to 0-100 range based on min/max
   * Higher value = higher rating (for xG)
   */
  private scaleTo100(value: number, min: number, max: number): number {
    if (max === min) return 50; // All teams equal
    return ((value - min) / (max - min)) * 100;
  }

  /**
   * Scale a value to 0-100 range with inversion
   * Lower value = higher rating (for xGA - better defense = lower xGA)
   */
  private scaleTo100Inverted(value: number, min: number, max: number): number {
    if (max === min) return 50; // All teams equal
    // Invert: lower xGA (better defense) should give higher rating
    return ((max - value) / (max - min)) * 100;
  }

  /**
   * Convert 0-100 scale to 1-5 difficulty rating (integer only, no 0.5s)
   * Matches the test file implementation
   */
  private scaleToDifficulty(rating: number): number {
    // 0-20 = 1 (very easy)
    // 20-40 = 2 (easy)
    // 40-60 = 3 (medium)
    // 60-80 = 4 (hard)
    // 80-100 = 5 (very hard)
    if (rating <= 20) return 1;
    if (rating <= 40) return 2;
    if (rating <= 60) return 3;
    if (rating <= 80) return 4;
    return 5;
  }

  /**
   * Calculate fixture difficulty for a team's upcoming fixtures
   */
  async calculateFixtureDifficulty(
    _teamId: number, // Not used but kept for API consistency
    upcomingFixtures: Array<{ gameweek: number; opponentTeamId: number; isHome: boolean }>
  ): Promise<FixtureDifficulty[]> {
    const teamStrengths = await this.calculateTeamStrengths();
    
    // Cache bootstrap data to avoid repeated API calls
    if (!this.bootstrapCache) {
      const bootstrapUrl = `${BACKEND_API_BASE}/api/bootstrap-static/`;
      const bootstrapResponse = await axios.get<any>(bootstrapUrl);
      this.bootstrapCache = bootstrapResponse.data;
    }
    const teams = this.bootstrapCache.teams;

    // New FDR calculation method:
    // 1. Pre-calculate combined Attack/Defense Ratings for all teams (α=0.7 for xG, β=0.7 for xGA)
    const ALPHA = 0.7; // Weight for xG vs GF
    const BETA = 0.7;  // Weight for xGA vs GA
    
    // Pre-calculate all combined ratings for home and away scenarios
    const allHomeAttackRatings: number[] = [];
    const allAwayAttackRatings: number[] = [];
    const allHomeDefenseRatings: number[] = [];
    const allAwayDefenseRatings: number[] = [];
    const allFormFactors: number[] = [];
    
    teamStrengths.forEach((strength) => {
      // Home attack ratings (when opponent plays at home)
      const homeAttack = (ALPHA * strength.xGPer90Home) + ((1 - ALPHA) * strength.gfPer90Home);
      allHomeAttackRatings.push(homeAttack);
      
      // Away attack ratings (when opponent plays away)
      const awayAttack = (ALPHA * strength.xGPer90Away) + ((1 - ALPHA) * strength.gfPer90Away);
      allAwayAttackRatings.push(awayAttack);
      
      // Home defense ratings (when opponent plays at home)
      const homeDefense = (BETA * strength.xGAPer90Home) + ((1 - BETA) * strength.gaPer90Home);
      allHomeDefenseRatings.push(homeDefense);
      
      // Away defense ratings (when opponent plays away)
      const awayDefense = (BETA * strength.xGAPer90Away) + ((1 - BETA) * strength.gaPer90Away);
      allAwayDefenseRatings.push(awayDefense);
      
      allFormFactors.push(strength.formFactor);
    });
    
    const minHomeAttack = Math.min(...allHomeAttackRatings);
    const maxHomeAttack = Math.max(...allHomeAttackRatings);
    const minAwayAttack = Math.min(...allAwayAttackRatings);
    const maxAwayAttack = Math.max(...allAwayAttackRatings);
    const minHomeDefense = Math.min(...allHomeDefenseRatings);
    const maxHomeDefense = Math.max(...allHomeDefenseRatings);
    const minAwayDefense = Math.min(...allAwayDefenseRatings);
    const maxAwayDefense = Math.max(...allAwayDefenseRatings);
    const minForm = Math.min(...allFormFactors);
    const maxForm = Math.max(...allFormFactors);

    console.log(`📊 Combined rating ranges - Attack (H): ${minHomeAttack.toFixed(2)}-${maxHomeAttack.toFixed(2)}, Defense (H): ${minHomeDefense.toFixed(2)}-${maxHomeDefense.toFixed(2)}`);

    const difficulties: FixtureDifficulty[] = [];

    for (const fixture of upcomingFixtures) {
      const opponentStrength = teamStrengths.get(fixture.opponentTeamId);
      if (!opponentStrength) {
        console.warn(`No strength data for team ${fixture.opponentTeamId}`);
        continue;
      }

      const opponentTeam = teams.find((t: any) => t.id === fixture.opponentTeamId);
      if (!opponentTeam) continue;

      // Get opponent stats based on venue
      // If we're home, opponent is away (use their away stats)
      // If we're away, opponent is home (use their home stats)
      const opponentXG = fixture.isHome 
        ? opponentStrength.xGPer90Away
        : opponentStrength.xGPer90Home;
      const opponentXGA = fixture.isHome
        ? opponentStrength.xGAPer90Away
        : opponentStrength.xGAPer90Home;
      const opponentGF = fixture.isHome
        ? opponentStrength.gfPer90Away
        : opponentStrength.gfPer90Home;
      const opponentGA = fixture.isHome
        ? opponentStrength.gaPer90Away
        : opponentStrength.gaPer90Home;
      
      // Calculate combined ratings for this opponent
      const opponentAttackRating = (ALPHA * opponentXG) + ((1 - ALPHA) * opponentGF);
      const opponentDefenseRating = (BETA * opponentXGA) + ((1 - BETA) * opponentGA);
      
      // Scale combined ratings to 0-100
      const minAttack = fixture.isHome ? minAwayAttack : minHomeAttack;
      const maxAttack = fixture.isHome ? maxAwayAttack : maxHomeAttack;
      const minDefense = fixture.isHome ? minAwayDefense : minHomeDefense;
      const maxDefense = fixture.isHome ? maxAwayDefense : maxHomeDefense;
      
      const attackRatingScaled = this.scaleTo100(opponentAttackRating, minAttack, maxAttack);
      const defenseRatingScaled = this.scaleTo100Inverted(opponentDefenseRating, minDefense, maxDefense);
      
      // 3. Home/Away Factor (team-specific bonus)
      // If we're home, we get our home bonus; if away, opponent gets their home bonus
      const homeAwayBonus = fixture.isHome 
        ? opponentStrength.homeDefenseBonus  // Opponent's home defense bonus (negative = easier for us)
        : -opponentStrength.homeAttackBonus;  // Opponent's home attack bonus (negative = easier for us)
      
      // Scale to 0-100 (centered at 50, range roughly -1 to +1 becomes 0-100)
      const homeAwayFactorScaled = Math.max(0, Math.min(100, 50 + (homeAwayBonus * 20)));
      
      // 4. Form Factor (rolling xG difference, normalized)
      const formFactorScaled = this.scaleTo100(opponentStrength.formFactor, minForm, maxForm);
      
      // 5. Final FDR calculation
      // Attack Difficulty = how hard for YOUR attackers = primarily based on OPPONENT's defense
      // Use higher weight for opponent's defense, lower for context
      const attackDifficultyRaw = 
        (defenseRatingScaled * 0.70) +      // Opponent's defense rating (primary - 70%)
        (attackRatingScaled * 0.20) +      // Opponent's attack rating (context - 20%)
        (homeAwayFactorScaled * 0.05) +    // Home/away factor (5%)
        (formFactorScaled * 0.05);         // Form factor (5%)

      // Defense Difficulty = how hard for YOUR defenders = primarily based on OPPONENT's attack
      // Use higher weight for opponent's attack, lower for context
      const defenseDifficultyRaw =
        (attackRatingScaled * 0.70) +      // Opponent's attack rating (primary - 70%)
        (defenseRatingScaled * 0.20) +     // Opponent's defense rating (context - 20%)
        (homeAwayFactorScaled * 0.05) +    // Home/away factor (5%)
        (formFactorScaled * 0.05);         // Form factor (5%)

      // Convert to 1-5 scale
      const attackDifficulty = this.scaleToDifficulty(attackDifficultyRaw);
      const defenseDifficulty = this.scaleToDifficulty(defenseDifficultyRaw);

      difficulties.push({
        gameweek: fixture.gameweek,
        opponentTeamId: fixture.opponentTeamId,
        opponentTeamName: opponentTeam.name,
        isHome: fixture.isHome,
        attackDifficulty,
        defenseDifficulty,
        attackDifficultyRaw,
        defenseDifficultyRaw,
      });
    }

    return difficulties;
  }

  /**
   * Get upcoming fixtures for a team
   */
  async getTeamUpcomingFixtures(teamId: number, count: number = 10): Promise<FixtureDifficulty[]> {
    try {
      // Cache fixtures data to avoid repeated API calls
      if (!this.fixturesCache) {
        const fixturesUrl = `${BACKEND_API_BASE}/api/fixtures/`;
        const fixturesResponse = await axios.get<any[]>(fixturesUrl);
        this.fixturesCache = fixturesResponse.data || [];
      }
      const allFixtures = this.fixturesCache;

      // Filter fixtures for this team (either home or away)
      const teamFixtures = allFixtures
        .filter((f: any) => 
          !f.finished && 
          (f.team_h === teamId || f.team_a === teamId)
        )
        .sort((a: any, b: any) => a.event - b.event) // Sort by gameweek
        .slice(0, count)
        .map((f: any) => ({
          gameweek: f.event,
          opponentTeamId: f.team_h === teamId ? f.team_a : f.team_h,
          isHome: f.team_h === teamId,
        }));

      return await this.calculateFixtureDifficulty(teamId, teamFixtures);
    } catch (error) {
      console.error(`Failed to get upcoming fixtures for team ${teamId}:`, error);
      return [];
    }
  }

  /**
   * Get upcoming fixtures for a player (kept for backward compatibility)
   */
  async getPlayerUpcomingFixtures(playerId: number, count: number = 5): Promise<FixtureDifficulty[]> {
    try {
      const summaryUrl = `${BACKEND_API_BASE}/api/element-summary/${playerId}/`;
      const response = await axios.get<any>(summaryUrl);
      const fixtures = response.data.fixtures || [];

      // Get player to find their team
      const players = await dataService.getPlayers();
      const player = players.find(p => p.id === playerId);
      if (!player) return [];

      const bootstrapUrl = `${BACKEND_API_BASE}/api/bootstrap-static/`;
      const bootstrapResponse = await axios.get<any>(bootstrapUrl);
      const teams = bootstrapResponse.data.teams;
      const playerTeam = teams.find((t: any) => t.name === player.team);
      if (!playerTeam) return [];

      // Convert fixtures to our format
      const upcomingFixtures = fixtures
        .filter((f: any) => !f.finished)
        .slice(0, count)
        .map((f: any) => ({
          gameweek: f.event,
          opponentTeamId: f.team_h === playerTeam.id ? f.team_a : f.team_h,
          isHome: f.is_home !== undefined ? f.is_home : f.team_h === playerTeam.id,
        }));

      return await this.calculateFixtureDifficulty(playerTeam.id, upcomingFixtures);
    } catch (error) {
      console.error(`Failed to get upcoming fixtures for player ${playerId}:`, error);
      return [];
    }
  }
}

export const fixtureDifficultyService = new FixtureDifficultyService();
