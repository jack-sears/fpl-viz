import React, { useState, useEffect } from 'react';
import { 
  recommendationsService, 
  type BuyRecommendation, 
  type SellRecommendation 
} from '../services/recommendationsService';
import { dataService } from '../services/dataService';
import { 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight,
  Info,
  RefreshCw,
  ShoppingCart,
  Trash2,
  Calendar,
  Home,
  Plane
} from 'lucide-react';

// Fixture badge component
const FixtureBadge: React.FC<{ 
  opponentId: number;
  isHome: boolean;
  teams: Map<number, string>;
}> = ({ opponentId, isHome, teams }) => {
  const teamName = teams.get(opponentId) || 'TBD';
  const shortName = teamName.slice(0, 3).toUpperCase();
  
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
      isHome ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
    }`}>
      {isHome ? <Home className="w-3 h-3" /> : <Plane className="w-3 h-3" />}
      <span>{shortName}</span>
    </div>
  );
};

// Reason badge
const ReasonBadge: React.FC<{ reason: string; type: 'buy' | 'sell' }> = ({ reason, type }) => {
  if (type === 'buy') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        reason === 'trending_up' 
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-green-100 text-green-700'
      }`}>
        <TrendingUp className="w-3 h-3" />
        {reason === 'trending_up' ? 'Hot Form' : 'Good Form'}
      </span>
    );
  }
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
      reason === 'trending_down' 
        ? 'bg-red-100 text-red-700'
        : 'bg-orange-100 text-orange-700'
    }`}>
      <TrendingDown className="w-3 h-3" />
      {reason === 'trending_down' ? 'Sharp Decline' : 'Dropping'}
    </span>
  );
};

export const RecommendationsPage: React.FC = () => {
  const [buyRecs, setBuyRecs] = useState<BuyRecommendation[]>([]);
  const [sellRecs, setSellRecs] = useState<SellRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<Map<number, string>>(new Map());

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load teams for fixture display
      const teamData = await dataService.getTeams();
      setTeams(new Map(teamData.map(t => [t.id, t.name])));
      
      const { buy, sell } = await recommendationsService.getRecommendations();
      setBuyRecs(buy);
      setSellRecs(sell);
    } catch (err) {
      console.error('Failed to load recommendations:', err);
      setError('Failed to load recommendations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, []);

  const handleRefresh = () => {
    recommendationsService.clearCache();
    loadRecommendations();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin h-12 w-12 text-primary-600 mb-4" />
        <p className="text-gray-600 text-lg">Analyzing transfer targets...</p>
      </div>
    );
  }

  return (
    <div className="py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <ArrowRight className="w-7 h-7 text-primary-600" />
              Transfer Recommendations
            </h2>
            <p className="text-gray-600">
              Data-driven suggestions for who to buy and sell based on form trends and fixture difficulty.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-primary-800">
            <p className="font-semibold mb-1">How Recommendations Work</p>
            <p>
              <strong>Buy score</strong> = Breakout score + Fixture ease (next 5 GWs).
              <strong className="ml-2">Sell score</strong> = Downfall score + Fixture difficulty.
              Use these as a starting point - always check news and your team context.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
          <p className="font-semibold">Error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BUY Recommendations */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-emerald-600 px-4 py-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Who to Buy
            </h3>
            <p className="text-emerald-100 text-sm">Rising form + favorable fixtures</p>
          </div>
          
          <div className="divide-y divide-gray-100">
            {buyRecs.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No strong buy recommendations at this time.
              </div>
            ) : (
              buyRecs.map((rec, index) => (
                <div key={rec.player.id} className="p-4 hover:bg-emerald-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                        index < 3 
                          ? 'bg-emerald-500 text-white' 
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {rec.player.webName || rec.player.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            rec.player.position === 'FWD' ? 'bg-red-100 text-red-700' :
                            rec.player.position === 'MID' ? 'bg-green-100 text-green-700' :
                            rec.player.position === 'DEF' ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {rec.player.position}
                          </span>
                          <span className="text-xs text-gray-500">{rec.player.team}</span>
                          <span className="text-xs font-medium text-gray-700">
                            £{rec.player.price.toFixed(1)}m
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-emerald-600">
                        {rec.buyScore.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">score</div>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <ReasonBadge reason={rec.reason} type="buy" />
                    <span className="text-xs text-gray-500">
                      xGI: {rec.recentXGI.toFixed(2)}/90
                    </span>
                    <span className={`text-xs font-medium ${
                      rec.trendRatio > 0.3 ? 'text-emerald-600' : 'text-green-600'
                    }`}>
                      +{(rec.trendRatio * 100).toFixed(0)}%
                    </span>
                  </div>
                  
                  {rec.upcomingFixtures.length > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1.5">
                        <Calendar className="w-3 h-3" />
                        <span>Next 3:</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {rec.upcomingFixtures.slice(0, 3).map((fix, i) => (
                          <FixtureBadge 
                            key={i} 
                            opponentId={fix.opponent_id} 
                            isHome={fix.is_home}
                            teams={teams}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* SELL Recommendations */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-red-600 px-4 py-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Who to Sell
            </h3>
            <p className="text-red-100 text-sm">Declining form + tough fixtures</p>
          </div>
          
          <div className="divide-y divide-gray-100">
            {sellRecs.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No strong sell recommendations at this time.
              </div>
            ) : (
              sellRecs.map((rec, index) => (
                <div key={rec.player.id} className="p-4 hover:bg-red-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                        index < 3 
                          ? 'bg-red-500 text-white' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {rec.player.webName || rec.player.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            rec.player.position === 'FWD' ? 'bg-red-100 text-red-700' :
                            rec.player.position === 'MID' ? 'bg-green-100 text-green-700' :
                            rec.player.position === 'DEF' ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {rec.player.position}
                          </span>
                          <span className="text-xs text-gray-500">{rec.player.team}</span>
                          <span className="text-xs font-medium text-gray-700">
                            £{rec.player.price.toFixed(1)}m
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-red-600">
                        {rec.sellScore.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">score</div>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <ReasonBadge reason={rec.reason} type="sell" />
                    <span className="text-xs text-gray-500">
                      xGI: {rec.seasonXGI.toFixed(2)} → {rec.recentXGI.toFixed(2)}
                    </span>
                    <span className="text-xs font-medium text-red-600">
                      {(rec.trendRatio * 100).toFixed(0)}%
                    </span>
                  </div>
                  
                  {rec.upcomingFixtures.length > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1.5">
                        <Calendar className="w-3 h-3" />
                        <span>Next 3:</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {rec.upcomingFixtures.slice(0, 3).map((fix, i) => (
                          <FixtureBadge 
                            key={i} 
                            opponentId={fix.opponent_id} 
                            isHome={fix.is_home}
                            teams={teams}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <div className="text-sm text-gray-600">
          <span className="font-semibold text-gray-700">Tips: </span>
          <span className="flex items-center gap-1 inline">
            <Home className="w-3 h-3 text-green-600" /> = Home fixture (easier)
          </span>
          <span className="mx-2">•</span>
          <span className="flex items-center gap-1 inline">
            <Plane className="w-3 h-3 text-gray-600" /> = Away fixture
          </span>
          <span className="mx-2">•</span>
          Always check for injuries, suspensions, and rotation risk before transfers.
        </div>
      </div>
    </div>
  );
};

