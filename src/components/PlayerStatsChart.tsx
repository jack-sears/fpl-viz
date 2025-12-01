import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { PlayerStats } from '../types/fpl';

interface PlayerStatsChartProps {
  stats: PlayerStats;
}

export const PlayerStatsChart: React.FC<PlayerStatsChartProps> = ({ stats }) => {
  const chartData = stats.gameweeks.map(gw => ({
    gameweek: `GW${gw.gameweek}`,
    points: gw.points,
    goals: gw.goals,
    assists: gw.assists,
  }));

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">
        {stats.player.name} - Season Performance
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="gameweek" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="points" stroke="#0ea5e9" strokeWidth={2} name="Points" />
          <Line type="monotone" dataKey="goals" stroke="#10b981" strokeWidth={2} name="Goals" />
          <Line type="monotone" dataKey="assists" stroke="#f59e0b" strokeWidth={2} name="Assists" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

