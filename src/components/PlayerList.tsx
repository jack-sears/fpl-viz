import React, { useState } from 'react';
import type { Player } from '../types/fpl';
import { PlayerCard } from './PlayerCard';
import { Search, Filter } from 'lucide-react';

interface PlayerListProps {
  players: Player[];
  onPlayerClick?: (player: Player) => void;
}

export const PlayerList: React.FC<PlayerListProps> = ({ players, onPlayerClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'points' | 'price' | 'value' | 'form'>('points');

  const positions = ['all', 'GK', 'DEF', 'MID', 'FWD'];

  const filteredPlayers = players
    .filter(player => {
      const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           player.team.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPosition = positionFilter === 'all' || player.position === positionFilter;
      return matchesSearch && matchesPosition;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'points': return b.totalPoints - a.totalPoints;
        case 'price': return b.price - a.price;
        case 'value': return b.value - a.value;
        case 'form': return b.form - a.form;
        default: return 0;
      }
    });

  return (
    <div>
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search players or teams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {positions.map(pos => (
                  <option key={pos} value={pos}>{pos === 'all' ? 'All Positions' : pos}</option>
                ))}
              </select>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="points">Sort by Points</option>
              <option value="price">Sort by Price</option>
              <option value="value">Sort by Value</option>
              <option value="form">Sort by Form</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlayers.map(player => (
          <PlayerCard
            key={player.id}
            player={player}
            onClick={() => onPlayerClick?.(player)}
          />
        ))}
      </div>

      {filteredPlayers.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No players found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

