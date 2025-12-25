import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { PlayerStats } from '../types/fpl';

interface PlayerStatsChartProps {
  stats: PlayerStats;
}

export const PlayerStatsChart: React.FC<PlayerStatsChartProps> = ({ stats }) => {
  const [selectedSeries, setSelectedSeries] = useState<string[]>([
    'points',
    'goals',
    'assists',
    'expectedGoals',
    'expectedAssists',
    'expectedGoalInvolvements',
  ]);

  const chartData = stats.gameweeks.map(gw => ({
    gameweek: `GW${gw.gameweek}`,
    points: gw.points,
    goals: gw.goals,
    assists: gw.assists,
    expectedGoals: gw.expectedGoals,
    expectedAssists: gw.expectedAssists,
    expectedGoalInvolvements: gw.expectedGoalInvolvements,
  }));

  const seriesConfig: {
    key: string;
    label: string;
    color: string;
    axis: 'left' | 'right';
  }[] = [
    { key: 'points', label: 'Points', color: '#0ea5e9', axis: 'left' },
    { key: 'goals', label: 'Goals', color: '#10b981', axis: 'left' },
    { key: 'assists', label: 'Assists', color: '#f59e0b', axis: 'left' },
    { key: 'expectedGoals', label: 'xG', color: '#6366f1', axis: 'right' },
    { key: 'expectedAssists', label: 'xA', color: '#ec4899', axis: 'right' },
    { key: 'expectedGoalInvolvements', label: 'xGI', color: '#14b8a6', axis: 'right' },
  ];

  const toggleSeries = (key: string) => {
    setSelectedSeries(prev =>
      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key],
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col gap-4 mb-4">
        <h3 className="text-xl font-bold text-gray-900">
          {stats.player.name} - Season Performance
        </h3>
        <div className="flex flex-wrap gap-3 text-sm">
          {seriesConfig.map(series => (
            <label key={series.key} className="inline-flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                checked={selectedSeries.includes(series.key)}
                onChange={() => toggleSeries(series.key)}
              />
              <span className="text-gray-700">{series.label}</span>
            </label>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="gameweek" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Legend />
          {seriesConfig
            .filter(series => selectedSeries.includes(series.key))
            .map(series => (
              <Line
                key={series.key}
                type="monotone"
                dataKey={series.key}
                stroke={series.color}
                strokeWidth={2}
                name={series.label}
                dot={false}
                yAxisId={series.axis}
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

