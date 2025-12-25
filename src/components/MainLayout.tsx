import React, { useState } from 'react';
import { PlayerExplorer } from './PlayerExplorer';
import { FixtureDifficultyPage } from './FixtureDifficultyPage';
import { BreakoutPlayersPage } from './BreakoutPlayersPage';
import { DownfallPlayersPage } from './DownfallPlayersPage';
import { ConsistentPlayersPage } from './ConsistentPlayersPage';
import { RecommendationsPage } from './RecommendationsPage';
import { MyTeamPage } from './MyTeamPage';

type Tab = 'myteam' | 'explorer' | 'fixtures' | 'breakout' | 'downfall' | 'consistent' | 'transfers';

export const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('myteam');

  const tabs: { id: Tab; label: string; color?: string }[] = [
    { id: 'myteam', label: 'My Team', color: 'text-primary-600' },
    { id: 'explorer', label: 'Players' },
    { id: 'fixtures', label: 'Fixtures' },
    { id: 'breakout', label: 'Breakout', color: 'text-orange-600' },
    { id: 'downfall', label: 'Downfall', color: 'text-red-600' },
    { id: 'consistent', label: 'Consistent', color: 'text-violet-600' },
    { id: 'transfers', label: 'Transfers', color: 'text-emerald-600' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Tab Navigation */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">FPL Analytics</h1>
              <p className="text-gray-600 mt-1 text-sm">Data-driven Fantasy Premier League insights</p>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="mt-6 flex gap-1 border-b border-gray-200 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 font-semibold text-sm transition-colors relative whitespace-nowrap ${
                  activeTab === tab.id
                    ? tab.color || 'text-primary-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${
                    tab.id === 'myteam' ? 'bg-primary-600' :
                    tab.id === 'breakout' ? 'bg-orange-500' :
                    tab.id === 'downfall' ? 'bg-red-500' :
                    tab.id === 'consistent' ? 'bg-violet-500' :
                    tab.id === 'transfers' ? 'bg-emerald-500' :
                    'bg-primary-600'
                  }`}></div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {activeTab === 'myteam' && <MyTeamPage />}
        {activeTab === 'explorer' && <PlayerExplorer />}
        {activeTab === 'fixtures' && <FixtureDifficultyPage />}
        {activeTab === 'breakout' && <BreakoutPlayersPage />}
        {activeTab === 'downfall' && <DownfallPlayersPage />}
        {activeTab === 'consistent' && <ConsistentPlayersPage />}
        {activeTab === 'transfers' && <RecommendationsPage />}
      </div>
    </div>
  );
};
