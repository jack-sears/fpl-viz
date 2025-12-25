import axios from 'axios';
import { dataService } from './dataService';
import type { Player, Team } from '../types/fpl';

const BACKEND_API_BASE = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:5000';

// FPL API response types
interface FPLEntryResponse {
  id: number;
  player_first_name: string;
  player_last_name: string;
  name: string;  // Team name
  summary_overall_points: number;
  summary_overall_rank: number;
  summary_event_points: number;
  summary_event_rank: number;
  current_event: number;
  started_event: number;
  favourite_team: number;
  leagues: {
    classic: Array<{
      id: number;
      name: string;
      entry_rank: number;
    }>;
  };
}

interface FPLPicksResponse {
  active_chip: string | null;
  automatic_subs: Array<{
    element_in: number;
    element_out: number;
  }>;
  entry_history: {
    event: number;
    points: number;
    total_points: number;
    rank: number;
    overall_rank: number;
    bank: number;
    value: number;
    event_transfers: number;
    event_transfers_cost: number;
    points_on_bench: number;
  };
  picks: Array<{
    element: number;
    position: number;
    multiplier: number;
    is_captain: boolean;
    is_vice_captain: boolean;
  }>;
}

interface FPLHistoryResponse {
  current: Array<{
    event: number;
    points: number;
    total_points: number;
    rank: number;
    overall_rank: number;
    bank: number;
    value: number;
    event_transfers: number;
    event_transfers_cost: number;
  }>;
  past: Array<{
    season_name: string;
    total_points: number;
    rank: number;
  }>;
  chips: Array<{
    name: string;
    time: string;
    event: number;
  }>;
}

// Our app's team types
export interface MyTeamInfo {
  id: number;
  managerName: string;
  teamName: string;
  totalPoints: number;
  overallRank: number;
  gameweekPoints: number;
  gameweekRank: number;
  currentGameweek: number;
  bank: number;
  teamValue: number;
  transfersAvailable: number;
}

export interface MyTeamPick {
  player: Player;
  position: number;  // 1-15 (1-11 starters, 12-15 bench)
  isCaptain: boolean;
  isViceCaptain: boolean;
  multiplier: number;
  isStarter: boolean;
  nextFixtures: Array<{
    opponent: string;
    opponentShort: string;
    isHome: boolean;
    gameweek: number;
    difficulty: number;
  }>;
}

export interface MyTeam {
  info: MyTeamInfo;
  picks: MyTeamPick[];
  starters: MyTeamPick[];
  bench: MyTeamPick[];
}

class MyTeamService {
  private cachedTeamId: number | null = null;
  private cachedTeam: MyTeam | null = null;
  private allPlayers: Player[] = [];

  async getTeam(teamId: number): Promise<MyTeam> {
    console.log(`🔄 Fetching team ${teamId}...`);

    try {
      // Fetch all required data in parallel
      const [entryRes, bootstrap, fixtures, historyRes] = await Promise.all([
        axios.get<FPLEntryResponse>(`${BACKEND_API_BASE}/api/entry/${teamId}/`),
        dataService.getPlayers(),
        dataService.getFixtures(),
        axios.get<FPLHistoryResponse>(`${BACKEND_API_BASE}/api/entry/${teamId}/history/`).catch(() => null),
      ]);

      const entry = entryRes.data;
      const currentGW = entry.current_event || 1;

      // Get team picks for current gameweek
      const picksRes = await axios.get<FPLPicksResponse>(
        `${BACKEND_API_BASE}/api/entry/${teamId}/event/${currentGW}/picks/`
      );
      const picksData = picksRes.data;

      // Get teams for fixture display
      const teams = await dataService.getTeams();
      const teamMap = new Map<number, Team>(teams.map(t => [t.id, t]));
      const playerMap = new Map<number, Player>(bootstrap.map(p => [p.id, p]));
      
      // Store all players for transfer suggestions
      this.allPlayers = bootstrap;

      // Calculate free transfers
      // If we made 0 transfers last GW and had 1 FT, we now have 2 (max)
      // If we made transfers, we're back to 1
      let freeTransfers = 1;
      if (historyRes?.data?.current && historyRes.data.current.length >= 2) {
        const lastGW = historyRes.data.current[historyRes.data.current.length - 1];
        const prevGW = historyRes.data.current[historyRes.data.current.length - 2];
        
        // If no transfers made last week and didn't take a hit
        if (lastGW.event_transfers === 0 && lastGW.event_transfers_cost === 0) {
          freeTransfers = 2; // Banked a transfer
        }
      }

      // Build team info
      const info: MyTeamInfo = {
        id: entry.id,
        managerName: `${entry.player_first_name} ${entry.player_last_name}`,
        teamName: entry.name,
        totalPoints: entry.summary_overall_points,
        overallRank: entry.summary_overall_rank,
        gameweekPoints: picksData.entry_history.points,
        gameweekRank: picksData.entry_history.rank,
        currentGameweek: currentGW,
        bank: picksData.entry_history.bank / 10, // Convert to millions
        teamValue: picksData.entry_history.value / 10, // Convert to millions
        transfersAvailable: freeTransfers,
      };

      // Get upcoming fixtures for each player's team
      const getNextFixtures = (playerTeamId: number, numFixtures: number = 3) => {
        const upcoming = fixtures
          .filter(f => !f.finished && (f.team_h === playerTeamId || f.team_a === playerTeamId))
          .sort((a, b) => (a.event || 99) - (b.event || 99))
          .slice(0, numFixtures);

        return upcoming.map(f => {
          const isHome = f.team_h === playerTeamId;
          const opponentId = isHome ? f.team_a : f.team_h;
          const opponent = teamMap.get(opponentId);
          
          return {
            opponent: opponent?.name || 'TBD',
            opponentShort: opponent?.shortName || (opponent?.name?.slice(0, 3).toUpperCase()) || 'TBD',
            isHome,
            gameweek: f.event || 0,
            difficulty: isHome ? f.team_h_difficulty : f.team_a_difficulty,
          };
        });
      };

      // Build picks array
      const picks: MyTeamPick[] = picksData.picks.map(pick => {
        const player = playerMap.get(pick.element);
        
        if (!player) {
          // Fallback for missing player
          return {
            player: {
              id: pick.element,
              name: `Unknown (${pick.element})`,
              webName: `Unknown`,
              team: 'Unknown',
              teamId: 0,
              position: 'UNK',
              price: 0,
              form: 0,
              totalPoints: 0,
              minutes: 0,
              goals: 0,
              assists: 0,
              cleanSheets: 0,
              selectedBy: 0,
            } as Player,
            position: pick.position,
            isCaptain: pick.is_captain,
            isViceCaptain: pick.is_vice_captain,
            multiplier: pick.multiplier,
            isStarter: pick.position <= 11,
            nextFixtures: [],
          };
        }

        return {
          player,
          position: pick.position,
          isCaptain: pick.is_captain,
          isViceCaptain: pick.is_vice_captain,
          multiplier: pick.multiplier,
          isStarter: pick.position <= 11,
          nextFixtures: getNextFixtures(player.teamId, 5),
        };
      });

      // Sort picks by position
      picks.sort((a, b) => a.position - b.position);

      const team: MyTeam = {
        info,
        picks,
        starters: picks.filter(p => p.isStarter),
        bench: picks.filter(p => !p.isStarter),
      };

      // Cache the result
      this.cachedTeamId = teamId;
      this.cachedTeam = team;

      console.log(`✅ Loaded team: ${info.teamName}`);
      return team;

    } catch (error: any) {
      console.error('Failed to fetch team:', error);
      
      if (error.response?.status === 404) {
        throw new Error('Team not found. Please check your Team ID.');
      }
      
      throw new Error('Failed to load team data. Please try again.');
    }
  }

  getCachedTeam(): MyTeam | null {
    return this.cachedTeam;
  }

  clearCache(): void {
    this.cachedTeamId = null;
    this.cachedTeam = null;
  }

  // Get all players for transfer suggestions
  async getAllPlayers(): Promise<Player[]> {
    if (this.allPlayers.length > 0) {
      return this.allPlayers;
    }
    this.allPlayers = await dataService.getPlayers();
    return this.allPlayers;
  }

  // Get transfer suggestions for a position within budget
  async getTransferSuggestions(
    position: string,
    maxPrice: number,
    currentTeamPlayerIds: number[],
    limit: number = 20
  ): Promise<Player[]> {
    const allPlayers = await this.getAllPlayers();
    
    return allPlayers
      .filter(p => 
        p.position === position && 
        p.price <= maxPrice &&
        !currentTeamPlayerIds.includes(p.id)
      )
      .sort((a, b) => {
        // Sort by form first, then by total points
        const formDiff = b.form - a.form;
        if (Math.abs(formDiff) > 0.5) return formDiff;
        return b.totalPoints - a.totalPoints;
      })
      .slice(0, limit);
  }

  // Get upcoming fixtures for a player's team
  async getPlayerFixtures(playerTeamId: number, numFixtures: number = 3): Promise<Array<{
    opponent: string;
    opponentShort: string;
    isHome: boolean;
    gameweek: number;
    difficulty: number;
  }>> {
    try {
      const [fixtures, teams] = await Promise.all([
        dataService.getFixtures(),
        dataService.getTeams(),
      ]);
      
      const teamMap = new Map<number, Team>(teams.map(t => [t.id, t]));
      
      const upcoming = fixtures
        .filter(f => !f.finished && (f.team_h === playerTeamId || f.team_a === playerTeamId))
        .sort((a, b) => (a.event || 99) - (b.event || 99))
        .slice(0, numFixtures);

      return upcoming.map(f => {
        const isHome = f.team_h === playerTeamId;
        const opponentId = isHome ? f.team_a : f.team_h;
        const opponent = teamMap.get(opponentId);
        
        return {
          opponent: opponent?.name || 'TBD',
          opponentShort: opponent?.shortName || (opponent?.name?.slice(0, 3).toUpperCase()) || 'TBD',
          isHome,
          gameweek: f.event || 0,
          difficulty: isHome ? f.team_h_difficulty : f.team_a_difficulty,
        };
      });
    } catch (error) {
      console.error('Failed to get player fixtures:', error);
      return [];
    }
  }
}

export const myTeamService = new MyTeamService();

