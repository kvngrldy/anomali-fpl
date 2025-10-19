import React, { useState, useEffect } from "react";
import { fetchGameweekPerformances, type GameweekTopBottom } from "@/lib/fpl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ManagerOfWeekProps {
  leagueId: string;
}

const ManagerOfWeek: React.FC<ManagerOfWeekProps> = ({ leagueId }) => {
  const [gameweeks, setGameweeks] = useState<GameweekTopBottom[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadGameweeks = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchGameweekPerformances(leagueId);
        setGameweeks(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadGameweeks();
  }, [leagueId]);

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="border-border/50">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  {[...Array(3)].map((_, j) => (
                    <Skeleton key={j} className="h-20 w-full" />
                  ))}
                </div>
                <div className="space-y-3">
                  {[...Array(3)].map((_, j) => (
                    <Skeleton key={j} className="h-20 w-full" />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/10">
        <CardContent className="pt-6">
          <p className="text-destructive text-sm font-medium">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {gameweeks.map((gw) => (
        <Card key={gw.gameweek} className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Gameweek {gw.gameweek}
              {!gw.isFinished && (
                <span className="inline-flex items-center rounded-full bg-yellow-500/20 px-2.5 py-0.5 text-xs font-medium text-yellow-500 border border-yellow-500/30">
                  Ongoing
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {gw.isFinished
                ? "Top and bottom performers of the week"
                : "Gameweek in progress - results pending"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!gw.isFinished ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-6xl mb-4">⏳</div>
                <h3 className="text-lg font-semibold mb-2">
                  Gameweek in Progress
                </h3>
                <p className="text-muted-foreground text-sm max-w-md">
                  Sabar, gameweek ini belom selesai ya...
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Top 3 Managers */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-green-500 flex items-center gap-2">
                    <span className="text-lg">🏆</span>
                    Manager gacor
                  </h3>
                  {gw.top3.map((performance, index) => (
                    <div
                      key={performance.entryId}
                      className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-green-500/20 font-bold text-green-500 text-sm shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">
                              {performance.teamName}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {performance.managerName}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xl font-bold text-green-500">
                            {performance.points}
                          </p>
                          <p className="text-xs text-muted-foreground">pts</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom 3 Managers */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-red-500 flex items-center gap-2">
                    <span className="text-lg">🚮</span>
                    Manager Piyungan
                  </h3>
                  {gw.bottom3.map((performance, index) => (
                    <div
                      key={performance.entryId}
                      className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-red-500/20 font-bold text-red-500 text-sm shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">
                              {performance.teamName}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {performance.managerName}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xl font-bold text-red-500">
                            {performance.points}
                          </p>
                          <p className="text-xs text-muted-foreground">pts</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ManagerOfWeek;
