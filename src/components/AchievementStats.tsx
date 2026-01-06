import React, { useState, useEffect } from "react";
import { fetchAchievementStats, type AchievementData } from "@/lib/fpl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AchievementStatsProps {
  leagueId: string;
}

const AchievementStats: React.FC<AchievementStatsProps> = ({ leagueId }) => {
  const [stats, setStats] = useState<AchievementData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAchievementStats(leagueId);
        setStats(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [leagueId]);

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/10">
        <CardContent className="pt-6">
          <p className="text-destructive text-sm font-medium">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="border-border/50">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Achievement Stats</CardTitle>
        <CardDescription>Statistik dan pencapaian liga</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Most Manager of the Week (Top 3 Finishes) */}
          {stats.mostManagerOfWeek && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🏆</span>
                <span className="text-sm font-medium text-muted-foreground">
                  Most Manager of the Week
                </span>
              </div>
              <p className="font-semibold">
                {stats.mostManagerOfWeek.teamName}
              </p>
              <p className="text-xs text-muted-foreground">
                {stats.mostManagerOfWeek.manager}
              </p>
              <p className="text-xl font-bold text-green-500 mt-1">
                {stats.mostManagerOfWeek.count}x
              </p>
            </div>
          )}

          {/* Most Loser of the Week (Bottom 3 Finishes) */}
          {stats.mostLoserOfWeek && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🚮</span>
                <span className="text-sm font-medium text-muted-foreground">
                  Penghuni Setia Piyungan
                </span>
              </div>
              <p className="font-semibold">{stats.mostLoserOfWeek.teamName}</p>
              <p className="text-xs text-muted-foreground">
                {stats.mostLoserOfWeek.manager}
              </p>
              <p className="text-xl font-bold text-red-500 mt-1">
                {stats.mostLoserOfWeek.count}x
              </p>
            </div>
          )}

          {/* Most Valuable Squad */}
          {stats.mostValuableSquad && (
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">💰</span>
                <span className="text-sm font-medium text-muted-foreground">
                  Squad Termahal
                </span>
              </div>
              <p className="font-semibold">
                {stats.mostValuableSquad.teamName}
              </p>
              <p className="text-xs text-muted-foreground">
                {stats.mostValuableSquad.manager}
              </p>
              <p className="text-xl font-bold text-yellow-500 mt-1">
                £{stats.mostValuableSquad.value.toFixed(1)}m
              </p>
            </div>
          )}

          {/* Highest Single GW */}
          {stats.highestSingleGw && (
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🚀</span>
                <span className="text-sm font-medium text-muted-foreground">
                  Highest GW Score
                </span>
              </div>
              <p className="font-semibold">{stats.highestSingleGw.teamName}</p>
              <p className="text-xs text-muted-foreground">
                {stats.highestSingleGw.manager} - GW
                {stats.highestSingleGw.gameweek}
              </p>
              <p className="text-xl font-bold text-blue-500 mt-1">
                {stats.highestSingleGw.points} pts
              </p>
            </div>
          )}

          {/* Lowest Single GW */}
          {stats.lowestSingleGw && (
            <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">💀</span>
                <span className="text-sm font-medium text-muted-foreground">
                  Lowest GW Score
                </span>
              </div>
              <p className="font-semibold">{stats.lowestSingleGw.teamName}</p>
              <p className="text-xs text-muted-foreground">
                {stats.lowestSingleGw.manager} - GW
                {stats.lowestSingleGw.gameweek}
              </p>
              <p className="text-xl font-bold text-orange-500 mt-1">
                {stats.lowestSingleGw.points} pts
              </p>
            </div>
          )}

          {/* === NEW: Biggest Bench Regret === */}
          {stats.highestBenchPoints && (
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🪑</span>
                <span className="text-sm font-medium text-muted-foreground">
                  Point Tertinggi di Bench
                </span>
              </div>
              <p className="font-semibold">
                {stats.highestBenchPoints.teamName}
              </p>
              <p className="text-xs text-muted-foreground">
                {stats.highestBenchPoints.manager} - GW
                {stats.highestBenchPoints.gameweek}
              </p>
              <p className="text-xl font-bold text-purple-500 mt-1">
                {stats.highestBenchPoints.points} pts
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AchievementStats;
