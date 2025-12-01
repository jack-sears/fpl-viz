import React from 'react';
import type { Player } from '../types/fpl';
import { TrendingUp, TrendingDown, Users, Target } from 'lucide-react';

interface PlayerCardProps {
  player: Player;
  onClick?: () => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, onClick }) => {
  const getPositionColor = (position: string) => {
    switch (position) {
      case 'GK': return 'bg-purple-100 text-purple-800';
      case 'DEF': return 'bg-blue-100 text-blue-800';
      case 'MID': return 'bg-green-100 text-green-800';
      case 'FWD': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const transferTrend = player.transfersIn - player.transfersOut;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 cursor-pointer border border-gray-200 hover:border-primary-500"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-bold text-gray-900">{player.name}</h3>
            <span className={`px-2 py-1 rounded text-xs font-semibold ${getPositionColor(player.position)}`}>
              {player.position}
            </span>
          </div>
          <p className="text-sm text-gray-600">{player.team}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary-600">£{player.price.toFixed(1)}m</p>
          <p className="text-xs text-gray-500">Price</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 rounded p-3">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-primary-600" />
            <p className="text-xs text-gray-600">Total Points</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{player.totalPoints}</p>
        </div>
        <div className="bg-gray-50 rounded p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <p className="text-xs text-gray-600">Value</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{player.value.toFixed(1)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm mb-4">
        <div>
          <p className="text-gray-600">Goals</p>
          <p className="font-semibold text-gray-900">{player.goals}</p>
        </div>
        <div>
          <p className="text-gray-600">Assists</p>
          <p className="font-semibold text-gray-900">{player.assists}</p>
        </div>
        <div>
          <p className="text-gray-600">Form</p>
          <p className="font-semibold text-gray-900">{player.form.toFixed(1)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-500" />
          <p className="text-xs text-gray-600">{player.selectedBy.toFixed(1)}% selected</p>
        </div>
        <div className="flex items-center gap-1">
          {transferTrend >= 0 ? (
            <TrendingUp className="w-4 h-4 text-green-600" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-600" />
          )}
          <p className={`text-xs font-semibold ${transferTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {transferTrend >= 0 ? '+' : ''}{transferTrend.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

