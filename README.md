# FPL Data Visualization App

A modern web application for visualizing Fantasy Premier League (FPL) player data, statistics, and performance metrics.

## Features

- **Player Overview**: Browse and search through all FPL players with detailed statistics
- **Interactive Charts**: Visualize player performance across gameweeks
- **Player Comparison**: Compare up to 5 players side-by-side
- **Position Distribution**: See the distribution of players by position
- **Advanced Filtering**: Filter by position, search by name/team, and sort by various metrics
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Python 3.8 or higher
- npm or yarn
- pip (Python package manager)

### Installation

#### 1. Install Frontend Dependencies

```bash
npm install
```

#### 2. Install Backend Dependencies

```bash
pip install -r requirements.txt
```

### Running the Application

**Important:** You need to run both the backend and frontend servers.

#### Step 1: Start the Python Backend Server

In one terminal window:

```bash
python backend.py
```

The backend will start on `http://localhost:5000` and proxy requests to the FPL API.

#### Step 2: Start the Frontend Development Server

In another terminal window:

```bash
npm run dev
```

The frontend will start on `http://localhost:3000` and automatically connect to the backend.

#### Step 3: Open the App

Open your browser and navigate to `http://localhost:3000`

### Why a Backend is Needed

The Fantasy Premier League API has CORS (Cross-Origin Resource Sharing) restrictions that prevent direct browser requests. The Python backend acts as a proxy, making requests from the server side where CORS restrictions don't apply.

## Project Structure

```
fpl/
├── src/
│   ├── components/          # React components
│   │   ├── Dashboard.tsx    # Main dashboard component
│   │   ├── PlayerCard.tsx   # Individual player card
│   │   ├── PlayerList.tsx   # List of players with filters
│   │   ├── PlayerStatsChart.tsx  # Player performance chart
│   │   ├── PlayerComparison.tsx  # Player comparison chart
│   │   └── PositionDistribution.tsx  # Position pie chart
│   ├── services/
│   │   └── dataService.ts   # Data fetching service
│   ├── types/
│   │   └── fpl.ts          # TypeScript type definitions
│   ├── App.tsx             # Root component
│   ├── main.tsx            # Entry point
│   └── index.css           # Global styles
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Data Integration

The app uses the official Fantasy Premier League API:

- **Main Endpoint**: `https://fantasy.premierleague.com/api/bootstrap-static/`
  - Contains all players, teams, gameweeks, and positions in one response
  - Cached after first load for better performance

- **Player Statistics**: `https://fantasy.premierleague.com/api/element-summary/{player_id}/`
  - Fetched on-demand when viewing individual player details
  - Contains gameweek-by-gameweek performance data

See `FPL_API_GUIDE.md` for detailed information about the API structure and data format.

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Technologies Used

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Recharts** - Chart library
- **Axios** - HTTP client
- **Lucide React** - Icons

## Customization

- Update colors in `tailwind.config.js` to match your brand
- Modify component styles in individual component files
- Add new visualization types by creating new components
- Extend the data models in `src/types/fpl.ts` to include additional fields

## License

MIT

