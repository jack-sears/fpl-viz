import React, { useState, useEffect, useMemo } from 'react';
import { fixtureDifficultyService, type FixtureDifficulty } from '../services/fixtureDifficultyService';
import { dataService } from '../services/dataService';
import { Search, Loader2, Eye, EyeOff, Home, MapPin, ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react';

interface Team {
  id: number;
  name: string;
  shortName: string;
}

interface TeamFixtures {
  team: Team;
  fixtures: FixtureDifficulty[];
  loading: boolean;
}

export const FixtureDifficultyPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamFixtures, setTeamFixtures] = useState<Map<number, TeamFixtures>>(new Map());
  const [hiddenTeams, setHiddenTeams] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [maxFixtures, setMaxFixtures] = useState(5);
  const [sortBy, setSortBy] = useState<'none' | 'attack' | 'defense'>('none');

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    if (teams.length > 0) {
      const timer = setTimeout(async () => {
        try {
          console.log('🔄 Pre-calculating team strengths...');
          await fixtureDifficultyService.calculateTeamStrengths();
          console.log('✅ Team strengths ready, loading fixtures...');
          await loadAllTeamFixtures();
        } catch (error) {
          console.error('Failed to load team fixtures:', error);
          setError('Failed to load fixture difficulty data. Please try again later.');
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [teams.length, maxFixtures]);

  const loadTeams = async () => {
    try {
      setLoading(true);
      setError(null);
      const teamsData = await dataService.getTeams();
      setTeams(teamsData);
    } catch (error) {
      console.error('Failed to load teams:', error);
      setError('Failed to load teams. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadAllTeamFixtures = async () => {
    try {
      const fixturesMap = new Map<number, TeamFixtures>();
      
      teams.forEach(team => {
        fixturesMap.set(team.id, {
          team,
          fixtures: [],
          loading: true,
        });
      });
      setTeamFixtures(fixturesMap);

      const batchSize = 3;
      for (let i = 0; i < teams.length; i += batchSize) {
        const batch = teams.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(async (team) => {
            try {
              const fixtures = await fixtureDifficultyService.getTeamUpcomingFixtures(team.id, maxFixtures);
              fixturesMap.set(team.id, {
                team,
                fixtures,
                loading: false,
              });
              setTeamFixtures(new Map(fixturesMap));
            } catch (error) {
              console.error(`Failed to load fixtures for team ${team.id}:`, error);
              fixturesMap.set(team.id, {
                team,
                fixtures: [],
                loading: false,
              });
              setTeamFixtures(new Map(fixturesMap));
            }
          })
        );
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Error in loadAllTeamFixtures:', error);
      setError('Failed to load fixture difficulty.');
    }
  };

  const toggleTeamVisibility = (teamId: number) => {
    const newHidden = new Set(hiddenTeams);
    if (newHidden.has(teamId)) {
      newHidden.delete(teamId);
    } else {
      newHidden.add(teamId);
    }
    setHiddenTeams(newHidden);
  };

  // Calculate average difficulties for each team
  const teamAverages = useMemo(() => {
    const averages = new Map<number, { attack: number; defense: number }>();
    
    teamFixtures.forEach(({ team, fixtures }) => {
      const nextFixtures = fixtures.slice(0, maxFixtures);
      if (nextFixtures.length === 0) {
        averages.set(team.id, { attack: 0, defense: 0 });
        return;
      }
      
      const avgAttack = nextFixtures.reduce((sum, f) => sum + f.attackDifficulty, 0) / nextFixtures.length;
      const avgDefense = nextFixtures.reduce((sum, f) => sum + f.defenseDifficulty, 0) / nextFixtures.length;
      
      averages.set(team.id, { attack: avgAttack, defense: avgDefense });
    });
    
    return averages;
  }, [teamFixtures, maxFixtures]);

  const filteredAndSortedTeams = useMemo(() => {
    let filtered = teams.filter(team => {
      const matchesSearch = 
        team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.shortName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch && !hiddenTeams.has(team.id);
    });

    // Sort by selected criteria
    if (sortBy === 'attack') {
      filtered = [...filtered].sort((a, b) => {
        const avgA = teamAverages.get(a.id)?.attack || 0;
        const avgB = teamAverages.get(b.id)?.attack || 0;
        return avgA - avgB; // Lower is easier (better rank)
      });
    } else if (sortBy === 'defense') {
      filtered = [...filtered].sort((a, b) => {
        const avgA = teamAverages.get(a.id)?.defense || 0;
        const avgB = teamAverages.get(b.id)?.defense || 0;
        return avgA - avgB; // Lower is easier (better rank)
      });
    }

    return filtered;
  }, [teams, searchTerm, hiddenTeams, sortBy, teamAverages]);

  const getDifficultyColor = (difficulty: number): string => {
    if (difficulty <= 1.5) return 'bg-green-100 text-green-800 border-green-300';
    if (difficulty <= 2.5) return 'bg-lime-100 text-lime-800 border-lime-300';
    if (difficulty <= 3.5) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (difficulty <= 4.5) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const allGameweeks = useMemo(() => {
    const gameweeks = new Set<number>();
    teamFixtures.forEach(({ fixtures }) => {
      fixtures.forEach(f => gameweeks.add(f.gameweek));
    });
    return Array.from(gameweeks).sort((a, b) => a - b).slice(0, maxFixtures);
  }, [teamFixtures, maxFixtures]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading teams and fixtures...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Fixture Difficulty Ratings</h2>
        <p className="text-gray-600">
          View all teams' upcoming fixture difficulty ratings. Based on xG/xGA data from Understat.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
          <p className="font-semibold">Error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search teams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <label className="text-sm text-gray-700">
              Show fixtures:
              <select
                value={maxFixtures}
                onChange={(e) => {
                  setMaxFixtures(Number(e.target.value));
                }}
                className="ml-2 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={8}>8</option>
                <option value={10}>10</option>
              </select>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Rank by:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setSortBy('none')}
                  className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                    sortBy === 'none'
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                  title="No ranking"
                >
                  <ArrowUpDown className="w-4 h-4 inline mr-1" />
                  None
                </button>
                <button
                  onClick={() => setSortBy('attack')}
                  className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                    sortBy === 'attack'
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                  title="Rank by average attack difficulty (lower = easier)"
                >
                  <TrendingUp className="w-4 h-4 inline mr-1" />
                  Attack
                </button>
                <button
                  onClick={() => setSortBy('defense')}
                  className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                    sortBy === 'defense'
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                  title="Rank by average defense difficulty (lower = easier)"
                >
                  <TrendingDown className="w-4 h-4 inline mr-1" />
                  Defense
                </button>
              </div>
            </div>
            <button
              onClick={() => setHiddenTeams(new Set())}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Show All
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider sticky left-0 bg-gray-50 z-20">
                  {sortBy !== 'none' && <span className="mr-2">Rank</span>}
                  Team
                </th>
                {allGameweeks.map(gw => (
                  <th key={gw} className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[100px]">
                    GW {gw}
                  </th>
                ))}
                {(sortBy === 'attack' || sortBy === 'defense') && (
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Avg {sortBy === 'attack' ? 'Attack' : 'Defense'}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedTeams.map((team, index) => {
                const teamData = teamFixtures.get(team.id);
                const fixtures = teamData?.fixtures || [];
                const isLoading = teamData?.loading || false;

                return (
                  <tr key={team.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-white z-10">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleTeamVisibility(team.id)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          title={hiddenTeams.has(team.id) ? 'Show team' : 'Hide team'}
                        >
                          {hiddenTeams.has(team.id) ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                        {sortBy !== 'none' && (
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold text-sm">
                            {index + 1}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{team.name}</div>
                          <div className="text-xs text-gray-500">{team.shortName}</div>
                        </div>
                      </div>
                    </td>
                    {allGameweeks.map(gw => {
                      const fixture = fixtures.find(f => f.gameweek === gw);
                      
                      if (isLoading) {
                        return (
                          <td key={gw} className="px-3 py-3 text-center">
                            <Loader2 className="animate-spin h-4 w-4 text-gray-400 mx-auto" />
                          </td>
                        );
                      }

                      if (!fixture) {
                        return (
                          <td key={gw} className="px-3 py-3 text-center">
                            <span className="text-xs text-gray-400">-</span>
                          </td>
                        );
                      }

                      const avgDifficulty = Math.round((fixture.attackDifficulty + fixture.defenseDifficulty) / 2);
                      
                      return (
                        <td key={gw} className="px-3 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border ${getDifficultyColor(avgDifficulty)}`}>
                              <span>{avgDifficulty}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              {fixture.isHome ? (
                                <Home className="w-3 h-3 text-blue-600" />
                              ) : (
                                <MapPin className="w-3 h-3 text-gray-500" />
                              )}
                              <span className="text-xs">{fixture.opponentTeamName.split(' ').pop()}</span>
                            </div>
                            <div className="flex gap-1 text-xs">
                              <span className={`px-1 rounded ${getDifficultyColor(fixture.attackDifficulty)}`}>
                                A:{fixture.attackDifficulty}
                              </span>
                              <span className={`px-1 rounded ${getDifficultyColor(fixture.defenseDifficulty)}`}>
                                D:{fixture.defenseDifficulty}
                              </span>
                            </div>
                          </div>
                        </td>
                      );
                    })}
                    {(sortBy === 'attack' || sortBy === 'defense') && (
                      <td className="px-3 py-3 text-center">
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border bg-gray-50 text-gray-700 border-gray-300">
                          <span>
                            {teamAverages.get(team.id)?.[sortBy === 'attack' ? 'attack' : 'defense'].toFixed(2) || '-'}
                          </span>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredAndSortedTeams.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>No teams found matching your criteria.</p>
            {hiddenTeams.size > 0 && (
              <button
                onClick={() => setHiddenTeams(new Set())}
                className="mt-2 text-sm text-primary-600 hover:text-primary-700"
              >
                Show all teams
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
          <div className="font-semibold text-gray-700">Legend:</div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-100 border border-green-300"></div>
            <span>Very Easy (1-1.5)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-lime-100 border border-lime-300"></div>
            <span>Easy (1.5-2.5)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300"></div>
            <span>Medium (2.5-3.5)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-orange-100 border border-orange-300"></div>
            <span>Hard (3.5-4.5)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-100 border border-red-300"></div>
            <span>Very Hard (4.5-5)</span>
          </div>
          <div className="ml-4 flex items-center gap-2">
            <span className="font-semibold">A:</span> Attack Difficulty
            <span className="font-semibold ml-2">D:</span> Defense Difficulty
          </div>
        </div>
      </div>
    </div>
  );
};
