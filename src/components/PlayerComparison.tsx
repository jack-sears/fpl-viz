import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Player } from '../types/fpl';

interface PlayerComparisonProps {
  players: Player[];
}

export const PlayerComparison: React.FC<PlayerComparisonProps> = ({ players }) => {
  const comparisonData = players.map(player => ({
    name: player.name.split(' ').pop() || player.name,
    points: player.totalPoints,
    goals: player.goals,
    assists: player.assists,
    value: player.value,
  }));

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Player Comparison</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={comparisonData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="points" fill="#0ea5e9" name="Total Points" />
          <Bar dataKey="goals" fill="#10b981" name="Goals" />
          <Bar dataKey="assists" fill="#f59e0b" name="Assists" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

