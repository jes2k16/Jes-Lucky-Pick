Create me a web app for a 6 number predictor and let's called it "Jes Lucky Pick"

On this app, use the following tech stack
| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Runtime | .NET | 10.0 LTS | Do NOT use .NET 9. LTS support until 2028 |
| Backend | ASP.NET Core | 10.0 | Minimal APIs + Controllers |
| ORM | EF Core | 10.0 | Npgsql provider, async only |
| Database | PostgreSQL | 17+ | Azure Flexible Server |
| Frontend | React | 19 | Functional components + hooks only |
| Bundler | Vite | Latest | SPA mode, no SSR |
| UI Primitives | Shadcn/ui (Radix + Tailwind) | Latest | Buttons, inputs, dialogs, layout, nav |
| Styling | Tailwind CSS | v4 | Utility-first, no custom CSS files |
| Type Safety | TypeScript | 5.x | Strict mode enabled |
| State Mgmt | TanStack Query | v5 | Server state. No Redux. |
| Forms | React Hook Form + Zod | Latest | All forms, all validation |
| Routing | React Router | v7 | Client-side SPA routing |
| Language | C# 14 | Latest | Backend |
| Auth | Argon2id + JWT + HTTP-only cookies | | Cookie (web) + Bearer token (mobile/API), token refresh |
| AI Agents | Microsoft Agent Framework | RC / 1.0 | Successor to Semantic Kernel + AutoGen |
| AI Foundation | Microsoft.Extensions.AI | Latest | Unified .NET AI abstractions |
| DB Hosting | Azure Database for PostgreSQL | Flexible | Zone-redundant HA, managed backups |
| Cache | Azure Cache for Redis | Latest | SignalR backplane, response caching |
| Registry | Azure Container Registry | Latest | Private Docker image storage |
| Unit (BE) | xUnit + NSubstitute + FluentAssertions | Latest | .NET test framework |
| Integration (BE) | WebApplicationFactory + Testcontainers | Latest | In-process API testing |
| Unit (FE) | Vitest + React Testing Library | Latest | Fast Vite-native runner |
| E2E | Playwright | Latest | Cross-browser, auto-wait |
| Load Test | k6 (Grafana) | Latest | Open source API load testing |
| PDF Generation | QuestPDF | Latest | Code-first PDF templates |

Data Grid: suggest
Rich Text: suggest
Charts: suggest

What We Do NOT Use
Next.js — SPA behind auth, no SSR needed
Redux / NgRx — TanStack Query for server state; Zustand only for complex client-only state (sidebar, wizards)
Angular — React only
Synchronous DB calls — See Async-First section. CRITICAL.
Recharts, and custom platform-ui components. Zero Syncfusion packages in the dependency tree.
Mapbox GL JS / Google Maps / Leaflet — MapLibre GL JS + PMTiles is the only mapping stack. Zero paid map dependencies (Session 91)
Semantic Kernel — Use Microsoft Agent Framework instead (SK is in maintenance mode)
Jest — Use Vitest (Vite-native, faster, same API)
Cypress — Use Playwright (faster, multi-browser, native trace)
Moq — Use NSubstitute (cleaner syntax, better async)
Custom CSS files — Tailwind utility classes only
Formik / uncontrolled forms — React Hook Form + Zod only

On this web app, i want the following pages.
1. login page
2. admin page
3. dashboard
4. history
5. lucky pick generator
6. Analysis

- We need to seed the past 20 years of data in the Philippine Lotto for all 6 number combination, fetch it to add in our postgre database
- the database will run in the container in my local machine, named it "Jes-Lucky-Pick" and we should be able to connect it to our web app
- in the app, let's start with 6/42 for the meantime, make other game to be coming soon
- Suggest how we can improve the prediction