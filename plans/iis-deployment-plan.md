# Plan: Publish Jes Lucky Pick to Local IIS

## Context

Deploy the full-stack app (NET 10 API + React 19 SPA + PostgreSQL) to local IIS. The React frontend will be embedded in the .NET API as static files (single IIS site). PostgreSQL stays in Docker Desktop.

**Prerequisites already met:** IIS enabled, .NET 10 Hosting Bundle installed, Docker Desktop available.

---

## Code Changes

### 1. Modify `src/JesLuckyPick.Api/Program.cs`

Add static file serving and SPA fallback:

```csharp
// After line 73 (after ExceptionHandlingMiddleware), add:
app.UseStaticFiles();

// After line 95 (after MapScheduleEndpoints), before the Hangfire reload block, add:
app.MapFallbackToFile("index.html");
```

Final middleware order:
1. `UseMiddleware<ExceptionHandlingMiddleware>()`
2. **`UseStaticFiles()`** — NEW
3. `UseHangfireDashboard(...)`
4. `UseHttpsRedirection()`
5. `UseAuthentication()` / `UseAuthorization()`
6. All `Map*` endpoint registrations
7. **`MapFallbackToFile("index.html")`** — NEW (must be last)

### 2. Create `src/JesLuckyPick.Api/appsettings.Production.json`

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=jesluckypick;Username=jesluckypick_admin;Password=JesLuckyPick2026!"
  },
  "Jwt": {
    "Key": "JesLuckyPickSuperSecretKeyThatIsAtLeast32BytesLong2026!",
    "Issuer": "JesLuckyPick",
    "Audience": "JesLuckyPickClient"
  },
  "Encryption": {
    "Key": "ORapQRQBcfrIJIsG/mjO8thRZKY1dMBymf7SoEDk8J4="
  }
}
```

> Note: For local dev IIS, reusing the same secrets is fine. For a real production deployment, generate new keys.

### 3. Create `src/JesLuckyPick.Api/web.config`

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <webSocket enabled="true" />
    <handlers>
      <add name="aspNetCore" path="*" verb="*"
           modules="AspNetCoreModuleV2" resourceType="Unspecified" />
    </handlers>
    <aspNetCore processPath="dotnet"
                arguments=".\JesLuckyPick.Api.dll"
                stdoutLogEnabled="false"
                stdoutLogFile=".\logs\stdout"
                hostingModel="OutOfProcess">
      <environmentVariables>
        <environmentVariable name="ASPNETCORE_ENVIRONMENT" value="Production" />
      </environmentVariables>
    </aspNetCore>
  </system.webServer>
</configuration>
```

Key points:
- **WebSocket enabled** — required for SignalR hubs
- **OutOfProcess** hosting — .NET runs as Kestrel, IIS reverse-proxies to it
- **ASPNETCORE_ENVIRONMENT=Production** — loads `appsettings.Production.json`

---

## Build & Publish Steps

### Step 1: Build React frontend
```powershell
cd src/jes-lucky-pick-client
npm ci
npm run build
```

### Step 2: Copy build output to API wwwroot
```powershell
mkdir -Force ../JesLuckyPick.Api/wwwroot
Copy-Item -Recurse -Force ./dist/* ../JesLuckyPick.Api/wwwroot/
```

### Step 3: Publish .NET app
```powershell
cd ../..
dotnet publish src/JesLuckyPick.Api -c Release -o ./publish
```

### Step 4: Deploy to IIS folder
```powershell
Copy-Item -Recurse -Force ./publish/* C:\inetpub\JesLuckyPick\
```

---

## IIS Configuration

### Enable WebSocket Protocol (one-time)
- **Turn Windows features on or off** > Internet Information Services > World Wide Web Services > Application Development Features > **WebSocket Protocol** check

### Create Application Pool
- Name: `JesLuckyPick`
- .NET CLR version: **No Managed Code**
- Pipeline: Integrated
- Advanced: Start Mode = `AlwaysRunning`, Idle Timeout = `0` (keeps Hangfire running)

### Create Website
- Site name: `JesLuckyPick`
- Application pool: `JesLuckyPick`
- Physical path: `C:\inetpub\JesLuckyPick`
- Binding: `http`, port `80` (or `8080` if port 80 is in use)

### Run Migrations (first deploy only)
```powershell
docker compose up -d
dotnet ef database update --project src/JesLuckyPick.Infrastructure --startup-project src/JesLuckyPick.Api
```

---

## Files Summary

| File | Action |
|------|--------|
| `src/JesLuckyPick.Api/Program.cs` | Modify — add `UseStaticFiles()` + `MapFallbackToFile` |
| `src/JesLuckyPick.Api/appsettings.Production.json` | Create — production config |
| `src/JesLuckyPick.Api/web.config` | Create — IIS ANCM + WebSocket config |

No changes to frontend code, `.csproj`, `vite.config.ts`, or `docker-compose.yml`.

---

## Verification

1. Ensure Docker PostgreSQL is running: `docker compose up -d`
2. Browse to `http://localhost` (or configured port)
3. Verify:
   - React SPA loads correctly
   - Client-side routes work on refresh (e.g., `/dashboard`)
   - API calls work (login, fetching draws)
   - SignalR connects via WebSocket (check browser DevTools > Network > WS)
   - Hangfire dashboard accessible at `/hangfire`

### Troubleshooting
- **500 errors**: Set `stdoutLogEnabled="true"` in `web.config`, restart site, check `logs/stdout_*.log`
- **502.5**: Run `dotnet JesLuckyPick.Api.dll` directly from publish folder to see error
- **WebSocket 404**: Enable WebSocket Protocol Windows Feature, then `iisreset`
- **DB connection refused**: Ensure `docker compose up -d` is running
