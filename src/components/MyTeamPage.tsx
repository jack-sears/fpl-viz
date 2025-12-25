import React, { useState, useEffect, useMemo } from 'react';
import { myTeamService, type MyTeam, type MyTeamPick } from '../services/myTeamService';
import type { Player } from '../types/fpl';
import { 
  Users,
  Search,
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Save,
  Info,
  Loader2,
  Crown,
  Star,
  Wallet,
  Trophy,
  BarChart3,
  LayoutGrid,
  Table,
  RotateCcw,
  Check,
  X,
  ArrowUpDown,
  UserMinus,
  AlertTriangle,
  Plus,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// Transfer type
interface PlannedTransfer {
  playerOut: MyTeamPick;
  playerIn: Player;
};

// Valid FPL formations: DEF-MID-FWD
const VALID_FORMATIONS = [
  [5, 2, 3], // 5-2-3
  [5, 3, 2], // 5-3-2
  [5, 4, 1], // 5-4-1
  [4, 3, 3], // 4-3-3
  [4, 4, 2], // 4-4-2
  [4, 5, 1], // 4-5-1
  [3, 5, 2], // 3-5-2
  [3, 4, 3], // 3-4-3
];

// Check if a formation is valid
const isValidFormation = (def: number, mid: number, fwd: number): boolean => {
  return VALID_FORMATIONS.some(([d, m, f]) => d === def && m === mid && f === fwd);
};

// Get formation string
const getFormationString = (starters: MyTeamPick[]): string => {
  const def = starters.filter(p => p.player.position === 'DEF').length;
  const mid = starters.filter(p => p.player.position === 'MID').length;
  const fwd = starters.filter(p => p.player.position === 'FWD').length;
  return `${def}-${mid}-${fwd}`;
};

// Check if swapping two players would result in a valid formation
const canSwap = (starters: MyTeamPick[], bench: MyTeamPick[], starterIdx: number, benchIdx: number): boolean => {
  const starter = starters[starterIdx];
  const benchPlayer = bench[benchIdx];
  
  // GKP can only swap with GKP
  if (starter.player.position === 'GKP' || benchPlayer.player.position === 'GKP') {
    return starter.player.position === benchPlayer.player.position;
  }
  
  // For outfield players, check if resulting formation is valid
  const newStarters = [...starters];
  newStarters[starterIdx] = { ...benchPlayer, isStarter: true };
  
  const def = newStarters.filter(p => p.player.position === 'DEF').length;
  const mid = newStarters.filter(p => p.player.position === 'MID').length;
  const fwd = newStarters.filter(p => p.player.position === 'FWD').length;
  
  return isValidFormation(def, mid, fwd);
};

// Position color helper
const getPositionColor = (position: string) => {
  switch (position) {
    case 'GKP': return 'from-yellow-400 to-yellow-500';
    case 'DEF': return 'from-blue-400 to-blue-500';
    case 'MID': return 'from-green-400 to-green-500';
    case 'FWD': return 'from-red-400 to-red-500';
    default: return 'from-gray-400 to-gray-500';
  }
};

const getPositionBadgeColor = (position: string) => {
  switch (position) {
    case 'GKP': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'DEF': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'MID': return 'bg-green-100 text-green-800 border-green-300';
    case 'FWD': return 'bg-red-100 text-red-800 border-red-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

// Fixture difficulty color
const getDifficultyColor = (difficulty: number) => {
  switch (difficulty) {
    case 1: return 'bg-emerald-500';
    case 2: return 'bg-green-500';
    case 3: return 'bg-yellow-500';
    case 4: return 'bg-orange-500';
    case 5: return 'bg-red-500';
    default: return 'bg-gray-400';
  }
};

const getDifficultyBadgeColor = (difficulty: number) => {
  switch (difficulty) {
    case 1: return 'bg-emerald-100 text-emerald-800';
    case 2: return 'bg-green-100 text-green-700';
    case 3: return 'bg-gray-100 text-gray-700';
    case 4: return 'bg-orange-100 text-orange-700';
    case 5: return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-600';
  }
};

// Player card on the pitch (with substitution support)
interface PitchPlayerProps {
  pick: MyTeamPick;
  showFixtures?: boolean;
  isSelected?: boolean;
  isValidTarget?: boolean;
  canBeSelected?: boolean;
  onClick?: () => void;
  fixtureIndex?: number; // Which fixture to show (0 = next, 1 = +1 week, etc.)
}

const PitchPlayer: React.FC<PitchPlayerProps> = ({ 
  pick, 
  showFixtures = true, 
  isSelected = false,
  isValidTarget = false,
  canBeSelected = true,
  onClick,
  fixtureIndex = 0
}) => {
  const { player, isCaptain, isViceCaptain, nextFixtures } = pick;
  const nextFixture = nextFixtures[fixtureIndex];
  
  return (
    <div 
      className={`flex flex-col items-center group transition-all duration-200 ${
        onClick && canBeSelected ? 'cursor-pointer' : ''
      } ${isSelected ? 'scale-110 z-10' : 'hover:scale-105'}`}
      onClick={canBeSelected ? onClick : undefined}
    >
      {/* Player shirt/badge - shows next fixture */}
      <div className={`relative w-16 h-16 md:w-18 md:h-18 rounded-xl bg-gradient-to-br ${getPositionColor(player.position)} shadow-xl flex flex-col items-center justify-center text-white border-2 ${
        isSelected 
          ? 'border-yellow-400 ring-4 ring-yellow-400/50' 
          : isValidTarget 
            ? 'border-emerald-400 ring-4 ring-emerald-400/50 animate-pulse' 
            : 'border-white/50'
      }`}>
        {/* Next fixture */}
        {nextFixture ? (
          <>
            <div className="text-xs md:text-sm font-bold leading-none uppercase">{nextFixture.opponentShort}</div>
            <div className="text-[10px] opacity-90">({nextFixture.isHome ? 'H' : 'A'})</div>
          </>
        ) : (
          <div className="text-xs opacity-80">-</div>
        )}
        
        {/* Captain badge */}
        {isCaptain && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
            <Crown className="w-3.5 h-3.5 text-yellow-900" />
          </div>
        )}
        {isViceCaptain && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-gray-200 to-gray-400 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
            <Star className="w-3.5 h-3.5 text-gray-700" />
          </div>
        )}
        
        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
            <Check className="w-3 h-3 text-yellow-900" />
          </div>
        )}
        {isValidTarget && (
          <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-emerald-400 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
            <ArrowUpDown className="w-3 h-3 text-emerald-900" />
          </div>
        )}
      </div>
      
      {/* Player name */}
      <div className={`mt-1.5 px-2 py-1 text-white text-xs font-semibold rounded-md truncate max-w-[85px] md:max-w-[100px] text-center shadow-lg backdrop-blur-sm ${
        isSelected ? 'bg-yellow-600' : isValidTarget ? 'bg-emerald-600' : 'bg-black/85'
      }`}>
        {player.webName || player.name.split(' ').pop()}
      </div>
      
      {/* Price */}
      <div className="text-[10px] text-white/80 font-medium mt-0.5">
        £{player.price.toFixed(1)}m
      </div>
      
      {/* Fixture difficulty dots for next 3 games */}
      {showFixtures && nextFixtures.length > 0 && (
        <div className="flex gap-1 mt-1">
          {nextFixtures.slice(0, 3).map((fix, i) => (
            <div 
              key={i}
              className={`w-2.5 h-2.5 rounded-full ${getDifficultyColor(fix.difficulty)} shadow-sm`}
              title={`GW${fix.gameweek}: ${fix.opponent} (${fix.isHome ? 'H' : 'A'})`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Bench player card (with substitution support)
interface BenchPlayerProps {
  pick: MyTeamPick;
  index: number;
  isSelected?: boolean;
  isValidTarget?: boolean;
  onClick?: () => void;
  fixtureIndex?: number;
}

const BenchPlayer: React.FC<BenchPlayerProps> = ({ 
  pick, 
  index, 
  isSelected = false,
  isValidTarget = false,
  onClick,
  fixtureIndex = 0
}) => {
  const { player, nextFixtures } = pick;
  const nextFixture = nextFixtures[fixtureIndex];
  
  return (
    <div 
      className={`rounded-lg p-3 flex flex-col items-center transition-all duration-200 cursor-pointer ${
        isSelected 
          ? 'bg-yellow-500/30 ring-2 ring-yellow-400' 
          : isValidTarget 
            ? 'bg-emerald-500/30 ring-2 ring-emerald-400 animate-pulse' 
            : 'bg-white/10 hover:bg-white/20'
      }`}
      onClick={onClick}
    >
      <div className="text-[10px] text-white/50 font-medium mb-1.5">SUB {index + 1}</div>
      <div className={`w-11 h-11 rounded-lg bg-gradient-to-br ${getPositionColor(player.position)} shadow-md flex flex-col items-center justify-center text-white border ${
        isSelected ? 'border-yellow-400' : isValidTarget ? 'border-emerald-400' : 'border-white/40'
      }`}>
        {/* Next fixture */}
        {nextFixture ? (
          <>
            <div className="text-[10px] font-bold leading-none uppercase">{nextFixture.opponentShort}</div>
            <div className="text-[8px] opacity-90">({nextFixture.isHome ? 'H' : 'A'})</div>
          </>
        ) : (
          <div className="text-xs opacity-80">-</div>
        )}
      </div>
      <div className={`mt-1.5 text-xs font-semibold truncate max-w-[75px] text-center ${
        isSelected ? 'text-yellow-300' : isValidTarget ? 'text-emerald-300' : 'text-white'
      }`}>
        {player.webName || player.name.split(' ').pop()}
      </div>
      <div className="text-white/50 text-[10px] mt-0.5">
        £{player.price.toFixed(1)}m
      </div>
      {nextFixtures.length > 0 && (
        <div className="flex gap-1 mt-1.5">
          {nextFixtures.slice(0, 3).map((fix, i) => (
            <div 
              key={i}
              className={`w-2 h-2 rounded-full ${getDifficultyColor(fix.difficulty)}`}
              title={`GW${fix.gameweek}: ${fix.opponent} (${fix.isHome ? 'H' : 'A'})`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Football pitch component with substitution support
interface FootballPitchProps {
  starters: MyTeamPick[];
  bench: MyTeamPick[];
  selectedPlayer: { type: 'starter' | 'bench'; index: number } | null;
  validTargets: number[];
  onStarterClick: (index: number) => void;
  onBenchClick: (index: number) => void;
  hasChanges: boolean;
  onReset: () => void;
  fixtureIndex?: number;
}

const FootballPitch: React.FC<FootballPitchProps> = ({ 
  starters, 
  bench, 
  selectedPlayer,
  validTargets,
  onStarterClick,
  onBenchClick,
  hasChanges,
  onReset,
  fixtureIndex = 0
}) => {
  
  // Group starters by position
  const goalkeepers = starters.filter(p => p.player.position === 'GKP');
  const defenders = starters.filter(p => p.player.position === 'DEF');
  const midfielders = starters.filter(p => p.player.position === 'MID');
  const forwards = starters.filter(p => p.player.position === 'FWD');

  // Get index in original starters array
  const getStarterIndex = (player: MyTeamPick) => starters.findIndex(s => s.player.id === player.player.id);

  const formation = getFormationString(starters);

  return (
    <div className="relative">
      {/* Formation & Reset Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-700">Formation:</span>
          <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-bold">
            {formation}
          </span>
        </div>
        {hasChanges && (
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        )}
      </div>

      {/* Substitution Instructions */}
      {selectedPlayer && (
        <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800 text-sm">
            <ArrowUpDown className="w-4 h-4" />
            <span>
              {selectedPlayer.type === 'starter' 
                ? 'Select a bench player to swap with' 
                : 'Select a starting player to swap with'}
            </span>
            <span className="text-yellow-600">(highlighted in green)</span>
          </div>
        </div>
      )}

      {/* Pitch */}
      <div className="relative bg-gradient-to-b from-emerald-700 via-emerald-600 to-emerald-700 rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20">
        {/* Pitch markings */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Center circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 md:w-36 md:h-36 border-2 border-white/25 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white/25 rounded-full" />
          
          {/* Center line */}
          <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-white/25" />
          
          {/* Top penalty area */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-52 md:w-72 h-20 md:h-24 border-2 border-white/25 border-t-0 rounded-b-lg" />
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 md:w-36 h-10 md:h-12 border-2 border-white/25 border-t-0 rounded-b-lg" />
          
          {/* Bottom penalty area */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-52 md:w-72 h-20 md:h-24 border-2 border-white/25 border-b-0 rounded-t-lg" />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-28 md:w-36 h-10 md:h-12 border-2 border-white/25 border-b-0 rounded-t-lg" />
          
          {/* Corner arcs */}
          <div className="absolute top-3 left-3 w-8 h-8 border-r-2 border-b-2 border-white/25 rounded-br-full" />
          <div className="absolute top-3 right-3 w-8 h-8 border-l-2 border-b-2 border-white/25 rounded-bl-full" />
          <div className="absolute bottom-3 left-3 w-8 h-8 border-r-2 border-t-2 border-white/25 rounded-tr-full" />
          <div className="absolute bottom-3 right-3 w-8 h-8 border-l-2 border-t-2 border-white/25 rounded-tl-full" />
          
          {/* Pitch stripes */}
          <div className="absolute inset-0 flex flex-col">
            {[...Array(10)].map((_, i) => (
              <div key={i} className={`flex-1 ${i % 2 === 0 ? 'bg-black/5' : ''}`} />
            ))}
          </div>
        </div>
        
        {/* Players container */}
        <div className="relative z-10 pt-8 pb-6 px-4 md:px-8">
          {/* Forwards */}
          {forwards.length > 0 && (
            <div className="flex justify-center gap-6 md:gap-10 mb-6">
              {forwards.map(pick => {
                const idx = getStarterIndex(pick);
                const isSelected = selectedPlayer?.type === 'starter' && selectedPlayer.index === idx;
                const isValidTarget = selectedPlayer?.type === 'bench' && validTargets.includes(idx);
                return (
                  <PitchPlayer 
                    key={pick.player.id} 
                    pick={pick} 
                    isSelected={isSelected}
                    isValidTarget={isValidTarget}
                    onClick={() => onStarterClick(idx)}
                    fixtureIndex={fixtureIndex}
                  />
                );
              })}
            </div>
          )}
          
          {/* Midfielders */}
          {midfielders.length > 0 && (
            <div className="flex justify-center gap-4 md:gap-6 mb-6">
              {midfielders.map(pick => {
                const idx = getStarterIndex(pick);
                const isSelected = selectedPlayer?.type === 'starter' && selectedPlayer.index === idx;
                const isValidTarget = selectedPlayer?.type === 'bench' && validTargets.includes(idx);
                return (
                  <PitchPlayer 
                    key={pick.player.id} 
                    pick={pick}
                    isSelected={isSelected}
                    isValidTarget={isValidTarget}
                    onClick={() => onStarterClick(idx)}
                    fixtureIndex={fixtureIndex}
                  />
                );
              })}
            </div>
          )}
          
          {/* Defenders */}
          {defenders.length > 0 && (
            <div className="flex justify-center gap-4 md:gap-6 mb-6">
              {defenders.map(pick => {
                const idx = getStarterIndex(pick);
                const isSelected = selectedPlayer?.type === 'starter' && selectedPlayer.index === idx;
                const isValidTarget = selectedPlayer?.type === 'bench' && validTargets.includes(idx);
                return (
                  <PitchPlayer 
                    key={pick.player.id} 
                    pick={pick}
                    isSelected={isSelected}
                    isValidTarget={isValidTarget}
                    onClick={() => onStarterClick(idx)}
                    fixtureIndex={fixtureIndex}
                  />
                );
              })}
            </div>
          )}
          
          {/* Goalkeeper */}
          {goalkeepers.length > 0 && (
            <div className="flex justify-center mt-4">
              {goalkeepers.map(pick => {
                const idx = getStarterIndex(pick);
                const isSelected = selectedPlayer?.type === 'starter' && selectedPlayer.index === idx;
                const isValidTarget = selectedPlayer?.type === 'bench' && validTargets.includes(idx);
                return (
                  <PitchPlayer 
                    key={pick.player.id} 
                    pick={pick}
                    isSelected={isSelected}
                    isValidTarget={isValidTarget}
                    onClick={() => onStarterClick(idx)}
                    fixtureIndex={fixtureIndex}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Bench */}
      <div className="mt-4 bg-gradient-to-r from-gray-700 to-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-white/60 text-xs font-medium uppercase tracking-wider">Substitutes</div>
          <div className="text-white/40 text-xs">Click to swap</div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {bench.map((pick, index) => {
            const isSelected = selectedPlayer?.type === 'bench' && selectedPlayer.index === index;
            const isValidTarget = selectedPlayer?.type === 'starter' && validTargets.includes(index);
            return (
              <BenchPlayer 
                key={pick.player.id} 
                pick={pick} 
                index={index}
                isSelected={isSelected}
                isValidTarget={isValidTarget}
                onClick={() => onBenchClick(index)}
                fixtureIndex={fixtureIndex}
              />
            );
          })}
        </div>
      </div>
      
      {/* Fixture difficulty legend */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500">
        <span className="font-medium">Fixture Difficulty:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>Easy</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Hard</span>
        </div>
      </div>
    </div>
  );
};

// Table view component
const TableView: React.FC<{ starters: MyTeamPick[]; bench: MyTeamPick[] }> = ({ starters, bench }) => {
  return (
    <>
      {/* Starting XI */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-200">
          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Starting XI
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Player</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Price</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Pts</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Form</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Next 3 Fixtures
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {starters.map((pick) => (
                <TableRow key={pick.player.id} pick={pick} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Bench */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <h4 className="font-semibold text-gray-700 mb-3 text-sm">Bench</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {bench.map((pick) => (
              <TableBenchCard key={pick.player.id} pick={pick} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

// Table row for list view
const TableRow: React.FC<{ pick: MyTeamPick }> = ({ pick }) => {
  const { player, isCaptain, isViceCaptain, nextFixtures } = pick;

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span className={`px-2 py-1 rounded text-xs font-bold border ${getPositionBadgeColor(player.position)}`}>
            {player.position}
          </span>
          <div>
            <div className="font-semibold text-gray-900 flex items-center gap-1.5">
              {player.webName || player.name}
              {isCaptain && <Crown className="w-4 h-4 text-yellow-500" />}
              {isViceCaptain && <Star className="w-4 h-4 text-gray-400" />}
            </div>
            <div className="text-xs text-gray-500">{player.team}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-center font-medium text-gray-700">
        £{player.price.toFixed(1)}m
      </td>
      <td className="px-4 py-3 text-center font-bold text-gray-900">
        {player.totalPoints}
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-flex items-center gap-1 ${
          player.form >= 6 ? 'text-green-600' : 
          player.form >= 4 ? 'text-gray-600' : 'text-red-600'
        }`}>
          {player.form >= 6 ? <TrendingUp className="w-3 h-3" /> : 
           player.form < 4 ? <TrendingDown className="w-3 h-3" /> : null}
          {player.form.toFixed(1)}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          {nextFixtures.length > 0 ? (
            nextFixtures.map((fix, i) => (
              <span 
                key={i}
                className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyBadgeColor(fix.difficulty)}`}
              >
                {fix.opponentShort} ({fix.isHome ? 'H' : 'A'})
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-xs">No fixtures</span>
          )}
        </div>
      </td>
    </tr>
  );
};

// Bench card for list view
const TableBenchCard: React.FC<{ pick: MyTeamPick }> = ({ pick }) => {
  const { player, nextFixtures } = pick;

  return (
    <div className="bg-white rounded-lg p-3 border border-gray-200">
      <div className="flex items-center gap-2 mb-1">
        <span className={`px-1.5 py-0.5 rounded text-xs font-bold border ${getPositionBadgeColor(player.position)}`}>
          {player.position}
        </span>
        <span className="font-medium text-gray-900 text-sm truncate">
          {player.webName || player.name}
        </span>
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>{player.team}</span>
        <span>£{player.price.toFixed(1)}m</span>
      </div>
      <div className="mt-2 flex gap-1">
        {nextFixtures.slice(0, 2).map((fix, i) => (
          <span 
            key={i}
            className={`px-1.5 py-0.5 rounded text-xs ${getDifficultyBadgeColor(fix.difficulty)}`}
          >
            {fix.opponentShort}
          </span>
        ))}
      </div>
    </div>
  );
};

export const MyTeamPage: React.FC = () => {
  const [teamId, setTeamId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [team, setTeam] = useState<MyTeam | null>(null);
  const [viewMode, setViewMode] = useState<'pitch' | 'table'>('pitch');
  
  // Substitution state
  const [starters, setStarters] = useState<MyTeamPick[]>([]);
  const [bench, setBench] = useState<MyTeamPick[]>([]);
  const [originalStarters, setOriginalStarters] = useState<MyTeamPick[]>([]);
  const [originalBench, setOriginalBench] = useState<MyTeamPick[]>([]);
  const [initialStarters, setInitialStarters] = useState<MyTeamPick[]>([]); // Truly original (before any transfers)
  const [initialBench, setInitialBench] = useState<MyTeamPick[]>([]); // Truly original (before any transfers)
  const [initialBank, setInitialBank] = useState<number>(0); // Original bank balance
  const [selectedPlayer, setSelectedPlayer] = useState<{ type: 'starter' | 'bench'; index: number } | null>(null);
  
  // Transfer state
  const [plannedTransfers, setPlannedTransfers] = useState<PlannedTransfer[]>([]);
  const [transferOutPlayer, setTransferOutPlayer] = useState<MyTeamPick | null>(null);
  const [replacementOptions, setReplacementOptions] = useState<Player[]>([]);
  const [loadingReplacements, setLoadingReplacements] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Player action modal state
  const [clickedPlayer, setClickedPlayer] = useState<{ pick: MyTeamPick; type: 'starter' | 'bench'; index: number } | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  
  // Gameweek navigation state
  const [selectedGameweek, setSelectedGameweek] = useState<number>(0); // 0 = current GW, offset from current

  // Calculate if there are substitution changes
  const hasSubChanges = useMemo(() => {
    if (!originalStarters.length || !starters.length) return false;
    return !starters.every((s, i) => s.player.id === originalStarters[i].player.id);
  }, [starters, originalStarters]);

  // Check if current team differs from initial (before any confirmed transfers)
  const hasConfirmedTransfers = useMemo(() => {
    if (initialStarters.length === 0) return false;
    
    // Check if any starter is different from initial
    for (let i = 0; i < starters.length; i++) {
      if (!initialStarters[i]) return true;
      if (starters[i].player.id !== initialStarters[i].player.id) return true;
    }
    
    // Check if any bench player is different from initial
    for (let i = 0; i < bench.length; i++) {
      if (!initialBench[i]) return true;
      if (bench[i].player.id !== initialBench[i].player.id) return true;
    }
    
    return false;
  }, [starters, bench, initialStarters, initialBench]);

  // Calculate if there are any changes (subs, planned transfers, or confirmed transfers)
  const hasChanges = useMemo(() => {
    return hasSubChanges || plannedTransfers.length > 0 || hasConfirmedTransfers;
  }, [hasSubChanges, plannedTransfers, hasConfirmedTransfers]);

  // Calculate valid swap targets
  const validTargets = useMemo(() => {
    if (!selectedPlayer) return [];
    
    const targets: number[] = [];
    
    if (selectedPlayer.type === 'starter') {
      // Find valid bench players to swap with
      bench.forEach((_, benchIdx) => {
        if (canSwap(starters, bench, selectedPlayer.index, benchIdx)) {
          targets.push(benchIdx);
        }
      });
    } else {
      // Find valid starters to swap with
      starters.forEach((_, starterIdx) => {
        if (canSwap(starters, bench, starterIdx, selectedPlayer.index)) {
          targets.push(starterIdx);
        }
      });
    }
    
    return targets;
  }, [selectedPlayer, starters, bench]);

  // Calculate current transfer budget (for display while selecting)
  const transferBudget = useMemo(() => {
    if (!team) return 0;
    
    // Start with bank balance
    let budget = team.info.bank;
    
    // Add back the selling price of players being transferred out
    // Subtract the buying price of players being transferred in
    plannedTransfers.forEach(t => {
      budget += t.playerOut.player.price; // Selling price (simplified - actual FPL uses purchase price)
      budget -= t.playerIn.price;
    });
    
    // If we're currently selecting a player to transfer out, add their price
    if (transferOutPlayer) {
      budget += transferOutPlayer.player.price;
    }
    
    return budget;
  }, [team, plannedTransfers, transferOutPlayer]);

  // Calculate final budget after ALL planned transfers (for validation)
  const finalBudget = useMemo(() => {
    if (!team) return 0;
    
    let budget = team.info.bank;
    plannedTransfers.forEach(t => {
      budget += t.playerOut.player.price;
      budget -= t.playerIn.price;
    });
    
    return budget;
  }, [team, plannedTransfers]);

  // Check if transfers are valid (positive budget)

  // Calculate transfer cost (points hit)
  const transferCost = useMemo(() => {
    if (!team) return 0;
    const freeTransfers = team.info.transfersAvailable;
    const extraTransfers = Math.max(0, plannedTransfers.length - freeTransfers);
    return extraTransfers * 4;
  }, [team, plannedTransfers]);

  // Get current team player IDs (including planned transfers)
  const currentTeamPlayerIds = useMemo(() => {
    const ids = new Set([...starters, ...bench].map(p => p.player.id));
    
    // Remove players being transferred out
    plannedTransfers.forEach(t => ids.delete(t.playerOut.player.id));
    
    // Add players being transferred in
    plannedTransfers.forEach(t => ids.add(t.playerIn.id));
    
    return Array.from(ids);
  }, [starters, bench, plannedTransfers]);

  // Try to load cached team on mount
  useEffect(() => {
    const savedTeamId = localStorage.getItem('fpl_team_id');
    if (savedTeamId) {
      setTeamId(savedTeamId);
      loadTeam(savedTeamId);
    }
  }, []);

  // Sync starters/bench when team changes
  useEffect(() => {
    if (team) {
      setStarters([...team.starters]);
      setBench([...team.bench]);
      setOriginalStarters([...team.starters]);
      setOriginalBench([...team.bench]);
      setSelectedPlayer(null);
      
      // Only set initial values if they haven't been set yet (first load)
      if (initialStarters.length === 0) {
        setInitialStarters([...team.starters]);
        setInitialBench([...team.bench]);
        setInitialBank(team.info.bank);
      }
    }
  }, [team]);

  const loadTeam = async (id: string) => {
    if (!id.trim()) return;
    
    const numericId = parseInt(id.trim());
    if (isNaN(numericId)) {
      setError('Please enter a valid numeric Team ID');
      return;
    }

    setLoading(true);
    setError(null);
    
    // Reset initial values when loading a new team
    setInitialStarters([]);
    setInitialBench([]);
    setInitialBank(0);
    setPlannedTransfers([]);

    try {
      const teamData = await myTeamService.getTeam(numericId);
      setTeam(teamData);
      localStorage.setItem('fpl_team_id', id.trim());
    } catch (err: any) {
      setError(err.message || 'Failed to load team');
      setTeam(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadTeam = () => {
    loadTeam(teamId);
  };

  const handleStarterClick = (index: number) => {
    const pick = starters[index];
    
    // If we're in sub selection mode
    if (selectedPlayer) {
      if (selectedPlayer.type === 'starter') {
        if (selectedPlayer.index === index) {
          // Deselect
          setSelectedPlayer(null);
        } else {
          // Select different starter
          setSelectedPlayer({ type: 'starter', index });
        }
      } else {
        // Bench player is selected, try to swap
        if (validTargets.includes(index)) {
          performSwap(index, selectedPlayer.index);
        }
        setSelectedPlayer(null);
      }
      return;
    }
    
    // Not in sub mode - show action modal
    handlePlayerClick(pick, 'starter', index);
  };

  const handleBenchClick = (index: number) => {
    const pick = bench[index];
    
    // If we're in sub selection mode
    if (selectedPlayer) {
      if (selectedPlayer.type === 'bench') {
        if (selectedPlayer.index === index) {
          // Deselect
          setSelectedPlayer(null);
        } else {
          // Select different bench player
          setSelectedPlayer({ type: 'bench', index });
        }
      } else {
        // Starter is selected, try to swap
        if (validTargets.includes(index)) {
          performSwap(selectedPlayer.index, index);
        }
        setSelectedPlayer(null);
      }
      return;
    }
    
    // Not in sub mode - show action modal
    handlePlayerClick(pick, 'bench', index);
  };

  const performSwap = (starterIdx: number, benchIdx: number) => {
    const newStarters = [...starters];
    const newBench = [...bench];
    
    // Swap the players
    const temp = newStarters[starterIdx];
    newStarters[starterIdx] = { ...newBench[benchIdx], isStarter: true };
    newBench[benchIdx] = { ...temp, isStarter: false };
    
    setStarters(newStarters);
    setBench(newBench);
  };

  const handleReset = () => {
    setStarters([...originalStarters]);
    setBench([...originalBench]);
    setSelectedPlayer(null);
  };

  // Global reset - resets to the truly original team (before any transfers)
  const handleResetAll = () => {
    setStarters([...initialStarters]);
    setBench([...initialBench]);
    setOriginalStarters([...initialStarters]);
    setOriginalBench([...initialBench]);
    setSelectedPlayer(null);
    setPlannedTransfers([]);
    setTransferOutPlayer(null);
    setReplacementOptions([]);
    setSearchQuery('');
    setClickedPlayer(null);
    setShowTransferModal(false);
    
    // Reset team state including bank balance
    if (team) {
      setTeam({
        ...team,
        info: {
          ...team.info,
          bank: initialBank,
        },
        starters: [...initialStarters],
        bench: [...initialBench],
        picks: [...initialStarters, ...initialBench],
      });
    }
  };

  // Player click handler - shows action modal
  const handlePlayerClick = (pick: MyTeamPick, type: 'starter' | 'bench', index: number) => {
    // Check if this player is already being transferred out
    if (plannedTransfers.some(t => t.playerOut.player.id === pick.player.id)) {
      return; // Can't click players that are already being transferred
    }
    setClickedPlayer({ pick, type, index });
  };

  // Handle choosing "Sub" action
  const handleChooseSub = () => {
    if (!clickedPlayer) return;
    setSelectedPlayer({ type: clickedPlayer.type, index: clickedPlayer.index });
    setClickedPlayer(null);
  };

  // Handle choosing "Transfer" action
  const handleChooseTransfer = async () => {
    if (!clickedPlayer) return;
    setTransferOutPlayer(clickedPlayer.pick);
    setShowTransferModal(true);
    setClickedPlayer(null);
    setSearchQuery('');
    setLoadingReplacements(true);
    
    try {
      // Get ALL players for this position (we'll filter by budget in UI)
      const allPlayers = await myTeamService.getAllPlayers();
      const positionPlayers = allPlayers
        .filter(p => 
          p.position === clickedPlayer.pick.player.position &&
          !currentTeamPlayerIds.includes(p.id)
        )
        .sort((a, b) => b.form - a.form);
      setReplacementOptions(positionPlayers);
    } catch (err) {
      console.error('Failed to get replacement options:', err);
      setReplacementOptions([]);
    } finally {
      setLoadingReplacements(false);
    }
  };

  // Close player action modal
  const handleCloseActionModal = () => {
    setClickedPlayer(null);
  };

  // Transfer functions - immediately show the new player in the team
  const handleConfirmTransfer = async (playerIn: Player) => {
    if (!transferOutPlayer) return;
    
    const playerOutId = transferOutPlayer.player.id;
    
    // Add to planned transfers for tracking
    setPlannedTransfers(prev => [
      ...prev,
      { playerOut: transferOutPlayer, playerIn }
    ]);
    
    // Fetch fixtures for the new player
    let newFixtures: MyTeamPick['nextFixtures'] = [];
    try {
      newFixtures = await myTeamService.getPlayerFixtures(playerIn.teamId, 5);
    } catch (error) {
      console.error('Failed to fetch fixtures:', error);
    }
    
    // Immediately update the lineup with the new player
    const updatePick = (pick: MyTeamPick): MyTeamPick => {
      if (pick.player.id === playerOutId) {
        return {
          ...pick,
          player: playerIn,
          nextFixtures: newFixtures,
        };
      }
      return pick;
    };
    
    setStarters(prev => prev.map(updatePick));
    setBench(prev => prev.map(updatePick));
    
    // Clear any previous error
    setConfirmError(null);
    
    // Clear transfer selection
    setTransferOutPlayer(null);
    setReplacementOptions([]);
    setSearchQuery('');
    setShowTransferModal(false);
  };

  // Confirm all transfers (final validation and save)
  const handleConfirmAllTransfers = () => {
    if (plannedTransfers.length === 0) return;
    
    if (finalBudget < 0) {
      setConfirmError(`Not enough budget! You're £${Math.abs(finalBudget).toFixed(1)}m over.`);
      return;
    }
    
    console.log('✅ Confirming transfers:', plannedTransfers.length);
    
    // Players are already in the lineup - just need to finalize
    // Update team state with new bank balance
    if (team) {
      setTeam({
        ...team,
        info: {
          ...team.info,
          bank: finalBudget,
        },
        starters: [...starters],
        bench: [...bench],
        picks: [...starters, ...bench],
      });
    }
    
    // Save current state as the new "initial" state (so reset goes back to this)
    setInitialStarters([...starters]);
    setInitialBench([...bench]);
    setInitialBank(finalBudget);
    
    // Also update originalStarters/Bench for sub tracking
    setOriginalStarters([...starters]);
    setOriginalBench([...bench]);
    
    // Clear error and planned transfers
    setConfirmError(null);
    setPlannedTransfers([]);
    
    console.log(`✅ ${plannedTransfers.length} transfer(s) confirmed and saved!`);
  };

  const handleCancelTransferOut = () => {
    setTransferOutPlayer(null);
    setReplacementOptions([]);
    setSearchQuery('');
    setShowTransferModal(false);
  };

  /*const handleRemoveTransfer = (index: number) => {
    const transfer = plannedTransfers[index];
    if (!transfer) return;
    
    const playerOutId = transfer.playerIn.id; // The player currently in the team (transferred in)
    const originalPlayer = transfer.playerOut; // The original player to restore
    
    // Restore the original player in the lineup
    const restorePick = (pick: MyTeamPick): MyTeamPick => {
      if (pick.player.id === playerOutId) {
        return {
          ...originalPlayer,
        };
      }
      return pick;
    };
    
    setStarters(prev => prev.map(restorePick));
    setBench(prev => prev.map(restorePick));
    
    // Remove from planned transfers
    setPlannedTransfers(prev => prev.filter((_, i) => i !== index));
    setConfirmError(null);
  };
  */

  // Filter replacement options by search query
  const filteredReplacements = useMemo(() => {
    if (!searchQuery.trim()) return replacementOptions;
    const query = searchQuery.toLowerCase();
    return replacementOptions.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.webName?.toLowerCase().includes(query) ||
      p.team.toLowerCase().includes(query)
    );
  }, [replacementOptions, searchQuery]);

  const formatRank = (rank: number) => {
    if (rank >= 1000000) return `${(rank / 1000000).toFixed(1)}M`;
    if (rank >= 1000) return `${(rank / 1000).toFixed(0)}K`;
    return rank.toLocaleString();
  };

  return (
    <div className="py-8">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Users className="w-7 h-7 text-primary-600" />
          My Team
        </h2>
        <p className="text-gray-600">
          Enter your FPL team ID to view your squad. Click players to make substitutions.
        </p>
      </div>

      {/* Team ID Input */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              FPL Team ID
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Enter your team ID (e.g., 1234567)"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLoadTeam()}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
              />
            </div>
          </div>
          <button
            onClick={handleLoadTeam}
            disabled={loading || !teamId.trim()}
            className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Load Team
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
          <p className="font-semibold">Error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Info Box */}
      {!team && !loading && !error && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-blue-800">
              <p className="font-semibold mb-2">How to find your Team ID</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Go to the official FPL website and log in</li>
                <li>Click on "Points" or "Pick Team"</li>
                <li>Look at the URL: <code className="bg-blue-100 px-1 rounded">fantasy.premierleague.com/entry/<strong>1234567</strong>/event/...</code></li>
                <li>The number after "/entry/" is your Team ID</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Team Display */}
      {team && starters.length > 0 && (
        <>
          {/* Team Header */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold">{team.info.teamName}</h3>
                <p className="text-primary-100 text-sm">{team.info.managerName}</p>
              </div>
              <div className="flex flex-wrap gap-4 md:gap-6">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-300" />
                  <div>
                    <div className="text-lg font-bold">{team.info.totalPoints.toLocaleString()}</div>
                    <div className="text-primary-200 text-xs">Total Pts</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary-200" />
                  <div>
                    <div className="text-lg font-bold">{formatRank(team.info.overallRank)}</div>
                    <div className="text-primary-200 text-xs">Overall Rank</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-300" />
                  <div>
                    <div className="text-lg font-bold">{team.info.gameweekPoints}</div>
                    <div className="text-primary-200 text-xs">GW{team.info.currentGameweek}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-green-300" />
                  <div>
                    <div className="text-lg font-bold">£{team.info.bank.toFixed(1)}m</div>
                    <div className="text-primary-200 text-xs">Bank</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Gameweek Navigation */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-5 h-5" />
                <span className="font-medium">Viewing Fixtures</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedGameweek(Math.max(0, selectedGameweek - 1))}
                  disabled={selectedGameweek === 0}
                  className={`p-2 rounded-lg transition-colors ${
                    selectedGameweek === 0 
                      ? 'text-gray-300 cursor-not-allowed' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3, 4].map(offset => (
                    <button
                      key={offset}
                      onClick={() => setSelectedGameweek(offset)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        selectedGameweek === offset
                          ? 'bg-primary-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      GW{team.info.currentGameweek + offset}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setSelectedGameweek(Math.min(4, selectedGameweek + 1))}
                  disabled={selectedGameweek === 4}
                  className={`p-2 rounded-lg transition-colors ${
                    selectedGameweek === 4 
                      ? 'text-gray-300 cursor-not-allowed' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="text-sm">
                {selectedGameweek === 0 ? (
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">Next fixture</span>
                ) : (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">+{selectedGameweek} week{selectedGameweek > 1 ? 's' : ''}</span>
                )}
              </div>
            </div>
          </div>

          {/* Changes indicator */}
          {hasChanges && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-amber-800">
                  <ArrowRightLeft className="w-5 h-5" />
                  <div className="flex items-center gap-3">
                    {hasSubChanges && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                        Subs made
                      </span>
                    )}
                    {plannedTransfers.length > 0 && (
                      <>
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-sm font-medium animate-pulse">
                          {plannedTransfers.length} Transfer{plannedTransfers.length > 1 ? 's' : ''} pending
                        </span>
                        <span className={`px-2 py-1 rounded text-sm font-medium ${finalBudget >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {finalBudget >= 0 ? `£${finalBudget.toFixed(1)}m left` : `£${Math.abs(finalBudget).toFixed(1)}m over`}
                        </span>
                        {transferCost > 0 && (
                          <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-sm font-medium">
                            -{transferCost} pts
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {plannedTransfers.length > 0 && (
                    <button
                      onClick={handleConfirmAllTransfers}
                      className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-colors shadow-sm ${
                        finalBudget >= 0 
                          ? 'text-white bg-green-500 hover:bg-green-600' 
                          : 'text-red-700 bg-red-100 hover:bg-red-200'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      {finalBudget >= 0 ? 'Confirm' : 'Over Budget!'}
                    </button>
                  )}
                  <button
                    onClick={handleResetAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 hover:text-red-900 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
              {confirmError && (
                <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-sm">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{confirmError}</span>
                </div>
              )}
            </div>
          )}

          {/* Player Action Modal */}
          {clickedPlayer && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleCloseActionModal}>
              <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
                <div className="text-center mb-6">
                  <div className={`w-16 h-16 mx-auto rounded-xl bg-gradient-to-br ${getPositionColor(clickedPlayer.pick.player.position)} flex items-center justify-center text-white font-bold text-lg mb-3`}>
                    {clickedPlayer.pick.player.position}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{clickedPlayer.pick.player.webName}</h3>
                  <p className="text-gray-500">{clickedPlayer.pick.player.team} • £{clickedPlayer.pick.player.price.toFixed(1)}m</p>
                </div>
                
                <div className="space-y-3">
                  <button
                    onClick={handleChooseTransfer}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
                  >
                    <UserMinus className="w-5 h-5" />
                    Transfer Out
                  </button>
                  <button
                    onClick={handleChooseSub}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
                  >
                    <ArrowUpDown className="w-5 h-5" />
                    Substitute
                  </button>
                  <button
                    onClick={handleCloseActionModal}
                    className="w-full px-4 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Transfer Modal */}
          {showTransferModal && transferOutPlayer && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleCancelTransferOut}>
              <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-gray-900">Select Replacement</h3>
                    <button onClick={handleCancelTransferOut} className="p-2 hover:bg-gray-200 rounded-lg">
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                  
                  {/* Transferring out info */}
                  <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                    <UserMinus className="w-5 h-5 text-red-600" />
                    <div className="flex-1">
                      <span className="text-sm text-red-700">Transferring out: </span>
                      <span className="font-semibold text-red-900">{transferOutPlayer.player.webName}</span>
                      <span className="text-red-700"> (£{transferOutPlayer.player.price.toFixed(1)}m)</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-green-700">Budget:</div>
                      <div className="font-bold text-green-900">£{transferBudget.toFixed(1)}m</div>
                    </div>
                  </div>
                  
                  {/* Search */}
                  <div className="mt-3 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search by name or team..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      autoFocus
                    />
                  </div>
                </div>
                
                {/* Player List */}
                <div className="flex-1 overflow-y-auto p-4">
                  {loadingReplacements ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                    </div>
                  ) : filteredReplacements.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      No players found
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredReplacements.map((player) => {
                        const canAfford = player.price <= transferBudget;
                        return (
                          <button
                            key={player.id}
                            onClick={() => handleConfirmTransfer(player)}
                            className={`w-full p-3 border rounded-lg transition-colors text-left flex items-center gap-3 ${
                              canAfford 
                                ? 'bg-white hover:bg-green-50 border-gray-200 hover:border-green-300' 
                                : 'bg-white hover:bg-red-50 border-gray-200 hover:border-red-300'
                            }`}
                          >
                            <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getPositionColor(player.position)} flex flex-col items-center justify-center text-white`}>
                              <div className="text-sm font-bold">{player.form.toFixed(1)}</div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-900">{player.webName}</div>
                              <div className="text-sm text-gray-500">{player.team}</div>
                            </div>
                            <div className="text-right">
                              <div className={`font-bold ${canAfford ? 'text-gray-900' : 'text-red-600'}`}>
                                £{player.price.toFixed(1)}m
                              </div>
                              <div className="text-xs text-gray-500">{player.totalPoints} pts</div>
                            </div>
                            {canAfford ? (
                              <Plus className="w-5 h-5 text-green-500 flex-shrink-0" />
                            ) : (
                              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* View Toggle */}
          <div className="flex justify-end mb-4">
            <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-white">
              <button
                onClick={() => setViewMode('pitch')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'pitch'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Pitch View
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Table className="w-4 h-4" />
                List View
              </button>
            </div>
          </div>

          {/* Team View */}
          {viewMode === 'pitch' ? (
            <FootballPitch 
              starters={starters}
              bench={bench}
              selectedPlayer={selectedPlayer}
              validTargets={validTargets}
              onStarterClick={handleStarterClick}
              onBenchClick={handleBenchClick}
              hasChanges={hasChanges}
              onReset={handleReset}
              fixtureIndex={selectedGameweek}
            />
          ) : (
            <TableView starters={starters} bench={bench} />
          )}

          {/* Team Value Summary */}
          <div className="bg-white rounded-lg shadow-md p-4 mt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-900">£{team.info.teamValue.toFixed(1)}m</div>
                <div className="text-sm text-gray-500">Team Value</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">£{team.info.bank.toFixed(1)}m</div>
                <div className="text-sm text-gray-500">In Bank</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">£{(team.info.teamValue + team.info.bank).toFixed(1)}m</div>
                <div className="text-sm text-gray-500">Total Budget</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary-600">GW{team.info.currentGameweek}</div>
                <div className="text-sm text-gray-500">Current Gameweek</div>
              </div>
            </div>
          </div>

          {/* Valid Formations Reference */}
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-primary-600" />
              Valid Formations
            </h4>
            <div className="flex flex-wrap gap-2">
              {VALID_FORMATIONS.map(([d, m, f]) => (
                <span 
                  key={`${d}-${m}-${f}`}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                    getFormationString(starters) === `${d}-${m}-${f}`
                      ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-500'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {d}-{m}-{f}
                </span>
              ))}
            </div>
          </div>

        </>
      )}
    </div>
  );
};
