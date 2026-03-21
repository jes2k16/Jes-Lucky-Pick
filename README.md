# Jes Lucky Pick

A full-stack web application for PCSO Lotto 6/42 number prediction. Analyzes ~3,000 historical draws using statistical strategies (frequency, hot/cold, gap analysis) to generate lucky number picks.

## Tech Stack

- **Backend**: .NET 10, ASP.NET Core (Clean Architecture), EF Core, PostgreSQL 17
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Shadcn/ui
- **Charts**: Nivo (bar, pie, line, heatmap)
- **Auth**: JWT + HTTP-only refresh cookie, Argon2id password hashing
- **Testing**: xUnit + FluentAssertions (backend), Vitest + React Testing Library (frontend)

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/) (with npm)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Getting Started

### 1. Start the Database and Redis

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL 17** on port `5432` (container: `Jes-Lucky-Pick`)
- **Redis 7** on port `6379` (container: `Jes-Lucky-Pick-Redis`)

### 2. Run the Backend API

```bash
dotnet run --project src/JesLuckyPick.Api
```

The API starts at **http://localhost:5000**. On first run it will:
- Apply EF Core migrations (creates all tables)
- Seed ~3,000 historical 6/42 draws from CSV
- Create a default admin user

### 3. Run the Frontend

```bash
cd src/jes-lucky-pick-client
npm install
npm run dev
```

The frontend starts at **http://localhost:5173** and proxies `/api` requests to the backend.

### 4. Log In

Open http://localhost:5173 and log in with the seeded admin credentials.

## Running Tests

```bash
# Backend tests
dotnet test

# Frontend tests (from src/jes-lucky-pick-client/)
npm test
```

## Project Structure

```
Number Randomizer/
├── docker-compose.yml
├── JesLuckyPick.slnx
├── src/
│   ├── JesLuckyPick.Domain/           # Entities, interfaces (no dependencies)
│   ├── JesLuckyPick.Application/      # DTOs, features, validation
│   ├── JesLuckyPick.Infrastructure/   # EF Core, auth, prediction engine
│   ├── JesLuckyPick.Api/              # ASP.NET Core host (controllers + minimal APIs)
│   └── jes-lucky-pick-client/         # React 19 SPA
└── tests/
    └── JesLuckyPick.Application.Tests/ # xUnit + NSubstitute + FluentAssertions
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `docker-compose up -d` | Start PostgreSQL + Redis containers |
| `dotnet build` | Build the entire solution |
| `dotnet run --project src/JesLuckyPick.Api` | Run the API server |
| `dotnet test` | Run backend tests |
| `npm run dev` | Start Vite dev server (from client dir) |
| `npm run build` | Production build (from client dir) |
| `npm test` | Run frontend tests (from client dir) |

## Prediction Strategies

| Strategy | Description |
|----------|-------------|
| **Frequency** | Picks numbers that appear most often historically |
| **Hot/Cold** | Uses z-score analysis to find statistically hot numbers |
| **Gap** | Targets overdue numbers based on draws since last appearance |
| **AI Weighted** | Composite scoring (40% frequency, 30% hot/cold, 30% gap) |
| **Combined** | Consensus across all strategies |
