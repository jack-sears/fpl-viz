import React, { useState, useEffect, useMemo } from 'react';
import { breakoutService, type BreakoutPlayer, type XGIGameweek } from '../services/breakoutService';
import { 
  Search, 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Flame, 
  Snowflake,
  Info,
  RefreshCw,
  Filter,
  Shield
} from 'lucide-react';

// Simple sparkline component
const Sparkline: React.FC<{ 
  data: XGIGameweek[]; 
  width?: number; 
  height?: number;
}> = ({ data, width = 120, height = 32 }) => {
  if (data.length < 2) return <span className="text-gray-400 text-xs">No data</span>;

  const values = data
    .filter(d => d.minutes >= 30)
    .map(d => (d.xGI / d.minutes) * 90);

  if (values.length < 2) return <span className="text-gray-400 text-xs">No data</span>;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const padding = 4;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = values.map((val, i) => {
    const x = padding + (i / (values.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((val - min) / range) * chartHeight;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;

  const recentAvg = values.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, values.length);
  const earlierAvg = values.slice(0, -3).reduce((a, b) => a + b, 0) / Math.max(1, values.length - 3);
  const isUpward = recentAvg > earlierAvg * 1.1;
  const isDownward = recentAvg < earlierAvg * 0.9;
  
  const strokeColor = isUpward ? '#10b981' : isDownward ? '#ef4444' : '#6b7280';

  return (
    <svg width={width} height={height} className="overflow-visible">
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" strokeWidth="1" />
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={padding + chartWidth}
        cy={padding + chartHeight - ((values[values.length - 1] - min) / range) * chartHeight}
        r="3"
        fill={strokeColor}
      />
    </svg>
  );
};

// Trend indicator component
const TrendIndicator: React.FC<{ trendRatio: number }> = ({ trendRatio }) => {
  if (trendRatio > 0.3) {
    return (
      <div className="flex items-center gap-1 text-emerald-600">
        <Flame className="w-4 h-4" />
        <span className="text-xs font-bold">HOT</span>
      </div>
    );
  }
  if (trendRatio > 0.1) {
    return (
      <div className="flex items-center gap-1 text-green-600">
        <TrendingUp className="w-4 h-4" />
        <span className="text-xs font-medium">Rising</span>
      </div>
    );
  }
  if (trendRatio > -0.1) {
    return (
      <div className="flex items-center gap-1 text-gray-500">
        <Minus className="w-4 h-4" />
        <span className="text-xs">Steady</span>
      </div>
    );
  }
  if (trendRatio > -0.3) {
    return (
      <div className="flex items-center gap-1 text-orange-500">
        <TrendingDown className="w-4 h-4" />
        <span className="text-xs">Cooling</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-red-500">
      <Snowflake className="w-4 h-4" />
      <span className="text-xs font-medium">Cold</span>
    </div>
  );
};

export const BreakoutPlayersPage: React.FC = () => {
  const [breakoutPlayers, setBreakoutPlayers] = useState<BreakoutPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState(15);
  const [maxOwnership, setMaxOwnership] = useState(50);
  const [showFilters, setShowFilters] = useState(false);

  const loadBreakoutPlayers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const players = await breakoutService.getBreakoutPlayers({
        positions: selectedPositions.length > 0 ? selectedPositions : undefined,
        maxPrice,
        maxOwnership,
        limit: 75,
      });
      
      setBreakoutPlayers(players);
    } catch (err) {
      console.error('Failed to load breakout players:', err);
      setError('Failed to load breakout player data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBreakoutPlayers();
  }, []);

  const handleRefresh = () => {
    breakoutService.clearCache();
    loadBreakoutPlayers();
  };

  const handleApplyFilters = () => {
    loadBreakoutPlayers();
    setShowFilters(false);
  };

  const togglePosition = (pos: string) => {
    setSelectedPositions(prev => 
      prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]
    );
  };

  const filteredPlayers = useMemo(() => {
    if (!searchTerm) return breakoutPlayers;
    const term = searchTerm.toLowerCase();
    return breakoutPlayers.filter(bp => 
      bp.player.name.toLowerCase().includes(term) ||
      bp.player.webName?.toLowerCase().includes(term) ||
      bp.player.team.toLowerCase().includes(term)
    );
  }, [breakoutPlayers, searchTerm]);

  // Check if we're showing defenders/goalkeepers
  const showDefenderStats = selectedPositions.length === 0 || 
    selectedPositions.includes('DEF') || 
    selectedPositions.includes('GKP');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin h-12 w-12 text-primary-600 mb-4" />
        <p className="text-gray-600 text-lg">Analyzing xGI trends...</p>
        <p className="text-gray-400 text-sm mt-2">Loading cached data...</p>
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
              <Flame className="w-7 h-7 text-orange-500" />
              Breakout Players
            </h2>
            <p className="text-gray-600">
              Players with rising xGI trends who could be good picks for upcoming gameweeks.
              Ranked by a composite score balancing recent form AND upward momentum.
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
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold mb-1">How Breakout Score Works</p>
            <p>
              The score combines <strong>recent xGI/90</strong> (last 4 gameweeks) with <strong>trend direction</strong>.
              A player at 0.4 xGI/90 trending up beats a player at 0.5 trending down.
              {showDefenderStats && (
                <span className="block mt-1">
                  <Shield className="w-3 h-3 inline mr-1" />
                  For defenders/GKs, <strong>CS%</strong> shows clean sheet rate (season and recent).
                </span>
              )}
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

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex-1 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search players or teams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
              showFilters || selectedPositions.length > 0 || maxPrice < 15 || maxOwnership < 50
                ? 'bg-primary-50 text-primary-700 border-primary-300'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {(selectedPositions.length > 0 || maxPrice < 15 || maxOwnership < 50) && (
              <span className="bg-primary-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                Active
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                <div className="flex flex-wrap gap-2">
                  {['GKP', 'DEF', 'MID', 'FWD'].map(pos => (
                    <button
                      key={pos}
                      onClick={() => togglePosition(pos)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        selectedPositions.includes(pos)
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Price: £{maxPrice}m
                </label>
                <input
                  type="range"
                  min="4"
                  max="15"
                  step="0.5"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Ownership: {maxOwnership}%
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  step="1"
                  value={maxOwnership}
                  onChange={(e) => setMaxOwnership(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setSelectedPositions([]);
                  setMaxPrice(15);
                  setMaxOwnership(50);
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Reset
              </button>
              <button
                onClick={handleApplyFilters}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Player
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  xGI Trend
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Recent xGI/90
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Season xGI/90
                </th>
                {showDefenderStats && (
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-1">
                      <Shield className="w-3 h-3" />
                      CS%
                    </div>
                  </th>
                )}
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Trend
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Owned
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPlayers.map((bp, index) => {
                const isDefender = bp.player.position === 'DEF' || bp.player.position === 'GKP';
                
                return (
                  <tr key={bp.player.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                        index < 3 
                          ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' 
                          : index < 10 
                            ? 'bg-primary-100 text-primary-700'
                            : 'bg-gray-100 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {bp.player.webName || bp.player.name}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className={`px-1.5 py-0.5 rounded font-medium ${
                              bp.player.position === 'FWD' ? 'bg-red-100 text-red-700' :
                              bp.player.position === 'MID' ? 'bg-green-100 text-green-700' :
                              bp.player.position === 'DEF' ? 'bg-blue-100 text-blue-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {bp.player.position}
                            </span>
                            <span>{bp.player.team}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-center">
                        <Sparkline data={bp.xgiHistory} />
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-sm font-bold text-gray-900">
                        {bp.recentXGI.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-sm text-gray-600">
                        {bp.seasonXGI.toFixed(2)}
                      </span>
                    </td>
                    {showDefenderStats && (
                      <td className="px-4 py-4 text-center">
                        {isDefender ? (
                          <div className="flex flex-col items-center">
                            <span className="text-sm font-medium text-blue-700">
                              {(bp.csPotentialRecent * 100).toFixed(0)}%
                            </span>
                            <span className="text-xs text-gray-400">
                              ({(bp.csPotentialSeason * 100).toFixed(0)}%)
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-4">
                      <div className="flex justify-center">
                        <TrendIndicator trendRatio={bp.trendRatio} />
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold ${
                        bp.breakoutScore > 0.5 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : bp.breakoutScore > 0.3 
                            ? 'bg-green-100 text-green-700'
                            : bp.breakoutScore > 0.15
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-600'
                      }`}>
                        {bp.breakoutScore.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-sm font-medium text-gray-700">
                        £{bp.player.price.toFixed(1)}m
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`text-sm ${
                        bp.player.selectedBy < 5 
                          ? 'text-emerald-600 font-semibold' 
                          : bp.player.selectedBy < 15 
                            ? 'text-green-600'
                            : 'text-gray-600'
                      }`}>
                        {bp.player.selectedBy.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredPlayers.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            <p>No players found matching your criteria.</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedPositions([]);
                setMaxPrice(15);
                setMaxOwnership(50);
                loadBreakoutPlayers();
              }}
              className="mt-2 text-sm text-primary-600 hover:text-primary-700"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-6 text-xs text-gray-600">
          <div className="font-semibold text-gray-700">Trend Legend:</div>
          <div className="flex items-center gap-1">
            <Flame className="w-4 h-4 text-emerald-600" />
            <span>HOT (&gt;30% up)</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span>Rising (10-30% up)</span>
          </div>
          <div className="flex items-center gap-1">
            <Minus className="w-4 h-4 text-gray-500" />
            <span>Steady (±10%)</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingDown className="w-4 h-4 text-orange-500" />
            <span>Cooling (10-30% down)</span>
          </div>
          <div className="flex items-center gap-1">
            <Snowflake className="w-4 h-4 text-red-500" />
            <span>Cold (&gt;30% down)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
