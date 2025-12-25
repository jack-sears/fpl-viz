import React, { useState, useEffect, useMemo } from 'react';
import { consistentService, type ConsistentPlayer } from '../services/consistentService';
import type { XGIGameweek } from '../services/breakoutService';
import { 
  Search, 
  Loader2, 
  Target,
  Info,
  RefreshCw,
  Filter,
  CheckCircle2,
  Shield
} from 'lucide-react';

// Steady sparkline component (neutral color)
const SteadySparkline: React.FC<{ 
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

  // Calculate average line
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const avgY = padding + chartHeight - ((avg - min) / range) * chartHeight;

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Average line */}
      <line 
        x1={padding} 
        y1={avgY} 
        x2={width - padding} 
        y2={avgY} 
        stroke="#c4b5fd" 
        strokeWidth="1" 
        strokeDasharray="3,3"
      />
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" strokeWidth="1" />
      <path
        d={pathD}
        fill="none"
        stroke="#8b5cf6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={padding + chartWidth}
        cy={padding + chartHeight - ((values[values.length - 1] - min) / range) * chartHeight}
        r="3"
        fill="#8b5cf6"
      />
    </svg>
  );
};

// Consistency badge
const ConsistencyBadge: React.FC<{ consistency: number }> = ({ consistency }) => {
  if (consistency < 0.2) {
    return (
      <div className="flex items-center gap-1 text-violet-700">
        <Shield className="w-4 h-4" />
        <span className="text-xs font-bold">Rock Solid</span>
      </div>
    );
  }
  if (consistency < 0.35) {
    return (
      <div className="flex items-center gap-1 text-violet-600">
        <CheckCircle2 className="w-4 h-4" />
        <span className="text-xs font-medium">Very Steady</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-violet-500">
      <Target className="w-4 h-4" />
      <span className="text-xs">Reliable</span>
    </div>
  );
};

export const ConsistentPlayersPage: React.FC = () => {
  const [consistentPlayers, setConsistentPlayers] = useState<ConsistentPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState(15);
  const [showFilters, setShowFilters] = useState(false);

  const loadConsistentPlayers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const players = await consistentService.getConsistentPlayers({
        positions: selectedPositions.length > 0 ? selectedPositions : undefined,
        maxPrice,
        limit: 50,
      });
      
      setConsistentPlayers(players);
    } catch (err) {
      console.error('Failed to load consistent players:', err);
      setError('Failed to load consistent player data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConsistentPlayers();
  }, []);

  const handleRefresh = () => {
    consistentService.clearCache();
    loadConsistentPlayers();
  };

  const handleApplyFilters = () => {
    loadConsistentPlayers();
    setShowFilters(false);
  };

  const togglePosition = (pos: string) => {
    setSelectedPositions(prev => 
      prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]
    );
  };

  const filteredPlayers = useMemo(() => {
    if (!searchTerm) return consistentPlayers;
    const term = searchTerm.toLowerCase();
    return consistentPlayers.filter(cp => 
      cp.player.name.toLowerCase().includes(term) ||
      cp.player.webName?.toLowerCase().includes(term) ||
      cp.player.team.toLowerCase().includes(term)
    );
  }, [consistentPlayers, searchTerm]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin h-12 w-12 text-violet-600 mb-4" />
        <p className="text-gray-600 text-lg">Finding consistent performers...</p>
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
              <Target className="w-7 h-7 text-violet-600" />
              Consistent Performers
            </h2>
            <p className="text-gray-600">
              "Set and forget" players with steady, reliable output.
              These players maintain good xGI without major fluctuations.
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
      <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-violet-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-violet-800">
            <p className="font-semibold mb-1">Steady Performers</p>
            <p>
              These players have <strong>low variance</strong> in their xGI output AND maintain <strong>above-average</strong> numbers.
              Unlike breakout players, they won't spike dramatically - but they also won't disappoint.
              Perfect for squad stability and consistent points.
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
              showFilters || selectedPositions.length > 0 || maxPrice < 15
                ? 'bg-violet-50 text-violet-700 border-violet-300'
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
                          ? 'bg-violet-600 text-white border-violet-600'
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
                className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors"
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
            <thead className="bg-violet-50 border-b border-violet-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-violet-800 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-violet-800 uppercase tracking-wider">
                  Player
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-violet-800 uppercase tracking-wider">
                  xGI Pattern
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-violet-800 uppercase tracking-wider">
                  Season xGI/90
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-violet-800 uppercase tracking-wider">
                  Std Dev
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-violet-800 uppercase tracking-wider">
                  Stability
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-violet-800 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-violet-800 uppercase tracking-wider">
                  Minutes
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-violet-800 uppercase tracking-wider">
                  Price
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPlayers.map((cp, index) => (
                <tr key={cp.player.id} className="hover:bg-violet-50 transition-colors">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                      index < 3 
                        ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white' 
                        : index < 10 
                          ? 'bg-violet-100 text-violet-700'
                          : 'bg-gray-100 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {cp.player.webName || cp.player.name}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className={`px-1.5 py-0.5 rounded font-medium ${
                            cp.player.position === 'FWD' ? 'bg-red-100 text-red-700' :
                            cp.player.position === 'MID' ? 'bg-green-100 text-green-700' :
                            cp.player.position === 'DEF' ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {cp.player.position}
                          </span>
                          <span>{cp.player.team}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center">
                      <SteadySparkline data={cp.xgiHistory} />
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-sm font-bold text-violet-700">
                      {cp.seasonXGI.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`text-sm ${
                      cp.consistency < 0.2 ? 'text-violet-700 font-bold' :
                      cp.consistency < 0.35 ? 'text-violet-600' : 'text-gray-600'
                    }`}>
                      {cp.consistency.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center">
                      <ConsistencyBadge consistency={cp.consistency} />
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold bg-violet-100 text-violet-700">
                      {cp.consistencyScore.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-sm text-gray-600">
                      {cp.totalMinutes}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-sm font-medium text-gray-700">
                      £{cp.player.price.toFixed(1)}m
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPlayers.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            <p>No consistent players found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 bg-violet-50 rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-6 text-xs text-violet-800">
          <div className="font-semibold">Stability Levels:</div>
          <div className="flex items-center gap-1">
            <Shield className="w-4 h-4 text-violet-700" />
            <span>Rock Solid (σ &lt; 0.2)</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-violet-600" />
            <span>Very Steady (σ 0.2-0.35)</span>
          </div>
          <div className="flex items-center gap-1">
            <Target className="w-4 h-4 text-violet-500" />
            <span>Reliable (σ 0.35-0.5)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

