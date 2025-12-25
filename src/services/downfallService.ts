import axios from 'axios';
import type { Player } from '../types/fpl';
import { dataService } from './dataService';
import type { XGIGameweek } from './breakoutService';

const BACKEND_API_BASE = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:5000';

export interface DownfallPlayer {
  player: Player;
  xgiHistory: XGIGameweek[];
  recentXGI: number;
  seasonXGI: number;
  trendRatio: number;
  downfallScore: number;
  recentMinutes: number;
  totalMinutes: number;
}

interface CachedDownfallPlayer {
  player_id: number;
  name: string;
  web_name: string;
  team: string;
  team_id: number;
  position: string;
  recent_xgi_per90: number;
  season_xgi_per90: number;
  trend_ratio: number;
  downfall_score: number;
  recent_minutes: number;
  total_minutes: number;
  xgi_history: XGIGameweek[];
}

class DownfallService {
  private cachedPlayers: DownfallPlayer[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000;

  async getDownfallPlayers(
    options: {
      positions?: string[];
      minPrice?: number;
      maxPrice?: number;
      limit?: number;
    } = {}
  ): Promise<DownfallPlayer[]> {
    const { positions, minPrice = 0, maxPrice = 20, limit = 50 } = options;

    const now = Date.now();
    if (this.cachedPlayers && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      console.log('⚡ Using cached downfall data');
      return this.filterPlayers(this.cachedPlayers, { positions, minPrice, maxPrice, limit });
    }

    console.log('🔄 Fetching downfall players from backend...');

    try {
      const response = await axios.get<CachedDownfallPlayer[]>(
        `${BACKEND_API_BASE}/api/downfall-players?limit=200`,
        { timeout: 10000 }
      );

      const allPlayers = await dataService.getPlayers();
      const playerMap = new Map(allPlayers.map(p => [p.id, p]));

      const downfallPlayers: DownfallPlayer[] = response.data
        .map((cached): DownfallPlayer | null => {
          const player = playerMap.get(cached.player_id);
          if (!player) return null;

          return {
            player,
            xgiHistory: cached.xgi_history || [],
            recentXGI: cached.recent_xgi_per90,
            seasonXGI: cached.season_xgi_per90,
            trendRatio: cached.trend_ratio,
            downfallScore: cached.downfall_score,
            recentMinutes: cached.recent_minutes,
            totalMinutes: cached.total_minutes,
          };
        })
        .filter((p): p is DownfallPlayer => p !== null);

      this.cachedPlayers = downfallPlayers;
      this.cacheTimestamp = now;

      console.log(`✅ Loaded ${downfallPlayers.length} downfall players from cache`);

      return this.filterPlayers(downfallPlayers, { positions, minPrice, maxPrice, limit });

    } catch (error) {
      console.error('Failed to fetch downfall data:', error);
      return [];
    }
  }

  private filterPlayers(
    players: DownfallPlayer[],
    options: { positions?: string[]; minPrice?: number; maxPrice?: number; limit?: number }
  ): DownfallPlayer[] {
    const { positions, minPrice = 0, maxPrice = 20, limit = 50 } = options;

    let filtered = players.filter(dp => {
      const p = dp.player;
      if (p.price < minPrice || p.price > maxPrice) return false;
      if (positions && positions.length > 0 && !positions.includes(p.position)) return false;
      return true;
    });

    filtered.sort((a, b) => b.downfallScore - a.downfallScore);

    return filtered.slice(0, limit);
  }

  clearCache(): void {
    this.cachedPlayers = null;
    this.cacheTimestamp = 0;
  }
}

export const downfallService = new DownfallService();

