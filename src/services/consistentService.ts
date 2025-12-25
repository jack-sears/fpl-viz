import axios from 'axios';
import type { Player } from '../types/fpl';
import { dataService } from './dataService';
import type { XGIGameweek } from './breakoutService';

const BACKEND_API_BASE = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:5000';

export interface ConsistentPlayer {
  player: Player;
  xgiHistory: XGIGameweek[];
  seasonXGI: number;
  consistency: number;        // Lower = more consistent
  consistencyScore: number;   // Higher = better (consistent + productive)
  totalMinutes: number;
}

interface CachedConsistentPlayer {
  player_id: number;
  name: string;
  web_name: string;
  team: string;
  team_id: number;
  position: string;
  season_xgi_per90: number;
  consistency: number;
  consistency_score: number;
  total_minutes: number;
  xgi_history: XGIGameweek[];
}

class ConsistentService {
  private cachedPlayers: ConsistentPlayer[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000;

  async getConsistentPlayers(
    options: {
      positions?: string[];
      minPrice?: number;
      maxPrice?: number;
      limit?: number;
    } = {}
  ): Promise<ConsistentPlayer[]> {
    const { positions, minPrice = 0, maxPrice = 20, limit = 50 } = options;

    const now = Date.now();
    if (this.cachedPlayers && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      console.log('⚡ Using cached consistent data');
      return this.filterPlayers(this.cachedPlayers, { positions, minPrice, maxPrice, limit });
    }

    console.log('🔄 Fetching consistent players from backend...');

    try {
      const response = await axios.get<CachedConsistentPlayer[]>(
        `${BACKEND_API_BASE}/api/consistent-players?limit=200`,
        { timeout: 10000 }
      );

      const allPlayers = await dataService.getPlayers();
      const playerMap = new Map(allPlayers.map(p => [p.id, p]));

      const consistentPlayers: ConsistentPlayer[] = response.data
        .map((cached): ConsistentPlayer | null => {
          const player = playerMap.get(cached.player_id);
          if (!player) return null;

          return {
            player,
            xgiHistory: cached.xgi_history || [],
            seasonXGI: cached.season_xgi_per90,
            consistency: cached.consistency,
            consistencyScore: cached.consistency_score,
            totalMinutes: cached.total_minutes,
          };
        })
        .filter((p): p is ConsistentPlayer => p !== null);

      this.cachedPlayers = consistentPlayers;
      this.cacheTimestamp = now;

      console.log(`✅ Loaded ${consistentPlayers.length} consistent players from cache`);

      return this.filterPlayers(consistentPlayers, { positions, minPrice, maxPrice, limit });

    } catch (error) {
      console.error('Failed to fetch consistent data:', error);
      return [];
    }
  }

  private filterPlayers(
    players: ConsistentPlayer[],
    options: { positions?: string[]; minPrice?: number; maxPrice?: number; limit?: number }
  ): ConsistentPlayer[] {
    const { positions, minPrice = 0, maxPrice = 20, limit = 50 } = options;

    let filtered = players.filter(cp => {
      const p = cp.player;
      if (p.price < minPrice || p.price > maxPrice) return false;
      if (positions && positions.length > 0 && !positions.includes(p.position)) return false;
      return true;
    });

    filtered.sort((a, b) => b.consistencyScore - a.consistencyScore);

    return filtered.slice(0, limit);
  }

  clearCache(): void {
    this.cachedPlayers = null;
    this.cacheTimestamp = 0;
  }
}

export const consistentService = new ConsistentService();

