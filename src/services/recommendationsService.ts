import axios from 'axios';
import type { Player } from '../types/fpl';
import { dataService } from './dataService';

const BACKEND_API_BASE = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:5000';

export interface UpcomingFixture {
  opponent_id: number;
  is_home: boolean;
  gameweek: number;
}

export interface BuyRecommendation {
  player: Player;
  buyScore: number;
  breakoutScore: number;
  trendRatio: number;
  recentXGI: number;
  fixtureEase: number;
  upcomingFixtures: UpcomingFixture[];
  reason: 'trending_up' | 'good_form';
}

export interface SellRecommendation {
  player: Player;
  sellScore: number;
  downfallScore: number;
  trendRatio: number;
  recentXGI: number;
  seasonXGI: number;
  fixtureDifficulty: number;
  upcomingFixtures: UpcomingFixture[];
  reason: 'trending_down' | 'declining_form';
}

interface CachedBuyRec {
  player_id: number;
  name: string;
  web_name: string;
  team: string;
  team_id: number;
  position: string;
  buy_score: number;
  breakout_score: number;
  trend_ratio: number;
  recent_xgi_per90: number;
  fixture_ease: number;
  upcoming_fixtures: UpcomingFixture[];
  reason: 'trending_up' | 'good_form';
}

interface CachedSellRec {
  player_id: number;
  name: string;
  web_name: string;
  team: string;
  team_id: number;
  position: string;
  sell_score: number;
  downfall_score: number;
  trend_ratio: number;
  recent_xgi_per90: number;
  season_xgi_per90: number;
  fixture_difficulty: number;
  upcoming_fixtures: UpcomingFixture[];
  reason: 'trending_down' | 'declining_form';
}

class RecommendationsService {
  private cachedBuy: BuyRecommendation[] | null = null;
  private cachedSell: SellRecommendation[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000;

  async getRecommendations(): Promise<{ buy: BuyRecommendation[]; sell: SellRecommendation[] }> {
    const now = Date.now();
    if (this.cachedBuy && this.cachedSell && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      console.log('⚡ Using cached recommendations');
      return { buy: this.cachedBuy, sell: this.cachedSell };
    }

    console.log('🔄 Fetching recommendations from backend...');

    try {
      const response = await axios.get<{ buy: CachedBuyRec[]; sell: CachedSellRec[] }>(
        `${BACKEND_API_BASE}/api/recommendations`,
        { timeout: 10000 }
      );

      const allPlayers = await dataService.getPlayers();
      const playerMap = new Map(allPlayers.map(p => [p.id, p]));

      const buyRecs: BuyRecommendation[] = (response.data.buy || [])
        .map((cached): BuyRecommendation | null => {
          const player = playerMap.get(cached.player_id);
          if (!player) return null;

          return {
            player,
            buyScore: cached.buy_score,
            breakoutScore: cached.breakout_score,
            trendRatio: cached.trend_ratio,
            recentXGI: cached.recent_xgi_per90,
            fixtureEase: cached.fixture_ease,
            upcomingFixtures: cached.upcoming_fixtures || [],
            reason: cached.reason,
          };
        })
        .filter((p): p is BuyRecommendation => p !== null);

      const sellRecs: SellRecommendation[] = (response.data.sell || [])
        .map((cached): SellRecommendation | null => {
          const player = playerMap.get(cached.player_id);
          if (!player) return null;

          return {
            player,
            sellScore: cached.sell_score,
            downfallScore: cached.downfall_score,
            trendRatio: cached.trend_ratio,
            recentXGI: cached.recent_xgi_per90,
            seasonXGI: cached.season_xgi_per90,
            fixtureDifficulty: cached.fixture_difficulty,
            upcomingFixtures: cached.upcoming_fixtures || [],
            reason: cached.reason,
          };
        })
        .filter((p): p is SellRecommendation => p !== null);

      this.cachedBuy = buyRecs;
      this.cachedSell = sellRecs;
      this.cacheTimestamp = now;

      console.log(`✅ Loaded ${buyRecs.length} buy, ${sellRecs.length} sell recommendations`);

      return { buy: buyRecs, sell: sellRecs };

    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      return { buy: [], sell: [] };
    }
  }

  clearCache(): void {
    this.cachedBuy = null;
    this.cachedSell = null;
    this.cacheTimestamp = 0;
  }
}

export const recommendationsService = new RecommendationsService();

