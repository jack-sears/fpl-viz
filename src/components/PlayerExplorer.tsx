import React, { useState, useEffect, useMemo } from 'react';
import type { Player, PlayerStats } from '../types/fpl';
import { dataService } from '../services/dataService';
import { 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  TrendingUp,
  TrendingDown,
  X
} from 'lucide-react';
import { PlayerDetailPage } from './PlayerDetailPage';

type SortField = 'name' | 'price' | 'totalPoints' | 'value' | 'form' | 'xGIPer90' | 'expectedPoints';
type SortDirection = 'asc' | 'desc';

interface PlayerExplorerProps {
  onPlayerClick?: (player: Player) => void;
}

export const PlayerExplorer: React.FC<PlayerExplorerProps> = ({ onPlayerClick }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [priceMin, setPriceMin] = useState<number>(0);
  const [priceMax, setPriceMax] = useState<number>(15);
  const [sortField, setSortField] = useState<SortField>('expectedPoints');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedPlayerStats, setSelectedPlayerStats] = useState<PlayerStats | null>(null);
  const [loadingPlayerStats, setLoadingPlayerStats] = useState(false);

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dataService.getPlayers();
      setPlayers(data);
      console.log(`✅ Loaded ${data.length} players successfully from FPL API`);
    } catch (error) {
      console.error('❌ Failed to load players:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Failed to load players: ${errorMessage}. Check browser console for details.`);
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handlePlayerRowClick = async (player: Player) => {
    if (onPlayerClick) {
      onPlayerClick(player);
    } else {
      setSelectedPlayer(player);
      setLoadingPlayerStats(true);
      try {
        const stats = await dataService.getPlayerStats(player.id);
        setSelectedPlayerStats(stats);
      } catch (error) {
        console.error('Failed to load player stats:', error);
      } finally {
        setLoadingPlayerStats(false);
      }
    }
  };

  const filteredAndSortedPlayers = useMemo(() => {
    let filtered = players.filter(player => {
      const matchesSearch = 
        player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.team.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.webName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesPosition = positionFilter === 'all' || player.position === positionFilter;
      const matchesPrice = player.price >= priceMin && player.price <= priceMax;
      
      return matchesSearch && matchesPosition && matchesPrice;
    });

    filtered.sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortField) {
        case 'name':
          return sortDirection === 'asc' 
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'totalPoints':
          aValue = a.totalPoints;
          bValue = b.totalPoints;
          break;
        case 'value':
          aValue = a.value;
          bValue = b.value;
          break;
        case 'form':
          aValue = a.form;
          bValue = b.form;
          break;
        case 'xGIPer90':
          aValue = a.xGIPer90 || 0;
          bValue = b.xGIPer90 || 0;
          break;
        case 'expectedPoints':
          aValue = a.expectedPoints || 0;
          bValue = b.expectedPoints || 0;
          break;
        default:
          return 0;
      }

      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [players, searchTerm, positionFilter, priceMin, priceMax, sortField, sortDirection]);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-primary-600" />
      : <ArrowDown className="w-4 h-4 text-primary-600" />;
  };

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'GK': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'DEF': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'MID': return 'bg-green-100 text-green-800 border-green-200';
      case 'FWD': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading player data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Player Explorer</h2>
        <p className="text-gray-600">Find, compare, and analyze FPL players</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded-lg mb-6">
          <p className="text-sm font-semibold">Error Loading Data</p>
          <button
            onClick={loadPlayers}
            className="mt-1 text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      <div>
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name or team..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Positions</option>
                <option value="GK">Goalkeeper</option>
                <option value="DEF">Defender</option>
                <option value="MID">Midfielder</option>
                <option value="FWD">Forward</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="15"
                  step="0.5"
                  value={priceMin}
                  onChange={(e) => setPriceMin(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  placeholder="Min"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="number"
                  min="0"
                  max="15"
                  step="0.5"
                  value={priceMax}
                  onChange={(e) => setPriceMax(parseFloat(e.target.value) || 15)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  placeholder="Max"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2">
              Showing <span className="font-semibold text-gray-900">{filteredAndSortedPlayers.length}</span> of {players.length} players
            </p>
          </div>
        </div>

        {/* Player Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th 
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Player
                      {getSortIcon('name')}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Team
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('price')}
                  >
                    <div className="flex items-center gap-2">
                      Price
                      {getSortIcon('price')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('totalPoints')}
                  >
                    <div className="flex items-center gap-2">
                      Points
                      {getSortIcon('totalPoints')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('expectedPoints')}
                  >
                    <div className="flex items-center gap-2">
                      xP
                      {getSortIcon('expectedPoints')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('xGIPer90')}
                  >
                    <div className="flex items-center gap-2">
                      xGI/90
                      {getSortIcon('xGIPer90')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('value')}
                  >
                    <div className="flex items-center gap-2">
                      Value
                      {getSortIcon('value')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('form')}
                  >
                    <div className="flex items-center gap-2">
                      Form
                      {getSortIcon('form')}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Stats
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedPlayers.map((player) => {
                  const transferTrend = player.transfersIn - player.transfersOut;
                  return (
                    <tr
                      key={player.id}
                      onClick={() => handlePlayerRowClick(player)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{player.name}</div>
                            <div className="text-xs text-gray-500">{player.webName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-semibold border ${getPositionColor(player.position)}`}>
                          {player.position}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {player.team}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        £{player.price.toFixed(1)}m
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {player.totalPoints}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {player.expectedPoints?.toFixed(1) || '-'}
                        </div>
                        {player.expectedPoints && (
                          <div className="text-xs text-gray-500">
                            {player.expectedPoints > player.totalPoints ? (
                              <span className="text-green-600">+{(player.expectedPoints - player.totalPoints).toFixed(1)}</span>
                            ) : (
                              <span className="text-red-600">{(player.expectedPoints - player.totalPoints).toFixed(1)}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {player.xGIPer90 ? player.xGIPer90.toFixed(2) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {player.value.toFixed(1)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{player.form.toFixed(1)}</div>
                        <div className="text-xs text-gray-500">{player.pointsPerGame?.toFixed(1) || '-'} PPG</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <div>
                            <span className="font-semibold text-gray-900">{player.goals}</span> G
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900">{player.assists}</span> A
                          </div>
                          <div className="flex items-center gap-1">
                            {transferTrend >= 0 ? (
                              <TrendingUp className="w-3 h-3 text-green-600" />
                            ) : (
                              <TrendingDown className="w-3 h-3 text-red-600" />
                            )}
                            <span className={transferTrend >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {transferTrend >= 0 ? '+' : ''}{transferTrend > 1000 ? `${(transferTrend / 1000).toFixed(1)}k` : transferTrend}
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredAndSortedPlayers.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>No players found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => {
                setSelectedPlayer(null);
                setSelectedPlayerStats(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
            >
              <X className="w-6 h-6" />
            </button>
            {loadingPlayerStats ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : selectedPlayerStats ? (
              <PlayerDetailPage 
                player={selectedPlayer} 
                stats={selectedPlayerStats}
                onClose={() => {
                  setSelectedPlayer(null);
                  setSelectedPlayerStats(null);
                }}
              />
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>Failed to load player statistics.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

