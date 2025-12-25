import axios from 'axios';
import type { 
  Player, 
  Team, 
  Gameweek, 
  PlayerStats,
  Fixture,
  FPLBootstrapResponse,
  FPLPlayer,
  FPLTeam,
  FPLPlayerSummary,
  FPLPlayerHistory
} from '../types/fpl';

// Backend API base URL (Python Flask server)
// Change this if your backend runs on a different port
const BACKEND_API_BASE = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:5000';
const BOOTSTRAP_STATIC_URL = `${BACKEND_API_BASE}/api/bootstrap-static/`;

class DataService {
  private bootstrapData: FPLBootstrapResponse | null = null;
  private positionMap: Map<number, string> = new Map();
  private teamMap: Map<number, FPLTeam> = new Map();

  // Fetch and cache bootstrap data (contains players, teams, events, positions)
  private async getBootstrapData(): Promise<FPLBootstrapResponse> {
    if (this.bootstrapData) {
      return this.bootstrapData;
    }

    try {
      console.log(`🔄 Fetching data from ${BOOTSTRAP_STATIC_URL}`);
      
      // Try using fetch first as it sometimes handles CORS better
      try {
        const fetchResponse = await fetch(BOOTSTRAP_STATIC_URL, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!fetchResponse.ok) {
          throw new Error(`HTTP error! status: ${fetchResponse.status}`);
        }

        const data = await fetchResponse.json() as FPLBootstrapResponse;
        
        if (!data || !data.elements) {
          throw new Error('Invalid response from FPL API - missing elements array');
        }

        this.bootstrapData = data;
        console.log(`✅ Loaded ${data.elements.length} players, ${data.teams.length} teams using fetch`);
        
        // Build position map (element_type id -> position name)
        data.element_types.forEach(pos => {
          this.positionMap.set(pos.id, pos.singular_name_short);
        });

        // Build team map
        data.teams.forEach(team => {
          this.teamMap.set(team.id, team);
        });

        return this.bootstrapData;
      } catch (fetchError) {
        // Fallback to axios if fetch fails
        console.log('⚠️ Fetch failed, trying axios...', fetchError);
        const response = await axios.get<FPLBootstrapResponse>(
          BOOTSTRAP_STATIC_URL,
          {
            headers: {
              'Accept': 'application/json',
            },
            timeout: 15000, // 15 second timeout
          }
        );
        
        if (!response.data || !response.data.elements) {
          throw new Error('Invalid response from FPL API - missing elements array');
        }

        this.bootstrapData = response.data;
        console.log(`✅ Loaded ${response.data.elements.length} players, ${response.data.teams.length} teams using axios`);
        
        // Build position map (element_type id -> position name)
        response.data.element_types.forEach(pos => {
          this.positionMap.set(pos.id, pos.singular_name_short);
        });

        // Build team map
        response.data.teams.forEach(team => {
          this.teamMap.set(team.id, team);
        });

        return this.bootstrapData;
      }
    } catch (error) {
      console.error('❌ Error fetching bootstrap data from FPL API:', error);
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
        });
        if (error.code === 'ERR_NETWORK' || error.code === 'ERR_CORS') {
          console.error('⚠️ CORS or Network error. The FPL API should allow CORS, but if you see this, there may be a network issue.');
        }
      } else if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });
      }
      throw error;
    }
  }

  // Convert FPL API player format to our internal Player format
  private mapFPLPlayerToPlayer(fplPlayer: FPLPlayer): Player {
    const team = this.teamMap.get(fplPlayer.team);
    const position = this.positionMap.get(fplPlayer.element_type) || 'UNK';
    
    // Parse string values to numbers
    const form = parseFloat(fplPlayer.form) || 0;
    const selectedBy = parseFloat(fplPlayer.selected_by_percent) || 0;
    //const _valueForm = parseFloat(fplPlayer.value_form) || 0;
    const pointsPerGame = parseFloat(fplPlayer.points_per_game) || 0;
    const ictIndex = parseFloat(fplPlayer.ict_index) || 0;
    const influence = parseFloat(fplPlayer.influence) || 0;
    const creativity = parseFloat(fplPlayer.creativity) || 0;
    const threat = parseFloat(fplPlayer.threat) || 0;
    const expectedGoals = fplPlayer.expected_goals ? parseFloat(fplPlayer.expected_goals) || 0 : undefined;
    const expectedAssists = fplPlayer.expected_assists ? parseFloat(fplPlayer.expected_assists) || 0 : undefined;
    const expectedGoalInvolvements = fplPlayer.expected_goal_involvements
      ? parseFloat(fplPlayer.expected_goal_involvements) || 0
      : undefined;
    const expectedGoalsConceded = fplPlayer.expected_goals_conceded
      ? parseFloat(fplPlayer.expected_goals_conceded) || 0
      : undefined;

    // Price is in tenths (e.g., 100 = £10.0m)
    const price = fplPlayer.now_cost / 10;

    // Calculate value (points per million)
    const value = price > 0 ? fplPlayer.total_points / price : 0;

    // Per 90 metrics (if minutes available)
    const minutes = fplPlayer.minutes;
    const denominator = minutes && minutes > 0 ? minutes / 90 : 0;
    const xGPer90 = denominator && expectedGoals !== undefined ? expectedGoals / denominator : undefined;
    const xAPer90 = denominator && expectedAssists !== undefined ? expectedAssists / denominator : undefined;
    const xGIPer90 =
      denominator && expectedGoalInvolvements !== undefined ? expectedGoalInvolvements / denominator : undefined;

    return {
      id: fplPlayer.id,
      name: `${fplPlayer.first_name} ${fplPlayer.second_name}`.trim(),
      webName: fplPlayer.web_name,
      team: team?.name || 'Unknown',
      teamId: fplPlayer.team,
      position,
      price,
      totalPoints: fplPlayer.total_points,
      goals: fplPlayer.goals_scored,
      assists: fplPlayer.assists,
      cleanSheets: fplPlayer.clean_sheets,
      yellowCards: fplPlayer.yellow_cards,
      redCards: fplPlayer.red_cards,
      saves: fplPlayer.saves || 0,
      bonusPoints: fplPlayer.bonus,
      form,
      selectedBy,
      transfersIn: fplPlayer.transfers_in,
      transfersOut: fplPlayer.transfers_out,
      value,
      photo: fplPlayer.photo,
      pointsPerGame,
      ictIndex,
      influence,
      creativity,
      threat,
      expectedGoals,
      expectedAssists,
      expectedGoalInvolvements,
      expectedGoalsConceded,
      minutes,
      xGPer90,
      xAPer90,
      xGIPer90,
      // Placeholder for xP model - simple calculation for now
      // TODO: Replace with proper expected points model in Phase 3
      expectedPoints: expectedGoalInvolvements 
        ? Math.round((expectedGoalInvolvements * 4) + (fplPlayer.clean_sheets * 4) + (fplPlayer.bonus * 1))
        : undefined,
    };
  }

  async getPlayers(): Promise<Player[]> {
    try {
      const bootstrap = await this.getBootstrapData();
      const players = bootstrap.elements.map(player => this.mapFPLPlayerToPlayer(player));
      console.log(`✅ Successfully loaded ${players.length} players from FPL API`);
      return players;
    } catch (error) {
      console.error('❌ Error fetching players from FPL API:', error);
      
      // Log detailed error information
      if (axios.isAxiosError(error)) {
        console.error('Axios Error Details:', {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
        });
      } else if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      // Re-throw with more context
      const errorMessage = axios.isAxiosError(error)
        ? `API Error: ${error.message} (${error.code || 'unknown'})`
        : error instanceof Error
        ? error.message
        : 'Unknown error occurred';
      
      throw new Error(`Failed to fetch players from FPL API: ${errorMessage}. Check browser console for full details.`);
    }
  }

  async getPlayerStats(playerId: number): Promise<PlayerStats> {
    try {
      // First get the player from bootstrap data
      const bootstrap = await this.getBootstrapData();
      const fplPlayer = bootstrap.elements.find(p => p.id === playerId);
      
      if (!fplPlayer) {
        throw new Error(`Player with id ${playerId} not found`);
      }

      // Fetch player summary for gameweek-by-gameweek stats
      const summaryUrl = `${BACKEND_API_BASE}/api/element-summary/${playerId}/`;
      const summaryResponse = await axios.get<FPLPlayerSummary>(summaryUrl);

      const player = this.mapFPLPlayerToPlayer(fplPlayer);
      
      // Map history to gameweek stats
      const gameweeks = summaryResponse.data.history
        .sort((a, b) => a.round - b.round)
        .map((history: FPLPlayerHistory) => ({
          gameweek: history.round,
          points: history.total_points,
          goals: history.goals_scored,
          assists: history.assists,
          expectedGoals: history.expected_goals ? parseFloat(history.expected_goals) || 0 : undefined,
          expectedAssists: history.expected_assists ? parseFloat(history.expected_assists) || 0 : undefined,
          expectedGoalInvolvements: history.expected_goal_involvements
            ? parseFloat(history.expected_goal_involvements) || 0
            : undefined,
        }));

      return {
        player,
        gameweeks,
      };
    } catch (error) {
      console.error(`Error fetching player stats for ${playerId}:`, error);
      // Return mock data as fallback
      const players = await this.getPlayers();
      const player = players.find(p => p.id === playerId) || players[0];
      return {
        player,
        gameweeks: Array.from({ length: 20 }, (_, i) => ({
          gameweek: i + 1,
          points: Math.floor(Math.random() * 15 + 2),
          goals: Math.floor(Math.random() * 3),
          assists: Math.floor(Math.random() * 2),
        })),
      };
    }
  }

  async getTeams(): Promise<Team[]> {
    try {
      const bootstrap = await this.getBootstrapData();
      return bootstrap.teams.map(team => ({
        id: team.id,
        name: team.name,
        shortName: team.short_name,
        strength: team.strength,
        players: [],
      }));
    } catch (error) {
      console.error('Error fetching teams:', error);
      throw error;
    }
  }

  async getGameweeks(): Promise<Gameweek[]> {
    try {
      const bootstrap = await this.getBootstrapData();
      return bootstrap.events
        .filter(event => event.finished)
        .map(event => ({
          number: event.id,
          averageScore: event.average_entry_score,
          highestScore: event.highest_score,
          deadline: event.deadline_time,
        }));
    } catch (error) {
      console.error('Error fetching gameweeks:', error);
      return [];
    }
  }

  async getFixtures(): Promise<Fixture[]> {
    try {
      const response = await axios.get<Fixture[]>(
        `${BACKEND_API_BASE}/api/fixtures/`,
        { timeout: 15000 }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching fixtures:', error);
      return [];
    }
  }

  getCurrentGameweek(): number {
    if (!this.bootstrapData) return 1;
    const current = this.bootstrapData.events.find(e => e.id && !e.finished);
    return current?.id || this.bootstrapData.events.filter(e => e.finished).length + 1;
  }

  // Mock data generators for development
  /*private getMockPlayers(): Player[] {
    const positions = ['GK', 'DEF', 'MID', 'FWD'];
    const teams = [
      'Arsenal', 'Aston Villa', 'Bournemouth', 'Brentford', 'Brighton',
      'Chelsea', 'Crystal Palace', 'Everton', 'Fulham', 'Liverpool',
      'Luton', 'Man City', 'Man Utd', 'Newcastle', 'Nott\'m Forest',
      'Sheffield Utd', 'Spurs', 'West Ham', 'Wolves'
    ];
    
    const names = [
      'Erling Haaland', 'Mohamed Salah', 'Bukayo Saka', 'Son Heung-min',
      'Kevin De Bruyne', 'Bruno Fernandes', 'Marcus Rashford', 'Harry Kane',
      'Phil Foden', 'Jarrod Bowen', 'Ollie Watkins', 'Alexander Isak',
      'Cole Palmer', 'Dominic Solanke', 'Richarlison', 'Darwin Núñez',
      'Eberechi Eze', 'Anthony Gordon', 'Pedro Neto', 'Bryan Mbeumo'
    ];

    return names.map((name, index) => ({
      id: index + 1,
      name,
      team: teams[index % teams.length],
      teamId: (index % teams.length) + 1,
      position: positions[Math.floor(Math.random() * positions.length)],
      price: Math.round((Math.random() * 10 + 4) * 10) / 10,
      totalPoints: Math.floor(Math.random() * 200 + 50),
      goals: Math.floor(Math.random() * 20),
      assists: Math.floor(Math.random() * 15),
      cleanSheets: Math.floor(Math.random() * 15),
      yellowCards: Math.floor(Math.random() * 5),
      redCards: Math.floor(Math.random() * 2),
      saves: Math.floor(Math.random() * 100),
      bonusPoints: Math.floor(Math.random() * 30),
      form: Math.round((Math.random() * 10) * 10) / 10,
      selectedBy: Math.round((Math.random() * 50 + 5) * 10) / 10,
      transfersIn: Math.floor(Math.random() * 500000),
      transfersOut: Math.floor(Math.random() * 300000),
      value: Math.round((Math.random() * 50 + 10) * 10) / 10,
    }));
  }*/

  /*private getMockPlayerStats(): PlayerStats {
    return {
      player: this.getMockPlayers()[0],
      gameweeks: Array.from({ length: 20 }, (_, i) => ({
        gameweek: i + 1,
        points: Math.floor(Math.random() * 15 + 2),
        goals: Math.floor(Math.random() * 3),
        assists: Math.floor(Math.random() * 2),
      })),
    };
  }*/

  /*private getMockTeams(): Team[] {
    const teamNames = [
      'Arsenal', 'Aston Villa', 'Bournemouth', 'Brentford', 'Brighton',
      'Chelsea', 'Crystal Palace', 'Everton', 'Fulham', 'Liverpool',
      'Luton', 'Man City', 'Man Utd', 'Newcastle', 'Nott\'m Forest',
      'Sheffield Utd', 'Spurs', 'West Ham', 'Wolves'
    ];

    return teamNames.map((name, index) => ({
      id: index + 1,
      name,
      shortName: name.split(' ')[0].substring(0, 3).toUpperCase(),
      strength: Math.floor(Math.random() * 5 + 1),
      players: [],
    }));
  }*/
}

export const dataService = new DataService();

