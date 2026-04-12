Build and publish Jes Lucky Pick to IIS at the path provided in $ARGUMENTS.

Steps to follow exactly:

1. Parse $ARGUMENTS as the IIS deployment path. If empty, use `C:\inetpub\JesLuckyPick` as default.

2. Build the React frontend:
   - Run `npm ci` in `src/jes-lucky-pick-client/`
   - Run `npm run build` in `src/jes-lucky-pick-client/`

3. Copy React build output to API wwwroot:
   - Delete `src/JesLuckyPick.Api/wwwroot/` if it exists
   - Copy everything from `src/jes-lucky-pick-client/dist/` into `src/JesLuckyPick.Api/wwwroot/`

4. Publish the .NET API:
   - Run `dotnet publish src/JesLuckyPick.Api -c Release -o ./publish` from repo root

5. Deploy to the IIS path:
   - Use PowerShell to create the destination folder if it doesn't exist
   - Use PowerShell to copy all files from `./publish/` to the destination path
   - Use `-Force` and `-Recurse` flags

6. Report success or any errors clearly. Show the final URL as `http://localhost` (or include the port if the path suggests a non-80 binding).

Important notes:
- Run all commands from the repo root: `c:\JESMAR\GIT\Claude Research\Number Randomizer`
- The copy to IIS folder requires admin permissions — if it fails with access denied, tell the user to reopen Claude Code as Administrator
- Do NOT restart IIS automatically — tell the user to restart the site in IIS Manager or run `iisreset` if needed
