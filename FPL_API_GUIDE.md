# FPL API Data Structure Guide

This guide explains how the Fantasy Premier League API data is structured and how it's being used in this app.

## Main Endpoint

**`https://fantasy.premierleague.com/api/bootstrap-static/`**

This endpoint returns a JSON object containing all the static data for the current FPL season.

## Data Structure

The response contains several key arrays:

### 1. `elements` (Players)

This is an array of all players in the game. Each player object contains:

**Key Fields:**
- `id` - Unique player ID
- `web_name` - Short name (e.g., "Haaland")
- `first_name` - First name
- `second_name` - Last name
- `element_type` - Position ID (1=GK, 2=DEF, 3=MID, 4=FWD)
- `team` - Team ID (references the `teams` array)
- `now_cost` - Current price in tenths (e.g., 100 = £10.0m)
- `total_points` - Total points scored this season
- `goals_scored` - Total goals
- `assists` - Total assists
- `clean_sheets` - Clean sheets (for defenders/goalkeepers)
- `yellow_cards`, `red_cards` - Card counts
- `saves` - Saves (for goalkeepers)
- `bonus` - Bonus points
- `form` - Form rating (as string, e.g., "8.5")
- `selected_by_percent` - Ownership percentage (as string, e.g., "45.2")
- `transfers_in`, `transfers_out` - Transfer statistics
- `value_form`, `value_season` - Value metrics (as strings)
- `points_per_game` - Average points per game (as string)
- `ict_index`, `influence`, `creativity`, `threat` - ICT metrics (as strings)
- `photo` - Photo filename (e.g., "431248.jpg")
- `minutes`, `starts` - Playing time statistics
- `expected_goals`, `expected_assists` - xG/xA metrics (as strings)

**Note:** Many numeric values are returned as strings and need to be parsed with `parseFloat()`.

### 2. `teams` (Teams)

Array of all Premier League teams:

- `id` - Team ID
- `name` - Full team name (e.g., "Arsenal")
- `short_name` - Short name (e.g., "ARS")
- `strength` - Team strength rating (1-5)

### 3. `events` (Gameweeks)

Array of all gameweeks:

- `id` - Gameweek number
- `name` - Gameweek name (e.g., "Gameweek 1")
- `deadline_time` - Deadline timestamp
- `average_entry_score` - Average score for that gameweek
- `highest_score` - Highest score achieved
- `finished` - Whether the gameweek is complete

### 4. `element_types` (Positions)

Array mapping position IDs to names:

- `id` - Position ID (1=GK, 2=DEF, 3=MID, 4=FWD)
- `singular_name` - Full name (e.g., "Goalkeeper")
- `singular_name_short` - Short code (e.g., "GKP", "DEF", "MID", "FWD")

## Player Statistics by Gameweek

To get detailed gameweek-by-gameweek statistics for a player, use:

**`https://fantasy.premierleague.com/api/element-summary/{player_id}/`**

This returns:
- `history` - Array of gameweek-by-gameweek stats
- `history_past` - Previous season stats
- `fixtures` - Upcoming fixtures

Each item in `history` contains:
- `round` - Gameweek number
- `total_points` - Points scored that gameweek
- `goals_scored`, `assists` - Goals and assists
- `minutes` - Minutes played
- `opponent_team` - Opponent team ID
- `was_home` - Whether it was a home game
- And many more detailed statistics

## How the App Uses This Data

1. **Initial Load**: The app fetches `bootstrap-static` once and caches it
2. **Player Mapping**: Converts FPL API format to our internal `Player` type
3. **Position Mapping**: Uses `element_types` to convert position IDs to names
4. **Team Mapping**: Uses `teams` array to get team names from IDs
5. **Price Conversion**: Converts `now_cost` (in tenths) to actual price (e.g., 100 → £10.0m)
6. **String Parsing**: Parses string values like `form`, `selected_by_percent` to numbers
7. **Player Stats**: When viewing a player, fetches `element-summary/{id}/` for gameweek data

## Example Data Transformation

**FPL API Format:**
```json
{
  "id": 381,
  "web_name": "Haaland",
  "first_name": "Erling",
  "second_name": "Haaland",
  "element_type": 4,
  "team": 1,
  "now_cost": 140,
  "total_points": 127,
  "goals_scored": 18,
  "form": "8.5",
  "selected_by_percent": "45.2"
}
```

**Our App Format:**
```json
{
  "id": 381,
  "name": "Erling Haaland",
  "webName": "Haaland",
  "position": "FWD",
  "team": "Man City",
  "price": 14.0,
  "totalPoints": 127,
  "goals": 18,
  "form": 8.5,
  "selectedBy": 45.2
}
```

## Additional FPL API Endpoints

The FPL API has many more endpoints you could use:

- `/api/fixtures/` - All fixtures
- `/api/event/{gameweek_id}/live/` - Live gameweek data
- `/api/entry/{team_id}/` - Specific team data (requires authentication)
- `/api/leagues-classic/{league_id}/standings/` - League standings

For more information, check the [FPL API documentation](https://www.fantasyfootballscout.co.uk/fantasy-premier-league-api/) or explore the API endpoints directly.

