import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Player } from '../types/fpl';

interface PlayerComparisonProps {
  players: Player[];
}

export const PlayerComparison: React.FC<PlayerComparisonProps> = ({ players }) => {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'points',
    'goals',
    'assists',
    'xGPer90',
    'xAPer90',
    'xGIPer90',
  ]);

  const comparisonData = players.map(player => ({
    name: player.name.split(' ').pop() || player.name,
    points: player.totalPoints,
    goals: player.goals,
    assists: player.assists,
    value: player.value,
    xGPer90: player.xGPer90,
    xAPer90: player.xAPer90,
    xGIPer90: player.xGIPer90,
  }));

  const metricConfig: {
    key: string;
    label: string;
    color: string;
    axis: 'left' | 'right';
  }[] = [
    { key: 'points', label: 'Total Points', color: '#0ea5e9', axis: 'left' },
    { key: 'goals', label: 'Goals', color: '#10b981', axis: 'left' },
    { key: 'assists', label: 'Assists', color: '#f59e0b', axis: 'left' },
    { key: 'xGPer90', label: 'xG per 90', color: '#6366f1', axis: 'right' },
    { key: 'xAPer90', label: 'xA per 90', color: '#ec4899', axis: 'right' },
    { key: 'xGIPer90', label: 'xGI per 90', color: '#14b8a6', axis: 'right' },
  ];

  const toggleMetric = (key: string) => {
    setSelectedMetrics(prev =>
      prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key],
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col gap-4 mb-4">
        <h3 className="text-xl font-bold text-gray-900">Player Comparison</h3>
        <div className="flex flex-wrap gap-3 text-sm">
          {metricConfig.map(metric => (
            <label key={metric.key} className="inline-flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                checked={selectedMetrics.includes(metric.key)}
                onChange={() => toggleMetric(metric.key)}
              />
              <span className="text-gray-700">{metric.label}</span>
            </label>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={comparisonData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Legend />
          {metricConfig
            .filter(metric => selectedMetrics.includes(metric.key))
            .map(metric => (
              <Bar
                key={metric.key}
                dataKey={metric.key}
                fill={metric.color}
                name={metric.label}
                yAxisId={metric.axis}
              />
            ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

