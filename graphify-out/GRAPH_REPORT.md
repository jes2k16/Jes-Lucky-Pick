# Graph Report - src  (2026-04-11)

## Corpus Check
- Large corpus: 241 files · ~106,037 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 3047 nodes · 9352 edges · 119 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.83)
- Token cost: 950 input · 420 output

## God Nodes (most connected - your core abstractions)
1. `error()` - 169 edges
2. `get()` - 166 edges
3. `push()` - 157 edges
4. `constructor()` - 145 edges
5. `i()` - 104 edges
6. `set()` - 90 edges
7. `n()` - 86 edges
8. `fire()` - 79 edges
9. `E()` - 78 edges
10. `t()` - 76 edges

## Surprising Connections (you probably didn't know these)
- `JesLuckyPick.Api Assembly` --references--> `Dapper NuGet Package`  [EXTRACTED]
  src/JesLuckyPick.Api/obj/Debug/net10.0/JesLuckyPick.Api.csproj.FileListAbsolute.txt → src/JesLuckyPick.Api/obj/Release/net10.0/JesLuckyPick.Api.csproj.FileListAbsolute.txt
- `QuestPDF NuGet Package` --references--> `Lato Font (LatoFont)`  [INFERRED]
  src/JesLuckyPick.Api/obj/Debug/net10.0/JesLuckyPick.Api.csproj.FileListAbsolute.txt → src/JesLuckyPick.Api/bin/Debug/net10.0/LatoFont/OFL.txt
- `Publish Output Directory` --references--> `Dapper NuGet Package`  [EXTRACTED]
  src/JesLuckyPick.Api/obj/Release/net10.0/PublishOutputs.190f891960.txt → src/JesLuckyPick.Api/obj/Release/net10.0/JesLuckyPick.Api.csproj.FileListAbsolute.txt
- `Publish Output Directory` --references--> `PCSO 6/42 Historical Draw Seed Data CSV`  [EXTRACTED]
  src/JesLuckyPick.Api/obj/Release/net10.0/PublishOutputs.190f891960.txt → src/JesLuckyPick.Infrastructure/obj/Debug/net10.0/JesLuckyPick.Infrastructure.csproj.FileListAbsolute.txt
- `icons.svg SVG Sprite Sheet` --references--> `API wwwroot Static Files Directory`  [EXTRACTED]
  src/jes-lucky-pick-client/public/icons.svg → src/JesLuckyPick.Api/wwwroot/favicon.svg

## Hyperedges (group relationships)
- **Clean Architecture Layer Dependency Chain** — assembly_jesluckypick_api, assembly_jesluckypick_infrastructure, assembly_jesluckypick_application, assembly_jesluckypick_domain [EXTRACTED 0.99]
- **JesLuckyPick.Api Core NuGet Dependencies** — assembly_jesluckypick_api, nuget_efcore, nuget_npgsql, nuget_jwtbearer, nuget_mediatr, nuget_argon2, nuget_redis, nuget_stackexchange_redis, nuget_questpdf, nuget_hangfire, nuget_dapper [EXTRACTED 0.95]
- **All Projects Target .NET 10** — assembly_jesluckypick_api, assembly_jesluckypick_application, assembly_jesluckypick_domain, assembly_jesluckypick_infrastructure, target_net10 [EXTRACTED 0.99]

## Communities

### Community 0 - "Minified JS Bundle (Core)"
Cohesion: 0.01
Nodes (40): _3(), addVariantChild(), _applyScrollModifier(), _batchedMemoryCleanup(), cleanupMemory(), _clearLiveRegion(), consumeWheelEvent(), cursorBackwardTab() (+32 more)

### Community 1 - "Admin Panel UI & API"
Cohesion: 0.01
Nodes (35): LuckyPickPage(), resolveVeteranCareer(), useCountdown(), getColor(), NumberBall(), SidebarMenuButton(), useSidebar(), analystStrategy() (+27 more)

### Community 2 - "JS Runtime Internals A"
Cohesion: 0.02
Nodes (256): a(), accessor(), Ad(), add(), addDependent(), addObserver(), ae(), Are() (+248 more)

### Community 3 - "JS Runtime Internals B"
Cohesion: 0.02
Nodes (250): $8(), AB(), abort(), _addToPayload(), advance(), ak(), an(), animation() (+242 more)

### Community 4 - "JS Runtime Internals C"
Cohesion: 0.03
Nodes (191): addChild(), addListeners(), addValue(), aee(), Af(), _alignRowWidth(), am(), _announceCharacters() (+183 more)

### Community 5 - "JS Runtime Internals D"
Cohesion: 0.03
Nodes (180): ac(), ai(), ao(), Au(), aw(), b(), Ba(), Bc() (+172 more)

### Community 6 - "Terminal Buffer Internals"
Cohesion: 0.02
Nodes (155): $6(), a9(), activateAltBuffer(), activateNormalBuffer(), addDigit(), addParam(), addSubParam(), _arrowPointerDown() (+147 more)

### Community 7 - "Terminal Link Handling"
Cohesion: 0.03
Nodes (132): _9(), addCodepointToCell(), addLineToLink(), addMarker(), _askForLink(), backspace(), c7(), charProperties() (+124 more)

### Community 8 - "Terminal Encoding & Protocols"
Cohesion: 0.02
Nodes (120): addEncoding(), addListener(), addProtocol(), addRefreshCallback(), _applyVisibilitySetting(), beginHide(), beginReveal(), _bindKeys() (+112 more)

### Community 9 - "Terminal ACK & State"
Cohesion: 0.04
Nodes (103): _ack(), _ackTimer(), active(), activeEncoding(), activeProtocol(), activeVersion(), arcTo(), _assertNotEmptyString() (+95 more)

### Community 10 - "EF Core Migrations"
Cohesion: 0.04
Nodes (19): InitialCreate, JesLuckyPick.Infrastructure.Migrations, AddUserProfileFields, JesLuckyPick.Infrastructure.Migrations, ChangeDrawDateToDateTime, JesLuckyPick.Infrastructure.Migrations, AddAppSettings, JesLuckyPick.Infrastructure.Migrations (+11 more)

### Community 11 - "Mouse & Selection Handling"
Cohesion: 0.06
Nodes (45): activate(), _addMouseDownListeners(), _areCoordsInSelection(), areSelectionValuesReversed(), d6(), f6(), finalSelectionEnd(), finalSelectionStart() (+37 more)

### Community 12 - "Scroll & Wheel Events"
Cohesion: 0.06
Nodes (38): accept(), acceptScrollDimensions(), acceptStandardWheelEvent(), age(), b_e(), _computeScore(), createPanHandlers(), delegatePointerDown() (+30 more)

### Community 13 - "DOM Style & Row Rendering"
Cohesion: 0.06
Nodes (37): _addStyle(), _applyMinimumContrast(), createRow(), D9(), getBgColor(), getBgColorMode(), getCode(), getColor() (+29 more)

### Community 14 - "Canvas Cell Geometry"
Cohesion: 0.09
Nodes (37): arc(), _cell(), cellPolygon(), cellPolygons(), _clip(), _clipFinite(), _clipInfinite(), _clipSegment() (+29 more)

### Community 15 - "JS Runtime Internals E"
Cohesion: 0.06
Nodes (36): aae(), At(), bae(), cae(), cD(), dae(), Do(), eae() (+28 more)

### Community 16 - "Agent & App Settings Config"
Cohesion: 0.06
Nodes (12): AgentPromptConfiguration, AppSettingConfiguration, AuditLogConfiguration, DrawConfiguration, ExpertCareerConfiguration, ExpertLottoStatsConfiguration, IEntityTypeConfiguration, LottoGameConfiguration (+4 more)

### Community 17 - "Math & Clamp Utilities"
Cohesion: 0.09
Nodes (28): Ag(), bG(), bk(), CG(), clamp(), Dg(), displayable(), dK() (+20 more)

### Community 18 - "Canvas Bezier Rendering"
Cohesion: 0.09
Nodes (27): bezierCurveTo(), bq(), by(), cY(), dY(), eY(), fJ(), fY() (+19 more)

### Community 19 - ".NET Assembly Layer"
Cohesion: 0.09
Nodes (27): JesLuckyPick.Api Assembly, JesLuckyPick.Application Assembly, JesLuckyPick.Domain Assembly, JesLuckyPick.Infrastructure Assembly, Lato Font (LatoFont), appsettings.Production.json, web.config (IIS Configuration), SIL Open Font License 1.1 (OFL) (+19 more)

### Community 20 - "Slider & DOM UI Nodes"
Cohesion: 0.12
Nodes (25): _createSlider(), m5(), onclick(), p5(), _renderDomNode(), setBottom(), setContain(), setFontSize() (+17 more)

### Community 21 - "Task Scheduling JS"
Cohesion: 0.1
Nodes (25): aoe(), B6(), Be(), canRun(), continue(), digest(), Dye(), emit() (+17 more)

### Community 22 - "JS Runtime Internals F"
Cohesion: 0.1
Nodes (25): aq(), az(), cq(), dq(), gq(), Hz(), iz(), Jz() (+17 more)

### Community 23 - "Game Hub (SignalR)"
Cohesion: 0.14
Nodes (3): GameHub, Hub, TerminalHub

### Community 24 - "Texture Atlas & Buffer Flush"
Cohesion: 0.12
Nodes (22): bufferRows(), clearTextureAtlas(), flush(), _flushCleanupDeleted(), _flushCleanupInserted(), forEachByKey(), forEachDecorationAtCell(), _fullRefresh() (+14 more)

### Community 25 - "Draw Repository"
Cohesion: 0.09
Nodes (3): DrawRepository, IDrawRepository, IDrawRepository

### Community 26 - "Brand & Visual Design System"
Cohesion: 0.13
Nodes (21): API wwwroot Static Files Directory, Cyan-Blue Accent Color (#47bfff), Lavender Highlight Color (#ede6ff), Purple Brand Color (#863bff / #7e14ff), Jes Lucky Pick Favicon (Lightning Bolt Icon), Gaussian Blur Glow / Shimmer Effects, Lightning Bolt / Thunder Shape, Jes Lucky Pick Frontend Client (+13 more)

### Community 27 - "Disposable Memory Management"
Cohesion: 0.12
Nodes (20): addTarget(), clearAndLeak(), deleteAndLeak(), dge(), e8(), getDisposableData(), getRootParent(), gge() (+12 more)

### Community 28 - "Expert Career Repository"
Cohesion: 0.11
Nodes (3): ExpertCareerRepository, IExpertCareerRepository, IExpertCareerRepository

### Community 29 - "User Repository Interface"
Cohesion: 0.11
Nodes (3): IUserRepository, IUserRepository, UserRepository

### Community 30 - "Game Simulator Service"
Cohesion: 0.27
Nodes (3): GameSimulatorService, SimExpert, SimManager

### Community 31 - "Terminal CSI/ESC Handlers"
Cohesion: 0.12
Nodes (17): addCsiHandler(), addDcsHandler(), addEscHandler(), addOscHandler(), clearCsiHandler(), clearDcsHandler(), clearEscHandler(), clearHandler() (+9 more)

### Community 32 - "Cursor Movement Commands"
Cohesion: 0.12
Nodes (16): charPosAbsolute(), cursorBackward(), cursorCharAbsolute(), cursorDown(), cursorForward(), cursorNextLine(), cursorPosition(), cursorPrecedingLine() (+8 more)

### Community 33 - "Admin Controller"
Cohesion: 0.16
Nodes (3): AdminController, AuthController, ControllerBase

### Community 34 - "Paste & Input Handling"
Cohesion: 0.14
Nodes (14): dle(), eme(), khe(), L3(), Nne(), paste(), post(), Rhe() (+6 more)

### Community 35 - "PCSO Draw Fetch Service"
Cohesion: 0.23
Nodes (3): IDrawFetchService, IDrawFetchService, PcsoDrawFetchService

### Community 36 - "Prediction Orchestrator Service"
Cohesion: 0.4
Nodes (1): PredictionOrchestratorService

### Community 37 - "Decoration & Zone Rendering"
Cohesion: 0.17
Nodes (12): addDecoration(), _addLineToZone(), _lineAdjacentToZone(), _lineIntersectsZone(), _refreshCanvasDimensions(), _refreshColorZonePadding(), _refreshDecorations(), _refreshDrawConstants() (+4 more)

### Community 38 - "Training Session Repository"
Cohesion: 0.17
Nodes (3): ITrainingSessionRepository, ITrainingSessionRepository, TrainingSessionRepository

### Community 39 - "Claude AI Prediction Service"
Cohesion: 0.24
Nodes (3): ClaudeAiPredictionService, IAiPredictionService, IAiPredictionService

### Community 40 - "App Settings Repository"
Cohesion: 0.2
Nodes (3): AppSettingRepository, IAppSettingRepository, IAppSettingRepository

### Community 41 - "Lotto Game Repository"
Cohesion: 0.2
Nodes (3): ILottoGameRepository, ILottoGameRepository, LottoGameRepository

### Community 42 - "Prediction Repository"
Cohesion: 0.2
Nodes (3): IPredictionRepository, IPredictionRepository, PredictionRepository

### Community 43 - "Agent Prompt Endpoints"
Cohesion: 0.25
Nodes (1): AgentPromptEndpoints

### Community 44 - "SignalR Hub Config"
Cohesion: 0.22
Nodes (9): configureLogging(), isNotEmpty(), isRequired(), Rc(), withHubProtocol(), withKeepAliveInterval(), withServerTimeout(), withUrl() (+1 more)

### Community 45 - "Schedule Endpoints"
Cohesion: 0.32
Nodes (1): ScheduleEndpoints

### Community 46 - "Settings Endpoints"
Cohesion: 0.29
Nodes (1): SettingsEndpoints

### Community 47 - "Terminal Color Control"
Cohesion: 0.25
Nodes (8): E9(), P9(), restoreIndexedColor(), setOrReportBgColor(), setOrReportCursorColor(), setOrReportFgColor(), setOrReportIndexedColor(), _setOrReportSpecialColor()

### Community 48 - "Training Schedule Repository"
Cohesion: 0.25
Nodes (3): ITrainingScheduleRepository, ITrainingScheduleRepository, TrainingScheduleRepository

### Community 49 - "Database Seeder"
Cohesion: 0.43
Nodes (1): DatabaseSeeder

### Community 50 - "AES Encryption Service"
Cohesion: 0.25
Nodes (3): AesEncryptionService, IEncryptionService, IEncryptionService

### Community 51 - "Training Endpoints & DTOs"
Cohesion: 0.29
Nodes (5): ExpertCareerDto, ExpertCareerPatchRequest, ExpertCareerSyncRequest, ExpertLottoStatsDto, TrainingEndpoints

### Community 52 - "Training Scheduler Service"
Cohesion: 0.48
Nodes (1): TrainingSchedulerService

### Community 53 - "Terminal Charset Selection"
Cohesion: 0.4
Nodes (6): selectCharset(), selectDefaultCharset(), setgCharset(), setgLevel(), shiftIn(), shiftOut()

### Community 54 - "Frontend Visual Identity"
Cohesion: 0.47
Nodes (6): Jes Lucky Pick Frontend App, Cyan/Blue Accent Color (#47bfff), Jes Lucky Pick Favicon SVG, Gaussian Blur Glow Effects, Lightning Bolt / Arrow Shape, Purple Brand Color Scheme (#863bff / #7e14ff)

### Community 55 - "Prediction Endpoints"
Cohesion: 0.6
Nodes (1): PredictionEndpoints

### Community 56 - "JS Miscellaneous"
Cohesion: 0.4
Nodes (5): coe(), goe(), oe(), qk(), rA()

### Community 57 - "DB Context Model Snapshot"
Cohesion: 0.4
Nodes (3): AppDbContextModelSnapshot, JesLuckyPick.Infrastructure.Migrations, ModelSnapshot

### Community 58 - "Module Group 58"
Cohesion: 0.5
Nodes (0): 

### Community 59 - "Module Group 59"
Cohesion: 0.67
Nodes (1): AnalysisEndpoints

### Community 60 - "Module Group 60"
Cohesion: 0.67
Nodes (1): ExceptionHandlingMiddleware

### Community 61 - "Module Group 61"
Cohesion: 0.5
Nodes (2): HangfireAdminAuthFilter, IDashboardAuthorizationFilter

### Community 62 - "Module Group 62"
Cohesion: 0.5
Nodes (4): A_e(), j_e(), q_e(), x5()

### Community 63 - "Module Group 63"
Cohesion: 0.67
Nodes (4): getSnapshotBeforeUpdate(), promote(), relegate(), safeToRemove()

### Community 64 - "Module Group 64"
Cohesion: 0.5
Nodes (4): _addTriangle(), _legalize(), _link(), tpe()

### Community 65 - "Module Group 65"
Cohesion: 0.67
Nodes (1): DependencyInjection

### Community 66 - "Module Group 66"
Cohesion: 0.5
Nodes (2): InitialCreate, JesLuckyPick.Infrastructure.Migrations

### Community 67 - "Module Group 67"
Cohesion: 0.5
Nodes (2): AddUserProfileFields, JesLuckyPick.Infrastructure.Migrations

### Community 68 - "Module Group 68"
Cohesion: 0.5
Nodes (2): ChangeDrawDateToDateTime, JesLuckyPick.Infrastructure.Migrations

### Community 69 - "Module Group 69"
Cohesion: 0.5
Nodes (2): AddAppSettings, JesLuckyPick.Infrastructure.Migrations

### Community 70 - "Module Group 70"
Cohesion: 0.5
Nodes (2): AddAgentPrompts, JesLuckyPick.Infrastructure.Migrations

### Community 71 - "Module Group 71"
Cohesion: 0.5
Nodes (2): AddTrainingEntities, JesLuckyPick.Infrastructure.Migrations

### Community 72 - "Module Group 72"
Cohesion: 0.5
Nodes (2): AddIsFavoriteToExpertCareer, JesLuckyPick.Infrastructure.Migrations

### Community 73 - "Module Group 73"
Cohesion: 0.5
Nodes (2): AddWinnerProfileJsonToTrainingSession, JesLuckyPick.Infrastructure.Migrations

### Community 74 - "Module Group 74"
Cohesion: 0.5
Nodes (2): AddTrainingSchedule, JesLuckyPick.Infrastructure.Migrations

### Community 75 - "App DB Context"
Cohesion: 0.5
Nodes (2): AppDbContext, DbContext

### Community 76 - "Module Group 76"
Cohesion: 0.67
Nodes (1): DashboardEndpoints

### Community 77 - "Module Group 77"
Cohesion: 0.67
Nodes (1): DrawEndpoints

### Community 78 - "Module Group 78"
Cohesion: 0.67
Nodes (1): ProfileEndpoints

### Community 79 - "Module Group 79"
Cohesion: 0.67
Nodes (1): Draw

### Community 80 - "Module Group 80"
Cohesion: 0.67
Nodes (1): Prediction

### Community 81 - "Module Group 81"
Cohesion: 0.67
Nodes (1): ScheduledTrainingJob

### Community 82 - "Module Group 82"
Cohesion: 1.0
Nodes (1): AgentPrompt

### Community 83 - "Module Group 83"
Cohesion: 1.0
Nodes (1): AppSetting

### Community 84 - "Module Group 84"
Cohesion: 1.0
Nodes (1): AuditLog

### Community 85 - "Module Group 85"
Cohesion: 1.0
Nodes (1): ExpertCareer

### Community 86 - "Module Group 86"
Cohesion: 1.0
Nodes (1): ExpertLottoStats

### Community 87 - "Module Group 87"
Cohesion: 1.0
Nodes (1): LottoGame

### Community 88 - "Module Group 88"
Cohesion: 1.0
Nodes (1): TrainingSchedule

### Community 89 - "Module Group 89"
Cohesion: 1.0
Nodes (1): TrainingSession

### Community 90 - "Module Group 90"
Cohesion: 1.0
Nodes (1): User

### Community 91 - "Module Group 91"
Cohesion: 1.0
Nodes (0): 

### Community 92 - "Module Group 92"
Cohesion: 1.0
Nodes (0): 

### Community 93 - "Module Group 93"
Cohesion: 1.0
Nodes (0): 

### Community 94 - "Module Group 94"
Cohesion: 1.0
Nodes (0): 

### Community 95 - "Module Group 95"
Cohesion: 1.0
Nodes (0): 

### Community 96 - "Module Group 96"
Cohesion: 1.0
Nodes (0): 

### Community 97 - "Module Group 97"
Cohesion: 1.0
Nodes (0): 

### Community 98 - "Module Group 98"
Cohesion: 1.0
Nodes (0): 

### Community 99 - "Module Group 99"
Cohesion: 1.0
Nodes (0): 

### Community 100 - "Module Group 100"
Cohesion: 1.0
Nodes (0): 

### Community 101 - "Module Group 101"
Cohesion: 1.0
Nodes (0): 

### Community 102 - "Module Group 102"
Cohesion: 1.0
Nodes (0): 

### Community 103 - "Module Group 103"
Cohesion: 1.0
Nodes (0): 

### Community 104 - "Module Group 104"
Cohesion: 1.0
Nodes (0): 

### Community 105 - "Module Group 105"
Cohesion: 1.0
Nodes (0): 

### Community 106 - "Module Group 106"
Cohesion: 1.0
Nodes (0): 

### Community 107 - "Module Group 107"
Cohesion: 1.0
Nodes (0): 

### Community 108 - "Module Group 108"
Cohesion: 1.0
Nodes (0): 

### Community 109 - "Module Group 109"
Cohesion: 1.0
Nodes (0): 

### Community 110 - "Module Group 110"
Cohesion: 1.0
Nodes (0): 

### Community 111 - "Module Group 111"
Cohesion: 1.0
Nodes (0): 

### Community 112 - "Module Group 112"
Cohesion: 1.0
Nodes (0): 

### Community 113 - "Module Group 113"
Cohesion: 1.0
Nodes (0): 

### Community 114 - "Module Group 114"
Cohesion: 1.0
Nodes (0): 

### Community 115 - "Module Group 115"
Cohesion: 1.0
Nodes (0): 

### Community 116 - "Module Group 116"
Cohesion: 1.0
Nodes (0): 

### Community 117 - "Module Group 117"
Cohesion: 1.0
Nodes (0): 

### Community 118 - "Module Group 118"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **59 isolated node(s):** `ExpertCareerDto`, `ExpertCareerPatchRequest`, `ExpertLottoStatsDto`, `ExpertCareerSyncRequest`, `AgentPrompt` (+54 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Module Group 82`** (2 nodes): `AgentPrompt.cs`, `AgentPrompt`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 83`** (2 nodes): `AppSetting.cs`, `AppSetting`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 84`** (2 nodes): `AuditLog.cs`, `AuditLog`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 85`** (2 nodes): `ExpertCareer.cs`, `ExpertCareer`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 86`** (2 nodes): `ExpertLottoStats.cs`, `ExpertLottoStats`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 87`** (2 nodes): `LottoGame.cs`, `LottoGame`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 88`** (2 nodes): `TrainingSchedule.cs`, `TrainingSchedule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 89`** (2 nodes): `TrainingSession.cs`, `TrainingSession`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 90`** (2 nodes): `User.cs`, `User`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 91`** (1 nodes): `Program.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 92`** (1 nodes): `vite.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 93`** (1 nodes): `vitest.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 94`** (1 nodes): `timer.worker.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 95`** (1 nodes): `JesLuckyPick.Api.AssemblyInfo.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 96`** (1 nodes): `JesLuckyPick.Api.MvcApplicationPartsAssemblyInfo.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 97`** (1 nodes): `timer.worker-mY1ZuImo.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 98`** (1 nodes): `AgentPromptDtos.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 99`** (1 nodes): `AnalysisDtos.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 100`** (1 nodes): `LoginRequest.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 101`** (1 nodes): `LoginResponse.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 102`** (1 nodes): `RegisterRequest.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 103`** (1 nodes): `DashboardDtos.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 104`** (1 nodes): `CreateDrawRequest.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 105`** (1 nodes): `DrawContextDtos.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 106`** (1 nodes): `DrawDto.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 107`** (1 nodes): `PredictionDtos.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 108`** (1 nodes): `ProfileDtos.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 109`** (1 nodes): `AiSettingsDtos.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 110`** (1 nodes): `JesLuckyPick.Application.AssemblyInfo.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 111`** (1 nodes): `JesLuckyPick.Application.GlobalUsings.g.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 112`** (1 nodes): `LottoGameType.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 113`** (1 nodes): `PredictionStrategy.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 114`** (1 nodes): `UserRole.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 115`** (1 nodes): `JesLuckyPick.Domain.AssemblyInfo.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 116`** (1 nodes): `JesLuckyPick.Domain.GlobalUsings.g.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 117`** (1 nodes): `JesLuckyPick.Infrastructure.AssemblyInfo.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 118`** (1 nodes): `JesLuckyPick.Infrastructure.GlobalUsings.g.cs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `E()` connect `JS Runtime Internals A` to `Minified JS Bundle (Core)`, `JS Runtime Internals B`, `JS Runtime Internals C`, `JS Runtime Internals D`, `Terminal Buffer Internals`, `Terminal Link Handling`, `Terminal Encoding & Protocols`, `DOM Style & Row Rendering`, `Canvas Cell Geometry`, `Canvas Bezier Rendering`, `JS Runtime Internals F`, `Module Group 63`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Why does `push()` connect `JS Runtime Internals A` to `Minified JS Bundle (Core)`, `JS Runtime Internals B`, `JS Runtime Internals C`, `JS Runtime Internals D`, `Terminal Buffer Internals`, `Terminal Link Handling`, `Terminal Encoding & Protocols`, `Terminal ACK & State`, `Decoration & Zone Rendering`, `Mouse & Selection Handling`, `DOM Style & Row Rendering`, `Canvas Cell Geometry`, `JS Runtime Internals E`, `Terminal Color Control`, `Task Scheduling JS`, `Texture Atlas & Buffer Flush`, `Disposable Memory Management`, `Terminal CSI/ESC Handlers`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Why does `get()` connect `Terminal Link Handling` to `Minified JS Bundle (Core)`, `JS Runtime Internals A`, `JS Runtime Internals B`, `JS Runtime Internals C`, `JS Runtime Internals D`, `Terminal Buffer Internals`, `Paste & Input Handling`, `Terminal Encoding & Protocols`, `Terminal ACK & State`, `Mouse & Selection Handling`, `Scroll & Wheel Events`, `DOM Style & Row Rendering`, `Math & Clamp Utilities`, `Task Scheduling JS`, `JS Runtime Internals F`, `Texture Atlas & Buffer Flush`, `Disposable Memory Management`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `ExpertCareerDto`, `ExpertCareerPatchRequest`, `ExpertLottoStatsDto` to the rest of the system?**
  _59 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Minified JS Bundle (Core)` be split into smaller, more focused modules?**
  _Cohesion score 0.01 - nodes in this community are weakly interconnected._
- **Should `Admin Panel UI & API` be split into smaller, more focused modules?**
  _Cohesion score 0.01 - nodes in this community are weakly interconnected._
- **Should `JS Runtime Internals A` be split into smaller, more focused modules?**
  _Cohesion score 0.02 - nodes in this community are weakly interconnected._