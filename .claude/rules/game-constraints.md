---
description: Business rules for lotto game support
globs: **/*
---

## Game Constraints

- Only PCSO 6/42 is active; other games (6/45, 6/49, 6/55, 6/58) are seeded as `IsActive = false` and shown as "Coming Soon" in the UI
- Prediction engine supports 5 strategies: Frequency, HotCold, Gap, AiWeighted, Combined
- Historical draw data (~3,000 draws) is seeded from CSV on first startup
