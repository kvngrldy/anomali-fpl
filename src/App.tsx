// src/App.tsx

import React, { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Standings from "@/components/Standings";
import ManagerOfWeek from "@/components/ManagerOfWeek";

const App: React.FC = () => {
  const leagueId = "1594760";

  return (
    <div className="flex flex-col items-center p-6 bg-background min-h-screen">
      <div className="w-full max-w-6xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            FPL Anomali Leaderboard
          </h1>
        </div>

        <Tabs defaultValue="standings" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="standings">League Standings</TabsTrigger>
            <TabsTrigger value="weekly">Manager/Loser of the Week</TabsTrigger>
          </TabsList>

          <TabsContent value="standings" className="mt-6">
            <Standings leagueId={leagueId} />
          </TabsContent>

          <TabsContent value="weekly" className="mt-6">
            <ManagerOfWeek leagueId={leagueId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default App;
