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
    const teams = standingsData?.standings?.results || [];

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
