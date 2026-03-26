using System.Collections.Concurrent;
using System.Diagnostics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace JesLuckyPick.Api.Hubs;

[Authorize(Roles = "Admin")]
public class TerminalHub : Hub
{
    private static readonly ConcurrentDictionary<string, Process> RunningProcesses = new();

    // Track whether a connection has an ongoing conversation (for --continue)
    private static readonly ConcurrentDictionary<string, bool> ActiveConversations = new();

    private static readonly char[] ForbiddenChars = [';', '|', '&', '`', '$', '>', '<'];

    private static string ResolveClaudePath()
    {
        if (OperatingSystem.IsWindows())
        {
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            var cmdPath = Path.Combine(appData, "npm", "claude.cmd");
            if (File.Exists(cmdPath)) return cmdPath;
        }

        return "claude";
    }

    // ── Print Mode: single command with raw arguments ──

    public async Task SendCommand(string arguments)
    {
        var connectionId = Context.ConnectionId;

        if (string.IsNullOrWhiteSpace(arguments))
        {
            await Clients.Caller.SendAsync("CommandComplete", 0);
            return;
        }

        if (arguments.IndexOfAny(ForbiddenChars) >= 0 || arguments.Contains("$("))
        {
            await Clients.Caller.SendAsync("ReceiveOutput",
                "\x1b[31mError: Shell metacharacters are not allowed.\x1b[0m");
            await Clients.Caller.SendAsync("CommandComplete", 1);
            return;
        }

        await RunClaudeProcess(connectionId, ParseArguments(arguments), "ReceiveOutput", "CommandComplete");
    }

    public async Task CancelCommand()
    {
        KillProcess(Context.ConnectionId);
        await Clients.Caller.SendAsync("ReceiveOutput", "\x1b[33mCommand cancelled.\x1b[0m");
        await Clients.Caller.SendAsync("CommandComplete", -1);
    }

    // ── Interactive Mode: conversation via -p + --continue ──

    public async Task SendInteractiveMessage(string message, string? model = null)
    {
        var connectionId = Context.ConnectionId;

        if (string.IsNullOrWhiteSpace(message))
        {
            await Clients.Caller.SendAsync("InteractiveComplete", 0);
            return;
        }

        // Build args: -p "message" [--model X] [--continue if not first message]
        var args = new List<string> { "-p", message };

        if (!string.IsNullOrWhiteSpace(model))
        {
            args.Add("--model");
            args.Add(model);
        }

        if (ActiveConversations.ContainsKey(connectionId))
        {
            args.Add("--continue");
        }

        await RunClaudeProcess(connectionId, args, "InteractiveOutput", "InteractiveComplete");

        // Mark conversation as active after first successful message
        ActiveConversations[connectionId] = true;
    }

    public async Task CancelInteractive()
    {
        KillProcess(Context.ConnectionId);
        await Clients.Caller.SendAsync("InteractiveOutput", "\x1b[33mCancelled.\x1b[0m");
        await Clients.Caller.SendAsync("InteractiveComplete", -1);
    }

    public Task ResetConversation()
    {
        ActiveConversations.TryRemove(Context.ConnectionId, out _);
        return Clients.Caller.SendAsync("InteractiveOutput", "\x1b[33mConversation reset. Next message starts a new session.\x1b[0m");
    }

    // ── Shared process runner ──

    private async Task RunClaudeProcess(
        string connectionId,
        IEnumerable<string> args,
        string outputEvent,
        string completeEvent)
    {
        var process = new Process();
        process.StartInfo = new ProcessStartInfo
        {
            FileName = ResolveClaudePath(),
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        foreach (var arg in args)
            process.StartInfo.ArgumentList.Add(arg);

        process.EnableRaisingEvents = true;
        RunningProcesses[connectionId] = process;

        process.OutputDataReceived += async (_, e) =>
        {
            if (e.Data is not null)
            {
                try { await Clients.Caller.SendAsync(outputEvent, e.Data); }
                catch { /* connection may be closed */ }
            }
        };

        process.ErrorDataReceived += async (_, e) =>
        {
            if (e.Data is not null)
            {
                try { await Clients.Caller.SendAsync(outputEvent, $"\x1b[31m{e.Data}\x1b[0m"); }
                catch { /* connection may be closed */ }
            }
        };

        try
        {
            process.Start();
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();

            await process.WaitForExitAsync(Context.ConnectionAborted);
            await Clients.Caller.SendAsync(completeEvent, process.ExitCode);
        }
        catch (OperationCanceledException)
        {
            KillProcess(connectionId);
            await Clients.Caller.SendAsync(outputEvent, "\x1b[33mCommand cancelled.\x1b[0m");
            await Clients.Caller.SendAsync(completeEvent, -1);
        }
        catch (Exception ex)
        {
            await Clients.Caller.SendAsync(outputEvent, $"\x1b[31mError: {ex.Message}\x1b[0m");
            await Clients.Caller.SendAsync(completeEvent, 1);
        }
        finally
        {
            RunningProcesses.TryRemove(connectionId, out _);
            process.Dispose();
        }
    }

    // ── Lifecycle ──

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        KillProcess(Context.ConnectionId);
        ActiveConversations.TryRemove(Context.ConnectionId, out _);
        return base.OnDisconnectedAsync(exception);
    }

    private static void KillProcess(string connectionId)
    {
        if (RunningProcesses.TryRemove(connectionId, out var process))
        {
            try
            {
                if (!process.HasExited)
                    process.Kill(entireProcessTree: true);
            }
            catch { /* already exited */ }
        }
    }

    private static IEnumerable<string> ParseArguments(string input)
    {
        var args = new List<string>();
        var current = new System.Text.StringBuilder();
        var inQuote = false;
        var quoteChar = '"';

        foreach (var c in input)
        {
            if (inQuote)
            {
                if (c == quoteChar)
                    inQuote = false;
                else
                    current.Append(c);
            }
            else if (c == '"' || c == '\'')
            {
                inQuote = true;
                quoteChar = c;
            }
            else if (c == ' ')
            {
                if (current.Length > 0)
                {
                    args.Add(current.ToString());
                    current.Clear();
                }
            }
            else
            {
                current.Append(c);
            }
        }

        if (current.Length > 0)
            args.Add(current.ToString());

        return args;
    }
}
