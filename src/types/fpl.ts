// Internal app types
export interface Player {
  id: number;
  name: string;
  team: string;
  teamId: number;
  position: string;
  price: number;
  totalPoints: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  yellowCards: number;
  redCards: number;
  saves?: number;
  bonusPoints: number;
  form: number;
  selectedBy: number; // percentage
  transfersIn: number;
  transfersOut: number;
  value: number; // points per million
  photo?: string;
  webName?: string;
  pointsPerGame?: number;
  ictIndex?: number;
  influence?: number;
  creativity?: number;
  threat?: number;
  // Season-long expected metrics (from bootstrap or aggregated)
  expectedGoals?: number;
  expectedAssists?: number;
  expectedGoalInvolvements?: number;
  expectedGoalsConceded?: number;
  minutes?: number;
  xGPer90?: number;
  xAPer90?: number;
  xGIPer90?: number;
  expectedPoints?: number; // Placeholder for xP model (Phase 3)
}

export interface Fixture {
  id: number;
  event: number | null; // gameweek
  team_h: number;
  team_a: number;
  team_h_difficulty: number;
  team_a_difficulty: number;
  finished: boolean;
  kickoff_time: string | null;
  team_h_score: number | null;
  team_a_score: number | null;
}

export interface Team {
  id: number;
  name: string;
  shortName: string;
  strength: number;
  players: Player[];
}

export interface Gameweek {
  number: number;
  averageScore: number;
  highestScore: number;
  deadline: string;
}

export interface PlayerStats {
  player: Player;
  gameweeks: {
    gameweek: number;
    points: number;
    goals: number;
    assists: number;
    expectedGoals?: number;
    expectedAssists?: number;
    expectedGoalInvolvements?: number;
  }[];
}

// FPL API response types
export interface FPLBootstrapResponse {
  elements: FPLPlayer[];
  teams: FPLTeam[];
  events: FPLEvent[];
  element_types: FPLPosition[];
}

export interface FPLPlayer {
  id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  element_type: number; // 1=GK, 2=DEF, 3=MID, 4=FWD
  team: number; // team id
  now_cost: number; // price in tenths (e.g., 100 = £10.0m)
  total_points: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  form: string; // as string, needs parsing
  selected_by_percent: string; // as string, needs parsing
  transfers_in: number;
  transfers_out: number;
  value_form: string; // as string
  value_season: string; // as string
  photo: string;
  points_per_game: string; // as string
  ict_index: string; // as string
  influence: string; // as string
  creativity: string; // as string
  threat: string; // as string
  minutes: number;
  starts: number;
  expected_goals?: string;
  expected_assists?: string;
  expected_goal_involvements?: string;
  expected_goals_conceded?: string;
}

export interface FPLTeam {
  id: number;
  name: string;
  short_name: string;
  strength: number;
}

export interface FPLEvent {
  id: number;
  name: string;
  deadline_time: string;
  average_entry_score: number;
  highest_score: number;
  finished: boolean;
}

export interface FPLPosition {
  id: number;
  singular_name: string;
  singular_name_short: string;
}

export interface FPLPlayerSummary {
  history: FPLPlayerHistory[];
  history_past: any[];
  fixtures: any[];
}

export interface FPLPlayerHistory {
  element: number;
  fixture: number;
  opponent_team: number;
  total_points: number;
  was_home: boolean;
  kickoff_time: string;
  team_h_score: number;
  team_a_score: number;
  round: number; // gameweek number
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  bps: number;
  influence: string;
  creativity: string;
  threat: string;
  ict_index: string;
  value: number;
  transfers_balance: number;
  selected: number;
  transfers_in: number;
  transfers_out: number;
  expected_goals?: string;
  expected_assists?: string;
  expected_goal_involvements?: string;
  expected_goals_conceded?: string;
}

