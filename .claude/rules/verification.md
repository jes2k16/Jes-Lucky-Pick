## Verification Rule

Every plan and implementation must include running unit tests as part of verification:

- **Frontend**: `npx vitest run` — all tests must pass
- **Backend**: `dotnet test` — all tests must pass
- **TypeScript**: `npx tsc --noEmit` — zero type errors

Never skip tests. If tests fail, fix them before marking work as complete.
