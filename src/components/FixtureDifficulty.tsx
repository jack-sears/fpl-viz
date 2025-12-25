import React from 'react';
import type { FixtureDifficulty } from '../services/fixtureDifficultyService';
import { Home, MapPin } from 'lucide-react';

interface FixtureDifficultyProps {
  fixtures: FixtureDifficulty[];
  playerPosition?: string; // Optional, for backward compatibility
}

export const FixtureDifficultyComponent: React.FC<FixtureDifficultyProps> = ({ 
  fixtures, 
  playerPosition 
}) => {
  const getDifficultyColor = (difficulty: number): string => {
    if (difficulty <= 1.5) return 'bg-green-100 text-green-800 border-green-300';
    if (difficulty <= 2.5) return 'bg-lime-100 text-lime-800 border-lime-300';
    if (difficulty <= 3.5) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (difficulty <= 4.5) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getDifficultyLabel = (difficulty: number): string => {
    if (difficulty <= 1.5) return 'Very Easy';
    if (difficulty <= 2.5) return 'Easy';
    if (difficulty <= 3.5) return 'Medium';
    if (difficulty <= 4.5) return 'Hard';
    return 'Very Hard';
  };

  const getRelevantDifficulty = (fixture: FixtureDifficulty): number => {
    // For attackers (FWD, MID), show attack difficulty
    // For defenders/GK, show defense difficulty
    // If no position specified (team view), show average of both
    if (!playerPosition) {
      return (fixture.attackDifficulty + fixture.defenseDifficulty) / 2;
    }
    if (playerPosition === 'FWD' || playerPosition === 'MID') {
      return fixture.attackDifficulty;
    }
    return fixture.defenseDifficulty;
  };

  if (fixtures.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-500">No upcoming fixtures available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Upcoming Fixtures</h3>
        <p className="text-sm text-gray-600 mt-1">
          Difficulty ratings for next {fixtures.length} gameweek{fixtures.length !== 1 ? 's' : ''}
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                GW
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Opponent
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Venue
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Attack Diff
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Defense Diff
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                {playerPosition ? 'Your Rating' : 'Avg Rating'}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {fixtures.map((fixture, index) => {
              const relevantDiff = getRelevantDifficulty(fixture);
              return (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-gray-900">{fixture.gameweek}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">{fixture.opponentTeamName}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {fixture.isHome ? (
                      <div className="flex items-center justify-center gap-1 text-blue-600">
                        <Home className="w-4 h-4" />
                        <span className="text-xs font-medium">H</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span className="text-xs font-medium">A</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold ${getDifficultyColor(fixture.attackDifficulty)}`}>
                      <span>{fixture.attackDifficulty}</span>
                      <span className="text-xs opacity-75">/ 5</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold ${getDifficultyColor(fixture.defenseDifficulty)}`}>
                      <span>{fixture.defenseDifficulty}</span>
                      <span className="text-xs opacity-75">/ 5</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className={`inline-flex flex-col items-center px-3 py-1 rounded-full border text-xs font-semibold ${getDifficultyColor(relevantDiff)}`}>
                      <span>{relevantDiff}</span>
                      <span className="text-xs opacity-75">{getDifficultyLabel(relevantDiff)}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div>
            <span className="font-semibold">Note:</span> {playerPosition 
              ? 'Attack difficulty for forwards/midfielders, Defense difficulty for defenders/goalkeepers'
              : 'Average rating combines both attack and defense difficulty'}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-100 border border-green-300"></div>
              <span>Easy</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-yellow-100 border border-yellow-300"></div>
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-100 border border-red-300"></div>
              <span>Hard</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

