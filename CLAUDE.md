# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Jes Lucky Pick** — A full-stack web app for PCSO Lotto 6/42 number prediction. .NET 10 backend + React 19 SPA frontend, PostgreSQL 17 database seeded with ~3,000 historical draws.

## Build & Run Commands

```bash
# Start infrastructure (PostgreSQL + Redis containers)
docker-compose up -d

# Backend (from repo root)
dotnet build                    # Build entire solution
dotnet run --project src/JesLuckyPick.Api  # Run API (default: http://localhost:5000)

# Frontend (from src/jes-lucky-pick-client/)
npm run dev                     # Vite dev server (port 5173, proxies /api to :5000)
npm run build                   # Production build (tsc + vite build)

# EF Core migrations (from repo root)
dotnet ef migrations add <Name> --project src/JesLuckyPick.Infrastructure --startup-project src/JesLuckyPick.Api
dotnet ef database update --project src/JesLuckyPick.Infrastructure --startup-project src/JesLuckyPick.Api
```

NuGet restore uses a local `nuget.config` that clears inherited feeds and uses only nuget.org. This avoids auth failures from company-scoped Azure DevOps feeds.

## Architecture

### Backend — Clean Architecture (.NET 10)

```
Domain → Application → Infrastructure → Api
```

- **Domain**: Entities (`Draw`, `User`, `Prediction`, `LottoGame`, `RefreshToken`, `AuditLog`), enums, repository interfaces. Zero dependencies.
- **Application**: DTOs, feature folders (Auth, Draws, Predictions, Analysis, Dashboard), interfaces for `IPasswordHasher` and `ITokenService`.
- **Infrastructure**: EF Core (`AppDbContext`, Fluent API configs, repositories), Argon2id hasher, JWT service, prediction engine, database seeder. All DB calls are async — no synchronous EF Core usage.
- **Api**: Hybrid routing — Controllers for auth (`AuthController`), Minimal APIs for data endpoints (`DrawEndpoints`, `AnalysisEndpoints`, `PredictionEndpoints`, `DashboardEndpoints`). JWT Bearer auth + HTTP-only refresh cookie.

DI wiring is in `Infrastructure/DependencyInjection.cs`. Startup is in `Api/Program.cs` which runs migrations and seeds data on dev startup.

### Frontend — React 19 SPA

Feature-based structure under `src/features/` (auth, dashboard, history, lucky-pick, analysis, admin). Each feature has `pages/`, `api/`, `hooks/`, and `components/` subdirs.

- **State**: TanStack Query v5 for server state, Zustand stores for auth (`authStore.ts`) and UI (`uiStore.ts`). No Redux.
- **API client** (`lib/api-client.ts`): Axios with Bearer token injection and automatic 401 → refresh token retry.
- **Routing** (`routes.tsx`): React Router v7. Login is public; all other routes wrapped in `ProtectedRoute`.
- **UI**: Shadcn/ui (new-york style) + Tailwind CSS v4. Path alias `@` → `./src`. Dark mode via `.dark` class variant.
- **Charts**: Nivo (bar, pie, line, heatmap). **Not** Recharts.

### Prediction Engine

`PredictionOrchestratorService` implements 5 strategies: Frequency, HotCold (z-score), Gap (overdue numbers), AiWeighted (composite 40/30/30 scoring), Combined (consensus across all). Uses `System.Security.Cryptography.RandomNumberGenerator` for randomness.

### Database

PostgreSQL 17 in Docker container `Jes-Lucky-Pick`. Tables: `lotto_games`, `draws`, `users`, `predictions`, `refresh_tokens`, `audit_logs`. Seed data loaded from `Infrastructure/Persistence/Seeding/SeedData/pcso_642_draws.csv` (copied to build output via csproj `<None>` item).

### Auth Flow

Argon2id (64MB memory, 3 iterations) → JWT access token (15 min, stored in memory) + refresh token (7 days, HTTP-only cookie at `/api/auth`). Token rotation on refresh; revocation on logout.

## Key Constraints (from requirements)

- **DO NOT use**: Next.js, Redux, Angular, synchronous DB calls, Recharts, Syncfusion, Semantic Kernel, Jest, Cypress, Moq, custom CSS files, Formik
- **DO use**: Tailwind utility classes only, React Hook Form + Zod for forms, Vitest for frontend tests, Playwright for E2E, xUnit + NSubstitute + FluentAssertions for backend tests
- Only 6/42 is active; other games (6/49, 6/55, 6/58) are seeded as `IsActive = false` ("Coming Soon")
