import React, { useState, useEffect } from "react";
import { fetchLeagueStandings, type TeamData } from "@/lib/fpl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-sm font-semibold">Rank</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Team Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Manager</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Points</th>
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
                    <td className="px-4 py-4 font-medium">{team.teamName}</td>
                    <td className="px-4 py-4 text-muted-foreground">{team.managerName}</td>
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
        )}
      </CardContent>
    </Card>
  );
};

export default Standings;
