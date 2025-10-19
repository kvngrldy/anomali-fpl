// lib/fpl.ts

const BASE_URL = "https://fantasy.premierleague.com/api";

export interface TeamData {
  rank: number;
  teamName: string;
  managerName: string;
  points: number;
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

export const fetchLeagueStandings = async (
  leagueId: string,
): Promise<TeamData[]> => {
  try {
    const standingsResponse = await fetch(
      `/api/leagues-classic/1594760/standings/`,
    );
    const standingsData = await standingsResponse.json();

    const teams: TeamData[] = await Promise.all(
      standingsData?.standings?.results.map(async (team: any) => {
        const historyResponse = await fetch(
          `/api/entry/${team.entry}/history/`,
        );
        const historyData = await historyResponse.json();

        // Check if there are any entries with event === 1
        const hasEventOne = historyData.current.some(
          (entry: any) => entry.event === 1,
        );

        // Get the total points from the last entry
        const lastEntryPoints =
          historyData.current.length > 0
            ? historyData.current[historyData.current.length - 1].total_points
            : 0;

        // Calculate total points
        const points = hasEventOne ? lastEntryPoints : lastEntryPoints + 54;

        return {
          rank: team.rank,
          teamName: team.entry_name,
          managerName: team.player_name,
          points,
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
    // Fetch bootstrap data to get current gameweek info
    const bootstrapResponse = await fetch(`/api/bootstrap-static/`);
    const bootstrapData = await bootstrapResponse.json();

    // Find the current gameweek
    const currentGameweek = bootstrapData.events.find(
      (event: any) => event.is_current,
    );
    const currentGameweekNumber = currentGameweek?.id || 0;

    const standingsResponse = await fetch(
      `/api/leagues-classic/${leagueId}/standings/`,
    );
    const standingsData = await standingsResponse.json();

    // Get all team entries
    const teams = standingsData?.standings?.results || [];

    // Fetch history for all teams
    const teamHistories = await Promise.all(
      teams.map(async (team: any) => {
        const historyResponse = await fetch(
          `/api/entry/${team.entry}/history/`,
        );
        const historyData = await historyResponse.json();

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
