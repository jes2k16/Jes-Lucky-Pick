using System.Diagnostics;

// Test 1: Direct "claude"
Console.WriteLine("=== Test 1: FileName = \"claude\", Args = \"--version\" ===");
try
{
    var p1 = Process.Start(new ProcessStartInfo
    {
        FileName = "claude",
        Arguments = "--version",
        RedirectStandardOutput = true,
        RedirectStandardError = true,
        UseShellExecute = false,
        CreateNoWindow = true
    })!;
    var out1 = await p1.StandardOutput.ReadToEndAsync();
    await p1.WaitForExitAsync();
    Console.WriteLine($"Exit: {p1.ExitCode}, Output: {out1.Trim()}");
}
catch (Exception ex)
{
    Console.WriteLine($"FAILED: {ex.Message}");
}

// Test 2: cmd.exe /c claude
Console.WriteLine("\n=== Test 2: FileName = \"cmd.exe\", Args = \"/c claude --version\" ===");
try
{
    var p2 = Process.Start(new ProcessStartInfo
    {
        FileName = "cmd.exe",
        Arguments = "/c claude --version",
        RedirectStandardOutput = true,
        RedirectStandardError = true,
        UseShellExecute = false,
        CreateNoWindow = true
    })!;
    var out2 = await p2.StandardOutput.ReadToEndAsync();
    var err2 = await p2.StandardError.ReadToEndAsync();
    await p2.WaitForExitAsync();
    Console.WriteLine($"Exit: {p2.ExitCode}, Output: {out2.Trim()}, Stderr: {err2.Trim()}");
}
catch (Exception ex)
{
    Console.WriteLine($"FAILED: {ex.Message}");
}

// Test 3: Absolute path to claude.cmd
var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
var claudeCmd = Path.Combine(appData, "npm", "claude.cmd");
Console.WriteLine($"\n=== Test 3: FileName = \"{claudeCmd}\" ===");
Console.WriteLine($"File exists: {File.Exists(claudeCmd)}");
try
{
    var p3 = Process.Start(new ProcessStartInfo
    {
        FileName = claudeCmd,
        Arguments = "--version",
        RedirectStandardOutput = true,
        RedirectStandardError = true,
        UseShellExecute = false,
        CreateNoWindow = true
    })!;
    var out3 = await p3.StandardOutput.ReadToEndAsync();
    await p3.WaitForExitAsync();
    Console.WriteLine($"Exit: {p3.ExitCode}, Output: {out3.Trim()}");
}
catch (Exception ex)
{
    Console.WriteLine($"FAILED: {ex.Message}");
}

// Test 4: node running the claude JS entry point directly
var claudeJs = Path.Combine(appData, "npm", "node_modules", "@anthropic-ai", "claude-code", "cli.js");
Console.WriteLine($"\n=== Test 4: node \"{claudeJs}\" --version ===");
Console.WriteLine($"File exists: {File.Exists(claudeJs)}");
if (File.Exists(claudeJs))
{
    try
    {
        var p4 = Process.Start(new ProcessStartInfo
        {
            FileName = "node",
            ArgumentList = { claudeJs, "--version" },
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        })!;
        var out4 = await p4.StandardOutput.ReadToEndAsync();
        await p4.WaitForExitAsync();
        Console.WriteLine($"Exit: {p4.ExitCode}, Output: {out4.Trim()}");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"FAILED: {ex.Message}");
    }
}

// Test 5: where claude
Console.WriteLine("\n=== Test 5: where claude ===");
try
{
    var p5 = Process.Start(new ProcessStartInfo
    {
        FileName = "cmd.exe",
        Arguments = "/c where claude",
        RedirectStandardOutput = true,
        RedirectStandardError = true,
        UseShellExecute = false,
        CreateNoWindow = true
    })!;
    var out5 = await p5.StandardOutput.ReadToEndAsync();
    await p5.WaitForExitAsync();
    Console.WriteLine($"Exit: {p5.ExitCode}, Output: {out5.Trim()}");
}
catch (Exception ex)
{
    Console.WriteLine($"FAILED: {ex.Message}");
}
