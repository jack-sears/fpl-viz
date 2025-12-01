import React, { useState, useEffect } from 'react';
import type { Player, PlayerStats } from '../types/fpl';
import { PlayerList } from './PlayerList';
import { PlayerStatsChart } from './PlayerStatsChart';
import { PlayerComparison } from './PlayerComparison';
import { PositionDistribution } from './PositionDistribution';
import { dataService } from '../services/dataService';
import { X } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedPlayerStats, setSelectedPlayerStats] = useState<PlayerStats | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPlayerStats, setLoadingPlayerStats] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'comparison'>('overview');
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'api' | 'mock' | null>(null);

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dataService.getPlayers();
      setPlayers(data);
      setDataSource('api');
      console.log(`✅ Loaded ${data.length} players successfully from FPL API`);
    } catch (error) {
      console.error('❌ Failed to load players:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Failed to load players: ${errorMessage}. Check browser console for details.`);
      setDataSource(null);
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerClick = async (player: Player) => {
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
  };

  const handlePlayerSelect = (player: Player) => {
    if (selectedPlayers.find(p => p.id === player.id)) {
      setSelectedPlayers(selectedPlayers.filter(p => p.id !== player.id));
    } else if (selectedPlayers.length < 5) {
      setSelectedPlayers([...selectedPlayers, player]);
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Fantasy Premier League Data Visualization</h1>
              <p className="text-gray-600 mt-2">Explore player statistics, compare performances, and analyze trends</p>
            </div>
            {dataSource === 'api' && (
              <div className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-lg">
                <span className="text-sm font-semibold">✓ Live Data</span>
              </div>
            )}
          </div>
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
              <p className="font-semibold">Error Loading Data</p>
              <p className="text-sm mt-1">{error}</p>
              <button
                onClick={loadPlayers}
                className="mt-2 text-sm bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'overview'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'comparison'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Comparison
            </button>
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-8">
            <PositionDistribution players={players} />
            <PlayerList players={players} onPlayerClick={handlePlayerClick} />
          </div>
        )}

        {activeTab === 'comparison' && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Select Players to Compare (up to 5)</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedPlayers.map(player => (
                  <div
                    key={player.id}
                    className="flex items-center gap-2 bg-primary-100 text-primary-800 px-4 py-2 rounded-lg"
                  >
                    <span>{player.name}</span>
                    <button
                      onClick={() => handlePlayerSelect(player)}
                      className="hover:bg-primary-200 rounded p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              {selectedPlayers.length > 0 && (
                <PlayerComparison players={selectedPlayers} />
              )}
            </div>
            <PlayerList players={players} onPlayerClick={handlePlayerSelect} />
          </div>
        )}

        {selectedPlayer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
              <button
                onClick={() => {
                  setSelectedPlayer(null);
                  setSelectedPlayerStats(null);
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
              {loadingPlayerStats ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
              ) : selectedPlayerStats ? (
                <PlayerStatsChart stats={selectedPlayerStats} />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>Failed to load player statistics.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

