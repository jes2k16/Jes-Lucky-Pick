---
description: Backend clean architecture rules and conventions
globs: src/JesLuckyPick.*/**/*.cs
---

## Backend Architecture

Clean Architecture layers: `Domain → Application → Infrastructure → Api`

- **Domain**: Entities, enums, repository interfaces. Zero dependencies.
- **Application**: DTOs, feature folders, service interfaces (`IPasswordHasher`, `ITokenService`). References Domain only.
- **Infrastructure**: EF Core, Argon2id hasher, JWT service, prediction engine, seeder. References Application.
- **Api**: Controllers (auth, admin) + Minimal APIs (draws, analysis, predictions, dashboard). References Infrastructure.

## Conventions

- All DB calls must be async (no synchronous EF Core usage)
- DI wiring goes in `Infrastructure/DependencyInjection.cs`
- EF Core uses Fluent API configurations (no data annotations)
- Solution file is `.slnx` format (not `.sln`)
- NuGet restore uses local `nuget.config` (clears inherited feeds, uses only nuget.org)
