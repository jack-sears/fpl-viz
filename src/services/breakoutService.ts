import axios from 'axios';
import type { Player } from '../types/fpl';
import { dataService } from './dataService';

const BACKEND_API_BASE = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:5000';
const BOOTSTRAP_STATIC_URL = '/fpl-viz/data/breakout_players.json';

export interface XGIGameweek {
  gameweek: number;
  xGI: number;
  minutes: number;
  clean_sheet?: number;
}

export interface BreakoutPlayer {
  player: Player;
  xgiHistory: XGIGameweek[];
  recentXGI: number;           // Last N gameweeks average xGI/90
  seasonXGI: number;           // Season average xGI/90
  trendRatio: number;          // (recent - season) / season (positive = trending up)
  breakoutScore: number;       // Composite score balancing trend AND absolute level
  consistency: number;         // Standard deviation (lower = more consistent)
  recentMinutes: number;       // Minutes in recent games
  totalMinutes: number;        // Total season minutes
  // Clean Sheet fields for defenders
  csPotentialSeason: number;   // Season CS rate
  csPotentialRecent: number;   // Recent CS rate
  csTrendRatio: number;        // CS trend
  fixtureCsPotential: number;  // Based on upcoming fixtures
}

// Cache for pre-calculated breakout data
interface CachedBreakoutPlayer {
  player_id: number;
  name: string;
  web_name: string;
  team: string;
  team_id: number;
  position: string;
  recent_xgi_per90: number;
  season_xgi_per90: number;
  trend_ratio: number;
  breakout_score: number;
  consistency: number;
  recent_minutes: number;
  total_minutes: number;
  xgi_history: XGIGameweek[];
  // CS fields
  cs_potential_season: number;
  cs_potential_recent: number;
  cs_trend_ratio: number;
  fixture_cs_potential: number;
}

class BreakoutService {
  private cachedPlayers: BreakoutPlayer[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get pre-calculated breakout players from backend cache
   */
  async getBreakoutPlayers(
    options: {
      positions?: string[];
      minPrice?: number;
      maxPrice?: number;
      minOwnership?: number;
      maxOwnership?: number;
      limit?: number;
    } = {}
  ): Promise<BreakoutPlayer[]> {
    const { 
      positions, 
      minPrice = 0, 
      maxPrice = 20, 
      minOwnership = 0,
      maxOwnership = 100,
      limit = 50 
    } = options;

    // Check if we have valid cached data
    const now = Date.now();
    if (this.cachedPlayers && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      console.log('⚡ Using cached breakout data');
      return this.filterPlayers(this.cachedPlayers, { positions, minPrice, maxPrice, minOwnership, maxOwnership, limit });
    }

    console.log('🔄 Fetching pre-calculated breakout data from backend...');

    try {
      const response = await axios.get<CachedBreakoutPlayer[]>(
        BOOTSTRAP_STATIC_URL,
        { timeout: 10000 }
      );

      const allPlayers = await dataService.getPlayers();
      const playerMap = new Map(allPlayers.map(p => [p.id, p]));

      const breakoutPlayers: BreakoutPlayer[] = response.data
        .map((cached): BreakoutPlayer | null => {
          const player = playerMap.get(cached.player_id);
          if (!player) return null;

          return {
            player,
            xgiHistory: cached.xgi_history || [],
            recentXGI: cached.recent_xgi_per90,
            seasonXGI: cached.season_xgi_per90,
            trendRatio: cached.trend_ratio,
            breakoutScore: cached.breakout_score,
            consistency: cached.consistency || 0,
            recentMinutes: cached.recent_minutes,
            totalMinutes: cached.total_minutes,
            csPotentialSeason: cached.cs_potential_season || 0,
            csPotentialRecent: cached.cs_potential_recent || 0,
            csTrendRatio: cached.cs_trend_ratio || 0,
            fixtureCsPotential: cached.fixture_cs_potential || 0,
          };
        })
        .filter((p): p is BreakoutPlayer => p !== null);

      this.cachedPlayers = breakoutPlayers;
      this.cacheTimestamp = now;

      console.log(`✅ Loaded ${breakoutPlayers.length} breakout players from cache`);

      return this.filterPlayers(breakoutPlayers, { positions, minPrice, maxPrice, minOwnership, maxOwnership, limit });

    } catch (error) {
      console.error('Failed to fetch breakout data from backend:', error);
      return [];
    }
  }

  private filterPlayers(
    players: BreakoutPlayer[],
    options: {
      positions?: string[];
      minPrice?: number;
      maxPrice?: number;
      minOwnership?: number;
      maxOwnership?: number;
      limit?: number;
    }
  ): BreakoutPlayer[] {
    const { positions, minPrice = 0, maxPrice = 20, minOwnership = 0, maxOwnership = 100, limit = 50 } = options;

    let filtered = players.filter(bp => {
      const p = bp.player;
      if (p.price < minPrice || p.price > maxPrice) return false;
      if (p.selectedBy < minOwnership || p.selectedBy > maxOwnership) return false;
      if (positions && positions.length > 0 && !positions.includes(p.position)) return false;
      return true;
    });

    filtered.sort((a, b) => b.breakoutScore - a.breakoutScore);

    return filtered.slice(0, limit);
  }

  clearCache(): void {
    this.cachedPlayers = null;
    this.cacheTimestamp = 0;
  }
}

export const breakoutService = new BreakoutService();
