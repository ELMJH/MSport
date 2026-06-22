import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;
const FOOTBALL_API_HOST = "https://v3.football.api-sports.io";
const FOOTBALL_API_KEY = "2581f8c29a40f0ccce7b7c9e599cdc92";

// In-memory cache for API requests to minimize rate-limiting and maximize performance
interface CacheEntry {
  timestamp: number;
  data: any;
}
const cache: Record<string, CacheEntry> = {};
const CACHE_TTL_LIVE = 60 * 1000; // 1 minute cache for live fixtures
const CACHE_TTL_DATE = 15 * 60 * 1000; // 15 minutes cache for daily fixtures

// Helper to construct priority weight for sorting leagues
// 1 = High priority (top five leagues, major cups/Arabic leagues)
// Higher numbers = lower priority
function getLeaguePriority(leagueId: number, hasLiveMatch: boolean): number {
  let weight = 100;

  // Let's list prioritize custom IDs:
  // Top 5 European Leagues
  if (leagueId === 39) weight = 10;   // Premier League (EPL)
  else if (leagueId === 140) weight = 11; // La Liga
  else if (leagueId === 135) weight = 12; // Serie A
  else if (leagueId === 78) weight = 13;  // Bundesliga
  else if (leagueId === 61) weight = 14;  // Ligue 1
  
  // Major International & Cup Competitions
  else if (leagueId === 2) weight = 15;   // Champions League
  else if (leagueId === 3) weight = 16;   // Europa League
  else if (leagueId === 531) weight = 17;  // English Community Shield (الكأس الخيرية)
  
  // Africa / Arab Championships
  else if (leagueId === 6) weight = 20;   // CAF Africa Cup of Nations (الكان)
  else if (leagueId === 9) weight = 21;   // CHAN (الشان)
  else if (leagueId === 233) weight = 22; // Egyptian Premier League (الدوري المصري)
  else if (leagueId === 307) weight = 23; // Saudi Pro League (دوري روشن)
  else if (leagueId === 200) weight = 24; // Botola Pro (الدوري المغربي)
  else if (leagueId === 482) weight = 25; // Arab Club Champions Cup (البطولة العربية للأندية)
  
  // World Cup / Internatinals
  else if (leagueId === 1) weight = 5;    // World Cup
  else if (leagueId === 10) weight = 40;  // Friendlies (ودية)

  // Live match gets premium boost
  if (hasLiveMatch) {
    weight -= 4; // Promotes league with live match
  }

  return weight;
}

// Generates dynamic, realistic fallback mock fixtures when the external API limit is reached
function generateMockFixtures(dateStr: string, isLive: boolean = false): any[] {
  // Let's parse current dates
  const today = new Date();
  const requestedDate = new Date(dateStr);
  
  const isToday = isLive || requestedDate.toDateString() === today.toDateString();
  const isYesterday = !isLive && requestedDate < today && requestedDate.toDateString() !== today.toDateString();
  const isTomorrow = !isLive && requestedDate > today && requestedDate.toDateString() !== today.toDateString();

  // Selected teams and badges to show
  const leagues = [
    { id: 39, name: "Premier League", country: "England", logo: "https://media.api-sports.io/football/leagues/39.png" },
    { id: 140, name: "La Liga", country: "Spain", logo: "https://media.api-sports.io/football/leagues/140.png" },
    { id: 135, name: "Serie A", country: "Italy", logo: "https://media.api-sports.io/football/leagues/135.png" },
    { id: 307, name: "Saudi Pro League", country: "Saudi Arabia", logo: "https://media.api-sports.io/football/leagues/307.png" },
    { id: 233, name: "Egyptian Premier League", country: "Egypt", logo: "https://media.api-sports.io/football/leagues/233.png" },
    { id: 200, name: "Botola Pro", country: "Morocco", logo: "https://media.api-sports.io/football/leagues/200.png" },
    { id: 2, name: "UEFA Champions League", country: "Europe", logo: "https://media.api-sports.io/football/leagues/2.png" },
    { id: 6, name: "Africa Cup of Nations", country: "CAF", logo: "https://media.api-sports.io/football/leagues/6.png" },
    { id: 10, name: "International Friendlies", country: "World", logo: "https://media.api-sports.io/football/leagues/10.png" },
  ];

  const teams: Record<number, { name: string; logo: string }[]> = {
    39: [
      { name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" },
      { name: "Arsenal", logo: "https://media.api-sports.io/football/teams/42.png" },
      { name: "Liverpool", logo: "https://media.api-sports.io/football/teams/40.png" },
      { name: "Manchester United", logo: "https://media.api-sports.io/football/teams/33.png" },
    ],
    140: [
      { name: "Real Madrid", logo: "https://media.api-sports.io/football/teams/541.png" },
      { name: "Barcelona", logo: "https://media.api-sports.io/football/teams/529.png" },
      { name: "Atletico Madrid", logo: "https://media.api-sports.io/football/teams/530.png" },
      { name: "Girona", logo: "https://media.api-sports.io/football/teams/547.png" },
    ],
    135: [
      { name: "Inter Milan", logo: "https://media.api-sports.io/football/teams/505.png" },
      { name: "AC Milan", logo: "https://media.api-sports.io/football/teams/489.png" },
      { name: "Juventus", logo: "https://media.api-sports.io/football/teams/496.png" },
      { name: "Napoli", logo: "https://media.api-sports.io/football/teams/492.png" },
    ],
    307: [
      { name: "Al-Hilal", logo: "https://media.api-sports.io/football/teams/2939.png" },
      { name: "Al-Nassr", logo: "https://media.api-sports.io/football/teams/2940.png" },
      { name: "Al-Ittihad", logo: "https://media.api-sports.io/football/teams/2938.png" },
      { name: "Al-Ahli", logo: "https://media.api-sports.io/football/teams/2942.png" },
    ],
    200: [
      { name: "Wydad AC", logo: "https://media.api-sports.io/football/teams/1020.png" },
      { name: "Raja Club Athletic", logo: "https://media.api-sports.io/football/teams/1021.png" },
      { name: "RS Berkane", logo: "https://media.api-sports.io/football/teams/1025.png" },
      { name: "FAR Rabat", logo: "https://media.api-sports.io/football/teams/1022.png" },
    ],
    233: [
      { name: "Al Ahly", logo: "https://media.api-sports.io/football/teams/1023.png" },
      { name: "Zamalek SC", logo: "https://media.api-sports.io/football/teams/1024.png" },
      { name: "Pyramids FC", logo: "https://media.api-sports.io/football/teams/3389.png" },
      { name: "Future FC", logo: "https://media.api-sports.io/football/teams/14717.png" },
    ],
    2: [
      { name: "Real Madrid", logo: "https://media.api-sports.io/football/teams/541.png" },
      { name: "Bayern Munich", logo: "https://media.api-sports.io/football/teams/157.png" },
      { name: "PSG", logo: "https://media.api-sports.io/football/teams/85.png" },
      { name: "Borussia Dortmund", logo: "https://media.api-sports.io/football/teams/165.png" },
    ],
    6: [
      { name: "Morocco", logo: "https://media.api-sports.io/football/teams/12.png" },
      { name: "Egypt", logo: "https://media.api-sports.io/football/teams/15.png" },
      { name: "Senegal", logo: "https://media.api-sports.io/football/teams/13.png" },
      { name: "Nigeria", logo: "https://media.api-sports.io/football/teams/19.png" },
    ],
    10: [
      { name: "Brazil", logo: "https://media.api-sports.io/football/teams/6.png" },
      { name: "Argentina", logo: "https://media.api-sports.io/football/teams/26.png" },
      { name: "France", logo: "https://media.api-sports.io/football/teams/2.png" },
      { name: "England", logo: "https://media.api-sports.io/football/teams/10.png" },
    ],
  };

  const matches: any[] = [];
  let baseId = 1200000;

  leagues.forEach((league) => {
    const pairList = teams[league.id] || [];
    if (pairList.length >= 2) {
      // Create 2 matches per league
      const match1 = { home: pairList[0], away: pairList[1] };
      const match2 = { home: pairList[2] || pairList[0], away: pairList[3] || pairList[1] };

      [match1, match2].forEach((pair, idx) => {
        baseId++;
        const matchHour = idx === 0 ? "17:00" : "20:00";
        const dateWithTime = `${dateStr}T${matchHour}:00+00:00`;
        const timestamp = Math.floor(new Date(dateWithTime).getTime() / 1000);

        let elapsed = 0;
        let shortStatus = "NS";
        let scoreHome = null;
        let scoreAway = null;

        if (isLive) {
          // Live simulation
          shortStatus = "1H";
          elapsed = 40;
          scoreHome = idx === 0 ? 1 : 0;
          scoreAway = idx === 0 ? 0 : 1;
        } else if (isYesterday) {
          // Finished matches simulation
          shortStatus = "FT";
          elapsed = 90;
          scoreHome = idx === 0 ? 2 : 1;
          scoreAway = idx === 0 ? 1 : 3;
        } else if (isToday) {
          // Today matches could be some live, some finished, some starting later
          if (idx === 0) {
            shortStatus = "FT";
            elapsed = 90;
            scoreHome = 2;
            scoreAway = 0;
          } else {
            shortStatus = "NS";
            elapsed = 0;
            scoreHome = null;
            scoreAway = null;
          }
        } else {
          // Tomorrow matches: Not started
          shortStatus = "NS";
          elapsed = 0;
          scoreHome = null;
          scoreAway = null;
        }

        matches.push({
          fixture: {
            id: baseId,
            referee: "M. El Jaouhari",
            timezone: "UTC",
            date: dateWithTime,
            timestamp: timestamp,
            periods: { first: null, second: null },
            venue: { id: 1, name: "Stadium Match Arena", city: league.country },
            status: { long: shortStatus === "FT" ? "Match Finished" : shortStatus === "NS" ? "Not Started" : "In Progress", short: shortStatus, elapsed: elapsed },
          },
          league: {
            id: league.id,
            name: league.name,
            country: league.country,
            logo: league.logo,
            flag: null,
            season: 2026,
            round: "Regular Season - 28",
          },
          teams: {
            home: { id: baseId * 2, name: pair.home.name, logo: pair.home.logo, winner: scoreHome !== null && scoreHome > (scoreAway || 0) ? true : false },
            away: { id: baseId * 2 + 1, name: pair.away.name, logo: pair.away.logo, winner: scoreAway !== null && scoreAway > (scoreHome || 0) ? true : false },
          },
          goals: { home: scoreHome, away: scoreAway },
          score: {
            halftime: { home: scoreHome !== null ? Math.floor(scoreHome / 2) : null, away: scoreAway !== null ? Math.floor(scoreAway / 2) : null },
            fulltime: { home: scoreHome, away: scoreAway },
            extratime: { home: null, away: null },
            penalty: { home: null, away: null },
          },
        });
      });
    }
  });

  return matches;
}

// API endpoint to fetch fixtures
app.get("/api/fixtures", async (req, res) => {
  const { date, live } = req.query as { date?: string; live?: string };

  let cacheKey = "";
  let ttl = CACHE_TTL_DATE;
  let isLiveRequest = false;

  if (live === "all") {
    cacheKey = "live-fixtures";
    ttl = CACHE_TTL_LIVE;
    isLiveRequest = true;
  } else if (date) {
    // Basic date validation YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ error: "Invalid date format. Expected YYYY-MM-DD" });
    }
    cacheKey = `date-${date}`;
    ttl = CACHE_TTL_DATE;
  } else {
    // Default to today
    const nowStr = new Date().toISOString().split("T")[0];
    cacheKey = `date-${nowStr}`;
    ttl = CACHE_TTL_DATE;
  }

  const now = Date.now();
  if (cache[cacheKey] && now - cache[cacheKey].timestamp < ttl) {
    console.log(`[Proxy] Search cache hit for key: ${cacheKey}`);
    return res.json(cache[cacheKey].data);
  }

  // Construct external API URL
  let targetUrl = `${FOOTBALL_API_HOST}/fixtures?timezone=UTC`;
  if (isLiveRequest) {
    targetUrl += `&live=all`;
  } else {
    targetUrl += `&date=${date || new Date().toISOString().split("T")[0]}`;
  }

  console.log(`[Proxy] Fetching from API: ${targetUrl}`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "x-apisports-key": FOOTBALL_API_KEY,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      
      // If API succeeds, returns list
      // Check if response field exists and has elements
      if (data && Array.isArray(data.response)) {
        // Cache and return
        cache[cacheKey] = {
          timestamp: Date.now(),
          data: data,
        };
        console.log(`[Proxy] Succeeded. Cached and returned ${data.response.length} matches.`);
        return res.json(data);
      }
    }

    throw new Error(`External API failed with status ${response.status} or invalid data structure.`);
  } catch (error: any) {
    console.warn(`[Proxy] Error fetching from external API, using fallback data:`, error.message);
    
    // Fallback Mock generator
    const targetDateStr = date || new Date().toISOString().split("T")[0];
    const fallbackMatches = generateMockFixtures(targetDateStr, isLiveRequest);
    
    const mockResponsePayload = {
      get: "fixtures",
      parameters: isLiveRequest ? { live: "all" } : { date: targetDateStr },
      errors: [],
      results: fallbackMatches.length,
      paging: { current: 1, total: 1 },
      response: fallbackMatches,
      isMockPayload: true // Flag indicating fallback mock so user knows
    };

    cache[cacheKey] = {
      timestamp: Date.now(),
      data: mockResponsePayload,
    };

    return res.json(mockResponsePayload);
  }
});

// Start dev server middleware or static production handler
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] MSport ready on http://localhost:${PORT}`);
  });
}

startServer();
