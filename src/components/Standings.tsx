import React, { useState, useEffect } from "react";
import { fetchLeagueStandings, type TeamData } from "@/lib/fpl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StandingsProps {
  leagueId: string;
}

const Standings: React.FC<StandingsProps> = ({ leagueId }) => {
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStandings = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchLeagueStandings(leagueId);
        setTeams(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadStandings();
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

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>League Standings</CardTitle>
        <CardDescription>
          {loading ? "Loading data..." : `${teams.length} teams`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-8 w-16 rounded-md" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Mobile/Tablet Card View */}
            <div className="block lg:hidden space-y-3">
              {teams.map((team, index) => (
                <div
                  key={team.rank}
                  className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 font-bold text-primary">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-semibold">{team.teamName}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {team.managerName}
                        </div>
                      </div>
                    </div>
                    <div>
                      <span className="inline-flex items-center justify-center rounded-md bg-secondary px-3 py-1.5 font-semibold text-sm">
                        {team.points}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm pt-3 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        Points This Week
                      </span>
                      <span className="inline-flex items-center justify-center rounded-md bg-blue-500/10 text-blue-500 dark:bg-blue-400/10 dark:text-blue-400 px-2 py-1 font-semibold">
                        {team.latestGwPoints}
                      </span>
                    </div>
                    {team.latestGwTransfers &&
                      team.latestGwTransfers.length > 0 && (
                        <div className="space-y-1 pt-2">
                          {team.latestGwTransfers.map((transfer, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-red-500">
                                {transfer.playerOut}
                              </span>
                              <span className="text-muted-foreground">→</span>
                              <span className="text-green-500">
                                {transfer.playerIn}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Rank
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Team Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Transfers This Week
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">
                      Points This Week
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">
                      Total Points
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {teams.map((team, index) => (
                    <tr
                      key={team.rank}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 font-bold text-primary">
                          {index + 1}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium">{team.teamName}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {team.managerName}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {team.latestGwTransfers &&
                        team.latestGwTransfers.length > 0 ? (
                          <div className="space-y-1 text-sm">
                            {team.latestGwTransfers.map((transfer, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2"
                              >
                                <span className="text-red-500">
                                  {transfer.playerOut}
                                </span>
                                <span className="text-muted-foreground">→</span>
                                <span className="text-green-500">
                                  {transfer.playerIn}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            No transfers
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="inline-flex items-center justify-center rounded-md bg-blue-500/10 text-blue-500 dark:bg-blue-400/10 dark:text-blue-400 px-3 py-1.5 font-semibold">
                          {team.latestGwPoints}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="inline-flex items-center justify-center rounded-md bg-secondary px-3 py-1.5 font-semibold">
                          {team.points}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default Standings;
