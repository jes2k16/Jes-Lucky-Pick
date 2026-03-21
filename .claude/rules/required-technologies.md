---
description: Required technologies and libraries for this project
globs: **/*
---

## Required Technologies

**Frontend**:
- Tailwind CSS v4 utility classes only for styling
- Shadcn/ui (new-york style) for UI components
- React Hook Form + Zod for forms
- TanStack Query v5 for server state
- Zustand for client state (auth, UI)
- Nivo for charts (bar, pie, line, heatmap)
- Vitest + React Testing Library for frontend tests
- Playwright for E2E tests

**Backend**:
- xUnit + NSubstitute + FluentAssertions for backend tests
- EF Core with async-only database calls
- Argon2id for password hashing
