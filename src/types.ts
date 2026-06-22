export interface Team {
  id: number;
  name: string;
  logo: string;
  winner: boolean | null;
}

export interface Venue {
  id: number | null;
  name: string;
  city: string;
}

export interface Status {
  long: string;
  short: string;
  elapsed: number | null;
}

export interface Fixture {
  id: number;
  referee: string | null;
  timezone: string;
  date: string;
  timestamp: number;
  periods: {
    first: number | null;
    second: number | null;
  };
  venue: Venue;
  status: Status;
}

export interface League {
  id: number;
  name: string;
  country: string;
  logo: string;
  flag: string | null;
  season: number;
  round: string;
}

export interface Goals {
  home: number | null;
  away: number | null;
}

export interface ScoreDetail {
  home: number | null;
  away: number | null;
}

export interface Score {
  halftime: ScoreDetail;
  fulltime: ScoreDetail;
  extratime: ScoreDetail;
  penalty: ScoreDetail;
}

export interface Match {
  fixture: Fixture;
  league: League;
  teams: {
    home: Team;
    away: Team;
  };
  goals: Goals;
  score: Score;
}

export interface UserPreferences {
  favoriteLeagues: number[]; // Array of league IDs
  favoriteTeams: string[]; // Array of team names
}
