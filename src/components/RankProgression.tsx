import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Label,
} from "recharts";
import { fetchRankProgression, type ManagerRankHistory } from "@/lib/fpl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface RankProgressionProps {
  leagueId: string;
}

const COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7300",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#0088FE",
  "#a4de6c",
  "#d0ed57",
  "#ffc0cb",
  "#87ceeb",
];

const RankProgression: React.FC<RankProgressionProps> = ({ leagueId }) => {
  const [managers, setManagers] = useState<ManagerRankHistory[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedManagers, setSelectedManagers] = useState<Set<number>>(
    new Set(),
  );

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchRankProgression(leagueId);
        setManagers(data);
        // Select all managers by default
        setSelectedManagers(new Set(data.map((m) => m.entryId)));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [leagueId]);

  const toggleManager = (entryId: number) => {
    setSelectedManagers((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedManagers(new Set(managers.map((m) => m.entryId)));
  };

  const deselectAll = () => {
    setSelectedManagers(new Set());
  };

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/10">
        <CardContent className="pt-6">
          <p className="text-destructive text-sm font-medium">{error}</p>
        </CardContent>
      </Card>
    );
  }

  // Transform data for recharts
  const chartData = (() => {
    if (managers.length === 0) return [];

    const gameweeks = managers[0]?.history.map((h) => h.gameweek) || [];
    return gameweeks.map((gw) => {
      const point: Record<string, number> = { gameweek: gw };
      managers.forEach((manager) => {
        const gwData = manager.history.find((h) => h.gameweek === gw);
        if (gwData) {
          point[manager.teamName] = gwData.leaguePosition;
        }
      });
      return point;
    });
  })();

  // Get total number of managers for Y axis
  const totalManagers = managers.length;

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Rank Progression</CardTitle>
        <CardDescription>
          {loading
            ? "Loading data..."
            : "Overall rank progression over gameweeks"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-[400px] w-full" />
            <div className="flex flex-wrap gap-2">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-24" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Manager selection */}
            <div className="mb-4 space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="px-3 py-1 text-xs rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAll}
                  className="px-3 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 transition-colors"
                >
                  Deselect All
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {managers.map((manager, index) => (
                  <button
                    key={manager.entryId}
                    onClick={() => toggleManager(manager.entryId)}
                    className={`px-3 py-1.5 text-xs rounded-md border transition-all ${
                      selectedManagers.has(manager.entryId)
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted/50 opacity-50"
                    }`}
                    style={{
                      borderLeftColor: COLORS[index % COLORS.length],
                      borderLeftWidth: "3px",
                    }}
                  >
                    {manager.teamName}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart */}
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    dataKey="gameweek"
                    label={{
                      value: "Gameweek",
                      position: "bottom",
                      textAnchor: "start",
                    }}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />

                  <YAxis
                    reversed
                    label={{
                      value: "Rank",
                      angle: -90,
                      position: "insideLeft",
                      textAnchor: "middle",
                    }}
                    domain={[1, totalManagers]}
                    ticks={Array.from(
                      { length: totalManagers },
                      (_, i) => i + 1,
                    )}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    width={30}
                  />

                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `#${value}`,
                      name,
                    ]}
                    labelFormatter={(label) => `GW ${label}`}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend
                    align="left"
                    verticalAlign="bottom"
                    wrapperStyle={{ fontSize: "12px" }}
                  />

                  {managers.map((manager, index) =>
                    selectedManagers.has(manager.entryId) ? (
                      <Line
                        key={manager.entryId}
                        type="monotone"
                        dataKey={manager.teamName}
                        stroke={COLORS[index % COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 2 }}
                        activeDot={{ r: 4 }}
                      />
                    ) : null,
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default RankProgression;
