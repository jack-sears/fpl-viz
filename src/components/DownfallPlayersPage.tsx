import React, { useState, useEffect, useMemo } from 'react';
import { downfallService, type DownfallPlayer } from '../services/downfallService';
import type { XGIGameweek } from '../services/breakoutService';
import { 
  Search, 
  Loader2, 
  TrendingDown, 
  AlertTriangle,
  Info,
  RefreshCw,
  Filter,
  ThumbsDown
} from 'lucide-react';

// Sparkline component for downfall (red theme)
const DownfallSparkline: React.FC<{ 
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

  return (
    <svg width={width} height={height} className="overflow-visible">
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#fecaca" strokeWidth="1" />
      <path
        d={pathD}
        fill="none"
        stroke="#ef4444"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={padding + chartWidth}
        cy={padding + chartHeight - ((values[values.length - 1] - min) / range) * chartHeight}
        r="3"
        fill="#ef4444"
      />
    </svg>
  );
};

// Decline severity indicator
const DeclineIndicator: React.FC<{ trendRatio: number }> = ({ trendRatio }) => {
  const severity = Math.abs(trendRatio);
  
  if (severity > 0.5) {
    return (
      <div className="flex items-center gap-1 text-red-700">
        <AlertTriangle className="w-4 h-4" />
        <span className="text-xs font-bold">STEEP</span>
      </div>
    );
  }
  if (severity > 0.3) {
    return (
      <div className="flex items-center gap-1 text-red-600">
        <TrendingDown className="w-4 h-4" />
        <span className="text-xs font-bold">Major</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-orange-500">
      <TrendingDown className="w-4 h-4" />
      <span className="text-xs">Declining</span>
    </div>
  );
};

export const DownfallPlayersPage: React.FC = () => {
  const [downfallPlayers, setDownfallPlayers] = useState<DownfallPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState(15);
  const [showFilters, setShowFilters] = useState(false);

  const loadDownfallPlayers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const players = await downfallService.getDownfallPlayers({
        positions: selectedPositions.length > 0 ? selectedPositions : undefined,
        maxPrice,
        limit: 50,
      });
      
      setDownfallPlayers(players);
    } catch (err) {
      console.error('Failed to load downfall players:', err);
      setError('Failed to load downfall player data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDownfallPlayers();
  }, []);

  const handleRefresh = () => {
    downfallService.clearCache();
    loadDownfallPlayers();
  };

  const handleApplyFilters = () => {
    loadDownfallPlayers();
    setShowFilters(false);
  };

  const togglePosition = (pos: string) => {
    setSelectedPositions(prev => 
      prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]
    );
  };

  const filteredPlayers = useMemo(() => {
    if (!searchTerm) return downfallPlayers;
    const term = searchTerm.toLowerCase();
    return downfallPlayers.filter(dp => 
      dp.player.name.toLowerCase().includes(term) ||
      dp.player.webName?.toLowerCase().includes(term) ||
      dp.player.team.toLowerCase().includes(term)
    );
  }, [downfallPlayers, searchTerm]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin h-12 w-12 text-red-600 mb-4" />
        <p className="text-gray-600 text-lg">Finding declining players...</p>
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
              <ThumbsDown className="w-7 h-7 text-red-500" />
              Downfall Players
            </h2>
            <p className="text-gray-600">
              Players with declining xGI trends - consider selling or avoiding these assets.
              Ranked by severity of decline relative to their season average.
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
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-800">
            <p className="font-semibold mb-1">Players to Consider Selling</p>
            <p>
              These players show <strong>declining xGI/90</strong> compared to their season average.
              A high downfall score means significant drop-off - good candidates to transfer out.
              Check for injuries, rotation, or tactical changes before making decisions.
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
              showFilters || selectedPositions.length > 0 || maxPrice < 15
                ? 'bg-red-50 text-red-700 border-red-300'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                <div className="flex flex-wrap gap-2">
                  {['GKP', 'DEF', 'MID', 'FWD'].map(pos => (
                    <button
                      key={pos}
                      onClick={() => togglePosition(pos)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        selectedPositions.includes(pos)
                          ? 'bg-red-600 text-white border-red-600'
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
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setSelectedPositions([]);
                  setMaxPrice(15);
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Reset
              </button>
              <button
                onClick={handleApplyFilters}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
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
            <thead className="bg-red-50 border-b border-red-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-red-800 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-red-800 uppercase tracking-wider">
                  Player
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-red-800 uppercase tracking-wider">
                  xGI Trend
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-red-800 uppercase tracking-wider">
                  Recent xGI/90
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-red-800 uppercase tracking-wider">
                  Season xGI/90
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-red-800 uppercase tracking-wider">
                  Drop %
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-red-800 uppercase tracking-wider">
                  Decline
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-red-800 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-red-800 uppercase tracking-wider">
                  Price
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPlayers.map((dp, index) => (
                <tr key={dp.player.id} className="hover:bg-red-50 transition-colors">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                      index < 3 
                        ? 'bg-gradient-to-br from-red-500 to-red-700 text-white' 
                        : index < 10 
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {dp.player.webName || dp.player.name}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className={`px-1.5 py-0.5 rounded font-medium ${
                            dp.player.position === 'FWD' ? 'bg-red-100 text-red-700' :
                            dp.player.position === 'MID' ? 'bg-green-100 text-green-700' :
                            dp.player.position === 'DEF' ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {dp.player.position}
                          </span>
                          <span>{dp.player.team}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center">
                      <DownfallSparkline data={dp.xgiHistory} />
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-sm font-bold text-red-600">
                      {dp.recentXGI.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-sm text-gray-600">
                      {dp.seasonXGI.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-sm font-bold text-red-600">
                      {(dp.trendRatio * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center">
                      <DeclineIndicator trendRatio={dp.trendRatio} />
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold bg-red-100 text-red-700">
                      {dp.downfallScore.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-sm font-medium text-gray-700">
                      £{dp.player.price.toFixed(1)}m
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPlayers.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            <p>No declining players found.</p>
            <p className="text-sm mt-1 text-green-600">That's actually good news!</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 bg-red-50 rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-6 text-xs text-red-800">
          <div className="font-semibold">Decline Severity:</div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="w-4 h-4 text-red-700" />
            <span>STEEP (&gt;50% drop)</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <span>Major (30-50% drop)</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingDown className="w-4 h-4 text-orange-500" />
            <span>Declining (15-30% drop)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

