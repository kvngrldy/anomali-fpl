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
          {/* Responsive TabsList */}
          <TabsList className="inline-flex h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-1 sm:grid sm:grid-cols-4 sm:flex-nowrap sm:justify-center sm:bg-muted">
            <TabsTrigger
              value="standings"
              className="min-w-fit flex-1 sm:flex-initial data-[state=active]:bg-background"
            >
              Klasemen
            </TabsTrigger>
            <TabsTrigger
              value="weekly"
              className="min-w-fit flex-1 sm:flex-initial data-[state=active]:bg-background"
            >
              Manager of the Week
            </TabsTrigger>
            <TabsTrigger
              value="rank"
              className="min-w-fit flex-1 sm:flex-initial data-[state=active]:bg-background"
            >
              Rank Progression
            </TabsTrigger>
            <TabsTrigger
              value="achievements"
              className="min-w-fit flex-1 sm:flex-initial data-[state=active]:bg-background"
            >
              Achievements
            </TabsTrigger>
          </TabsList>

          {/* Content */}
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
