// lib/fpl.ts

// Cache utilities
interface CacheItem<T> {
  data: T;
  timestamp: number;
  gameweek: number;
}

const CACHE_KEY_PREFIX = "fpl_cache_";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Get current gameweek from cache or fetch
let currentGameweekCache: { gw: number; timestamp: number } | null = null;

const getCurrentGameweek = async (): Promise<number> => {
  const now = Date.now();

  // Return cached gameweek if still valid (5 minutes)
  if (
    currentGameweekCache &&
    now - currentGameweekCache.timestamp < CACHE_DURATION
  ) {
    return currentGameweekCache.gw;
  }

  const bootstrapResponse = await fetch(`/api/bootstrap-static/`);
  const bootstrapData = await bootstrapResponse.json();
  const currentGw = bootstrapData.events.find((event: any) => event.is_current);
  const gwNumber = currentGw?.id || 0;

  currentGameweekCache = { gw: gwNumber, timestamp: now };
  return gwNumber;
};

const getCacheKey = (key: string) => `${CACHE_KEY_PREFIX}${key}`;

const getFromCache = <T>(key: string, currentGw: number): T | null => {
  try {
    const cached = localStorage.getItem(getCacheKey(key));
    if (!cached) return null;

    const item: CacheItem<T> = JSON.parse(cached);
    const now = Date.now();

    // Cache is invalid if:
    // 1. It's from a different gameweek
    // 2. It's older than CACHE_DURATION
    if (item.gameweek !== currentGw || now - item.timestamp > CACHE_DURATION) {
      localStorage.removeItem(getCacheKey(key));
      return null;
    }

    return item.data;
  } catch (error) {
    console.error("Cache read error:", error);
    return null;
  }
};

const setToCache = <T>(key: string, data: T, currentGw: number): void => {
  try {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      gameweek: currentGw,
    };
    localStorage.setItem(getCacheKey(key), JSON.stringify(item));
  } catch (error) {
    console.error("Cache write error:", error);
  }
};

export interface Transfer {
  playerIn: string;
  playerOut: string;
  time: string;
}

export interface TeamData {
  rank: number;
  teamName: string;
  managerName: string;
  points: number;
  latestGwPoints: number;
  latestGwTransfers: Transfer[];
}

export interface GameweekPerformance {
  entryId: number;
  teamName: string;
  managerName: string;
  gameweek: number;
  points: number;
  totalPoints: number;
}

export interface GameweekTopBottom {
  gameweek: number;
  top3: GameweekPerformance[];
  bottom3: GameweekPerformance[];
  isFinished: boolean;
}

// Helper function to create player ID to name mapping
const fetchPlayerMapping = async (
  currentGw: number,
): Promise<Map<number, string>> => {
  // Check cache first
  const cacheKey = "player_mapping";
  const cached = getFromCache<[number, string][]>(cacheKey, currentGw);

  if (cached) {
    return new Map(cached);
  }

  const bootstrapResponse = await fetch(`/api/bootstrap-static/`);
  const bootstrapData = await bootstrapResponse.json();

  const playerMap = new Map<number, string>();
  bootstrapData.elements.forEach((player: any) => {
    playerMap.set(player.id, player.web_name);
  });

  // Save to cache as array (Map is not JSON serializable)
  setToCache(cacheKey, Array.from(playerMap.entries()), currentGw);

  return playerMap;
};

export const fetchLeagueStandings = async (): Promise<TeamData[]> => {
  try {
    // Get current gameweek
    const currentGwNumber = await getCurrentGameweek();

    // Fetch player mapping first (with caching)
    const playerMap = await fetchPlayerMapping(currentGwNumber);

    const standingsResponse = await fetch(
      `/api/leagues-classic/1594760/standings/`,
    );
    const standingsData = await standingsResponse.json();

    const teams: TeamData[] = await Promise.all(
      standingsData?.standings?.results.map(async (team: any) => {
        // Check cache for history data
        const historyCacheKey = `history_${team.entry}`;
        let historyData = getFromCache<any>(historyCacheKey, currentGwNumber);

        if (!historyData) {
          const historyResponse = await fetch(
            `/api/entry/${team.entry}/history/`,
          );
          historyData = await historyResponse.json();
          setToCache(historyCacheKey, historyData, currentGwNumber);
        }

        // Check cache for transfer data
        const transfersCacheKey = `transfers_${team.entry}`;
        let transfersData = getFromCache<any[]>(
          transfersCacheKey,
          currentGwNumber,
        );

        if (!transfersData) {
          const transfersResponse = await fetch(
            `/api/entry/${team.entry}/transfers/`,
          );
          transfersData = await transfersResponse.json();
          setToCache(transfersCacheKey, transfersData, currentGwNumber);
        }

        // Check if there are any entries with event === 1
        const hasEventOne = historyData.current.some(
          (entry: any) => entry.event === 1,
        );

        // Get the total points from the last entry
        const lastEntry =
          historyData.current.length > 0
            ? historyData.current[historyData.current.length - 1]
            : null;

        const lastEntryPoints = lastEntry ? lastEntry.total_points : 0;

        // Get the latest gameweek points (points minus transfer cost)
        const latestGwPoints = lastEntry
          ? lastEntry.points - lastEntry.event_transfers_cost
          : 0;

        // Calculate total points
        const points = hasEventOne ? lastEntryPoints : lastEntryPoints + 54;

        // Get transfers for the current gameweek
        const latestGwTransfers: Transfer[] = transfersData
          .filter((transfer: any) => transfer.event === currentGwNumber)
          .map((transfer: any) => ({
            playerIn:
              playerMap.get(transfer.element_in) ||
              `Player ${transfer.element_in}`,
            playerOut:
              playerMap.get(transfer.element_out) ||
              `Player ${transfer.element_out}`,
            time: transfer.time,
          }));

        return {
          rank: team.rank,
          teamName: team.entry_name,
          managerName: team.player_name,
          points,
          latestGwPoints,
          latestGwTransfers,
        };
      }),
    );

    // Sort teams by points (highest first)
    return teams.sort((a, b) => b.points - a.points);
  } catch (error) {
    console.error("Error fetching league standings:", error);
    throw new Error("Failed to fetch league standings");
  }
};

// Managers to exclude from achievements and graphs
const EXCLUDED_MANAGERS = ["Areef", "Airwaves"];

const isExcludedManager = (teamName: string): boolean => {
  return EXCLUDED_MANAGERS.some((name) =>
    teamName.toLowerCase().includes(name.toLowerCase()),
  );
};

export interface RankHistoryEntry {
  gameweek: number;
  leaguePosition: number;
  points: number;
  totalPoints: number;
}

export interface ManagerRankHistory {
  entryId: number;
  teamName: string;
  managerName: string;
  history: RankHistoryEntry[];
}

export interface AchievementData {
  mostValuableSquad: {
    manager: string;
    teamName: string;
    value: number;
  } | null;
  mostManagerOfWeek: {
    manager: string;
    teamName: string;
    count: number;
  } | null;
  mostLoserOfWeek: { manager: string; teamName: string; count: number } | null;
  highestSingleGw: {
    manager: string;
    teamName: string;
    gameweek: number;
    points: number;
  } | null;
  lowestSingleGw: {
    manager: string;
    teamName: string;
    gameweek: number;
    points: number;
  } | null;
}

export const fetchRankProgression = async (
  leagueId: string,
): Promise<ManagerRankHistory[]> => {
  try {
    const currentGameweekNumber = await getCurrentGameweek();

    const standingsResponse = await fetch(
      `/api/leagues-classic/${leagueId}/standings/`,
    );
    const standingsData = await standingsResponse.json();

    const teams = standingsData?.standings?.results || [];

    // Filter out excluded managers
    const filteredTeams = teams.filter(
      (team: any) => !isExcludedManager(team.entry_name),
    );

    // First, fetch all history data
    const teamHistoryData = await Promise.all(
      filteredTeams.map(async (team: any) => {
        const historyCacheKey = `history_${team.entry}`;
        let historyData = getFromCache<any>(
          historyCacheKey,
          currentGameweekNumber,
        );

        if (!historyData) {
          const historyResponse = await fetch(
            `/api/entry/${team.entry}/history/`,
          );
          historyData = await historyResponse.json();
          setToCache(historyCacheKey, historyData, currentGameweekNumber);
        }

        return {
          entryId: team.entry,
          teamName: team.entry_name,
          managerName: team.player_name,
          rawHistory: historyData.current || [],
        };
      }),
    );

    // Get all gameweeks
    const allGameweeks = new Set<number>();
    teamHistoryData.forEach((team) => {
      team.rawHistory.forEach((gw: any) => {
        allGameweeks.add(gw.event);
      });
    });

    // Calculate league position for each gameweek
    const managerHistories: ManagerRankHistory[] = teamHistoryData.map(
      (team) => {
        const history: RankHistoryEntry[] = [];

        Array.from(allGameweeks)
          .sort((a, b) => a - b)
          .forEach((gw) => {
            // Get all teams' total points at this gameweek
            const gwStandings = teamHistoryData
              .map((t) => {
                const gwData = t.rawHistory.find((h: any) => h.event === gw);
                return gwData
                  ? { entryId: t.entryId, totalPoints: gwData.total_points }
                  : null;
              })
              .filter(Boolean) as { entryId: number; totalPoints: number }[];

            // Sort by total points descending
            gwStandings.sort((a, b) => b.totalPoints - a.totalPoints);

            // Find this team's position
            const position =
              gwStandings.findIndex((s) => s.entryId === team.entryId) + 1;

            const teamGwData = team.rawHistory.find((h: any) => h.event === gw);
            if (teamGwData && position > 0) {
              history.push({
                gameweek: gw,
                leaguePosition: position,
                points: teamGwData.points - teamGwData.event_transfers_cost,
                totalPoints: teamGwData.total_points,
              });
            }
          });

        return {
          entryId: team.entryId,
          teamName: team.teamName,
          managerName: team.managerName,
          history,
        };
      },
    );

    return managerHistories;
  } catch (error) {
    console.error("Error fetching rank progression:", error);
    throw new Error("Failed to fetch rank progression");
  }
};

export const fetchAchievementStats = async (
  leagueId: string,
): Promise<AchievementData> => {
  try {
    const currentGameweekNumber = await getCurrentGameweek();

    const standingsResponse = await fetch(
      `/api/leagues-classic/${leagueId}/standings/`,
    );
    const standingsData = await standingsResponse.json();

    const bootstrapResponse = await fetch(`/api/bootstrap-static/`);
    const bootstrapData = await bootstrapResponse.json();

    const teams = standingsData?.standings?.results || [];

    // Filter out excluded managers
    const filteredTeams = teams.filter(
      (team: any) => !isExcludedManager(team.entry_name),
    );

    // Fetch all team data
    const teamDataList = await Promise.all(
      filteredTeams.map(async (team: any) => {
        const historyCacheKey = `history_${team.entry}`;
        let historyData = getFromCache<any>(
          historyCacheKey,
          currentGameweekNumber,
        );

        if (!historyData) {
          const historyResponse = await fetch(
            `/api/entry/${team.entry}/history/`,
          );
          historyData = await historyResponse.json();
          setToCache(historyCacheKey, historyData, currentGameweekNumber);
        }

        // Fetch current team value
        const entryCacheKey = `entry_${team.entry}`;
        let entryData = getFromCache<any>(entryCacheKey, currentGameweekNumber);

        if (!entryData) {
          const entryResponse = await fetch(`/api/entry/${team.entry}/`);
          entryData = await entryResponse.json();
          setToCache(entryCacheKey, entryData, currentGameweekNumber);
        }

        return {
          entryId: team.entry,
          teamName: team.entry_name,
          managerName: team.player_name,
          history: historyData.current || [],
          teamValue: entryData.last_deadline_value || 0,
        };
      }),
    );

    // === Existing: Most Valuable Squad ===
    const sortedByValue = [...teamDataList].sort(
      (a, b) => b.teamValue - a.teamValue,
    );
    const mostValuableSquad = sortedByValue[0]
      ? {
          manager: sortedByValue[0].managerName,
          teamName: sortedByValue[0].teamName,
          value: sortedByValue[0].teamValue / 10,
        }
      : null;

    // === New Achievement Trackers ===
    let highestBenchPoints: AchievementData["highestBenchPoints"] = null;
    let highestCaptainPoints: AchievementData["highestCaptainPoints"] = null;

    const centurionCount: Record<
      number,
      { manager: string; teamName: string; count: number }
    > = {};

    // === Top 3 / Bottom 3 + Highest/Lowest Single GW ===
    const top3OfWeekCount: Record<
      number,
      { manager: string; teamName: string; count: number }
    > = {};

    const bottom3OfWeekCount: Record<
      number,
      { manager: string; teamName: string; count: number }
    > = {};

    let highestSingleGw: AchievementData["highestSingleGw"] = null;
    let lowestSingleGw: AchievementData["lowestSingleGw"] = null;

    const finishedGameweeks = bootstrapData.events
      .filter((e: any) => e.finished)
      .map((e: any) => e.id);

    finishedGameweeks.forEach((gw: number) => {
      const gwPerformances = teamDataList
        .map((team) => {
          const gwData = team.history.find((h: any) => h.event === gw);
          if (!gwData) return null;

          const netPoints = gwData.points - gwData.event_transfers_cost;

          // Track 100+ gameweeks
          if (netPoints >= 100) {
            if (!centurionCount[team.entryId]) {
              centurionCount[team.entryId] = {
                manager: team.managerName,
                teamName: team.teamName,
                count: 0,
              };
            }
            centurionCount[team.entryId].count++;
          }

          // Track highest bench points
          if (
            !highestBenchPoints ||
            gwData.points_on_bench > highestBenchPoints.points
          ) {
            highestBenchPoints = {
              manager: team.managerName,
              teamName: team.teamName,
              gameweek: gw,
              points: gwData.points_on_bench,
            };
          }

          // Track highest captain points
          if (
            !highestCaptainPoints ||
            gwData.captain_points > highestCaptainPoints.points
          ) {
            highestCaptainPoints = {
              manager: team.managerName,
              teamName: team.teamName,
              gameweek: gw,
              points: gwData.captain_points,
            };
          }

          return {
            entryId: team.entryId,
            manager: team.managerName,
            teamName: team.teamName,
            points: netPoints,
            gameweek: gw,
          };
        })
        .filter(Boolean) as {
        entryId: number;
        manager: string;
        teamName: string;
        points: number;
        gameweek: number;
      }[];

      if (gwPerformances.length === 0) return;

      gwPerformances.sort((a, b) => b.points - a.points);

      // Top 3
      gwPerformances.slice(0, 3).forEach((p) => {
        if (!top3OfWeekCount[p.entryId]) {
          top3OfWeekCount[p.entryId] = {
            manager: p.manager,
            teamName: p.teamName,
            count: 0,
          };
        }
        top3OfWeekCount[p.entryId].count++;
      });

      // Bottom 3
      gwPerformances.slice(-3).forEach((p) => {
        if (!bottom3OfWeekCount[p.entryId]) {
          bottom3OfWeekCount[p.entryId] = {
            manager: p.manager,
            teamName: p.teamName,
            count: 0,
          };
        }
        bottom3OfWeekCount[p.entryId].count++;
      });

      // Highest & Lowest single GW
      const top = gwPerformances[0];
      const bottom = gwPerformances[gwPerformances.length - 1];

      if (!highestSingleGw || top.points > highestSingleGw.points) {
        highestSingleGw = {
          manager: top.manager,
          teamName: top.teamName,
          gameweek: gw,
          points: top.points,
        };
      }

      if (!lowestSingleGw || bottom.points < lowestSingleGw.points) {
        lowestSingleGw = {
          manager: bottom.manager,
          teamName: bottom.teamName,
          gameweek: gw,
          points: bottom.points,
        };
      }
    });

    // === Final Results ===
    const mostTop3Finishes =
      Object.values(top3OfWeekCount).sort((a, b) => b.count - a.count)[0] ||
      null;

    const mostBottom3Finishes =
      Object.values(bottom3OfWeekCount).sort((a, b) => b.count - a.count)[0] ||
      null;

    const mostCenturions =
      Object.values(centurionCount).sort((a, b) => b.count - a.count)[0] ||
      null;

    return {
      mostValuableSquad,
      mostManagerOfWeek: mostTop3Finishes, // Renamed to reflect Top 3
      mostLoserOfWeek: mostBottom3Finishes, // Renamed to reflect Bottom 3
      highestSingleGw,
      lowestSingleGw,

      // === NEW ACHIEVEMENTS ===
      highestBenchPoints, // Biggest bench regret (most points on bench in a GW)
      highestCaptainPoints, // Best captain pick ever
      mostCenturions, // Most 100+ point gameweeks ("Centurion Club")
    };
  } catch (error) {
    console.error("Error fetching achievement stats:", error);
    throw new Error("Failed to fetch achievement stats");
  }
};

export const fetchGameweekPerformances = async (
  leagueId: string,
): Promise<GameweekTopBottom[]> => {
  try {
    // Get current gameweek (cached)
    const currentGameweekNumber = await getCurrentGameweek();

    // Fetch bootstrap data to get gameweek finish status
    const bootstrapResponse = await fetch(`/api/bootstrap-static/`);
    const bootstrapData = await bootstrapResponse.json();

    const standingsResponse = await fetch(
      `/api/leagues-classic/${leagueId}/standings/`,
    );
    const standingsData = await standingsResponse.json();

    // Get all team entries
    const teamsBeforeFilter = standingsData?.standings?.results || [];

    // Filter out excluded managers
    const teams = teamsBeforeFilter.filter(
      (team: any) => !isExcludedManager(team.entry_name),
    );

    // Fetch history for all teams (with caching)
    const teamHistories = await Promise.all(
      teams.map(async (team: any) => {
        // Check cache for history data
        const historyCacheKey = `history_${team.entry}`;
        let historyData = getFromCache<any>(
          historyCacheKey,
          currentGameweekNumber,
        );

        if (!historyData) {
          const historyResponse = await fetch(
            `/api/entry/${team.entry}/history/`,
          );
          historyData = await historyResponse.json();
          setToCache(historyCacheKey, historyData, currentGameweekNumber);
        }

        return {
          entryId: team.entry,
          teamName: team.entry_name,
          managerName: team.player_name,
          history: historyData.current || [],
        };
      }),
    );

    // Determine all available gameweeks
    const allGameweeks = new Set<number>();
    teamHistories.forEach((team) => {
      team.history.forEach((gw: any) => {
        allGameweeks.add(gw.event);
      });
    });

    const sortedGameweeks = Array.from(allGameweeks).sort((a, b) => a - b);

    // For each gameweek, calculate top 3 and bottom 3
    const gameweekResults: GameweekTopBottom[] = sortedGameweeks.map(
      (gameweek) => {
        const performances: GameweekPerformance[] = [];

        teamHistories.forEach((team) => {
          const gwData = team.history.find((gw: any) => gw.event === gameweek);
          if (gwData) {
            performances.push({
              entryId: team.entryId,
              teamName: team.teamName,
              managerName: team.managerName,
              gameweek: gameweek,
              points: gwData.points - gwData.event_transfers_cost,
              totalPoints: gwData.total_points,
            });
          }
        });

        // Sort by points for this gameweek
        performances.sort((a, b) => b.points - a.points);

        // Check if this gameweek is finished
        // A gameweek is finished if it's before the current gameweek, or if it's the current gameweek and it's finished
        const gwEvent = bootstrapData.events.find(
          (event: any) => event.id === gameweek,
        );
        const isFinished = gwEvent
          ? gwEvent.finished
          : gameweek < currentGameweekNumber;

        return {
          gameweek,
          top3: performances.slice(0, 3),
          bottom3: performances.slice(-3).reverse(),
          isFinished,
        };
      },
    );

    return gameweekResults;
  } catch (error) {
    console.error("Error fetching gameweek performances:", error);
    throw new Error("Failed to fetch gameweek performances");
  }
};
