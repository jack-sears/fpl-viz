import React from 'react';
import type { Player, PlayerStats } from '../types/fpl';
import { PlayerStatsChart } from './PlayerStatsChart';
import { X, TrendingUp, Target, DollarSign, Award } from 'lucide-react';

interface PlayerDetailPageProps {
  player: Player;
  stats: PlayerStats;
  onClose: () => void;
}

export const PlayerDetailPage: React.FC<PlayerDetailPageProps> = ({ player, stats, onClose }) => {

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'GK': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'DEF': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'MID': return 'bg-green-100 text-green-800 border-green-200';
      case 'FWD': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const transferTrend = player.transfersIn - player.transfersOut;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 pb-6 border-b border-gray-200">
        <div className="flex items-start gap-4">
          {player.photo && (
            <img 
              src={`https://resources.premierleague.com/premierleague/photos/players/250x250/${player.photo}`}
              alt={player.name}
              className="w-20 h-20 rounded-lg object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-bold text-gray-900">{player.name}</h2>
              <span className={`px-3 py-1 rounded text-sm font-semibold border ${getPositionColor(player.position)}`}>
                {player.position}
              </span>
            </div>
            <p className="text-lg text-gray-600">{player.team}</p>
            <p className="text-sm text-gray-500 mt-1">@{player.webName}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Key Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-blue-600" />
            <p className="text-sm font-medium text-blue-900">Total Points</p>
          </div>
          <p className="text-3xl font-bold text-blue-900">{player.totalPoints}</p>
          {player.expectedPoints && (
            <p className="text-xs text-blue-700 mt-1">
              xP: {player.expectedPoints.toFixed(1)}
              {player.expectedPoints > player.totalPoints && (
                <span className="text-green-600 ml-1">+{(player.expectedPoints - player.totalPoints).toFixed(1)}</span>
              )}
            </p>
          )}
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <p className="text-sm font-medium text-green-900">Price & Value</p>
          </div>
          <p className="text-2xl font-bold text-green-900">£{player.price.toFixed(1)}m</p>
          <p className="text-sm text-green-700 mt-1">Value: {player.value.toFixed(1)} pts/£m</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <p className="text-sm font-medium text-purple-900">Form & PPG</p>
          </div>
          <p className="text-3xl font-bold text-purple-900">{player.form.toFixed(1)}</p>
          <p className="text-sm text-purple-700 mt-1">{player.pointsPerGame?.toFixed(1) || '-'} points per game</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-5 h-5 text-orange-600" />
            <p className="text-sm font-medium text-orange-900">Expected Stats</p>
          </div>
          <p className="text-2xl font-bold text-orange-900">
            {player.xGIPer90 ? player.xGIPer90.toFixed(2) : '-'}
          </p>
          <p className="text-xs text-orange-700 mt-1">
            xGI/90 • {player.xGPer90?.toFixed(2) || '-'} xG • {player.xAPer90?.toFixed(2) || '-'} xA
          </p>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600 mb-1">Goals</p>
          <p className="text-2xl font-bold text-gray-900">{player.goals}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600 mb-1">Assists</p>
          <p className="text-2xl font-bold text-gray-900">{player.assists}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600 mb-1">Clean Sheets</p>
          <p className="text-2xl font-bold text-gray-900">{player.cleanSheets}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-600 mb-1">Bonus Points</p>
          <p className="text-2xl font-bold text-gray-900">{player.bonusPoints}</p>
        </div>
      </div>

      {/* Advanced Stats */}
      {(player.ictIndex || player.influence || player.creativity || player.threat) && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">ICT Index</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">ICT Index</p>
              <p className="text-lg font-bold text-gray-900">{player.ictIndex?.toFixed(1) || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Influence</p>
              <p className="text-lg font-bold text-gray-900">{player.influence?.toFixed(1) || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Creativity</p>
              <p className="text-lg font-bold text-gray-900">{player.creativity?.toFixed(1) || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Threat</p>
              <p className="text-lg font-bold text-gray-900">{player.threat?.toFixed(1) || '-'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Selected By</p>
            <p className="text-lg font-semibold text-gray-900">{player.selectedBy.toFixed(1)}%</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Net Transfers</p>
            <div className="flex items-center gap-1">
              {transferTrend >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />
              )}
              <p className={`text-lg font-semibold ${transferTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {transferTrend >= 0 ? '+' : ''}{transferTrend.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="mt-6">
        <PlayerStatsChart stats={stats} />
      </div>

    </div>
  );
};

