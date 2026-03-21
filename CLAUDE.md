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
dotnet run --project src/JesLuckyPick.Api  # Run API (default: http://localhost:5026)

# Frontend (from src/jes-lucky-pick-client/)
npm run dev                     # Vite dev server (port 5173, proxies /api to :5026)
npm run build                   # Production build (tsc + vite build)
npm test                        # Run frontend tests (Vitest)

# Backend tests
dotnet test

# EF Core migrations (from repo root)
dotnet ef migrations add <Name> --project src/JesLuckyPick.Infrastructure --startup-project src/JesLuckyPick.Api
dotnet ef database update --project src/JesLuckyPick.Infrastructure --startup-project src/JesLuckyPick.Api
```

NuGet restore uses a local `nuget.config` that clears inherited feeds and uses only nuget.org.

## Rules

All project rules (banned/required technologies, styling conventions, architecture, game constraints) are in `.claude/rules/`. See those files for detailed instructions.
