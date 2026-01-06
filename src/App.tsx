// src/App.tsx

import React from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Standings from "@/components/Standings";
import ManagerOfWeek from "@/components/ManagerOfWeek";
import RankProgression from "@/components/RankProgression";
import AchievementStats from "@/components/AchievementStats";

const App: React.FC = () => {
  const leagueId = "1594760";

  return (
    <div className="flex flex-col items-center p-6 bg-background min-h-screen">
      <div className="w-full max-w-6xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">FPL Anomali</h1>
        </div>

        <Tabs defaultValue="standings" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="standings">Klasemen</TabsTrigger>
            <TabsTrigger value="weekly">Manager of the Week</TabsTrigger>
            <TabsTrigger value="rank">Rank Progression</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
          </TabsList>

          <TabsContent value="standings" className="mt-6">
            <Standings leagueId={leagueId} />
          </TabsContent>

          <TabsContent value="weekly" className="mt-6">
            <ManagerOfWeek leagueId={leagueId} />
          </TabsContent>

          <TabsContent value="rank" className="mt-6">
            <RankProgression leagueId={leagueId} />
          </TabsContent>

          <TabsContent value="achievements" className="mt-6">
            <AchievementStats leagueId={leagueId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default App;
