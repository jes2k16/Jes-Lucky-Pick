import { useEffect, useRef, useCallback } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { getAccessToken } from "@/lib/api-client";
import "@xterm/xterm/css/xterm.css";

const PROMPT = "\x1b[32m$ \x1b[0m";
const INTERACTIVE_PROMPT = "\x1b[35mclaude> \x1b[0m";

interface TerminalProps {
  mode: "print" | "interactive";
  model: string;
}

export function Terminal({ mode, model }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const connectionRef = useRef<ReturnType<
    typeof HubConnectionBuilder.prototype.build
  > | null>(null);
  const inputBufferRef = useRef("");
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const isRunningRef = useRef(false);
  const modelRef = useRef(model);

  // Keep modelRef in sync so keystroke handler sees latest value
  useEffect(() => {
    modelRef.current = model;
  }, [model]);

  const getPrompt = useCallback(() => {
    return mode === "interactive" ? INTERACTIVE_PROMPT : PROMPT;
  }, [mode]);

  const writePrompt = useCallback(() => {
    termRef.current?.write("\r\n" + getPrompt());
    inputBufferRef.current = "";
    historyIndexRef.current = -1;
    isRunningRef.current = false;
  }, [getPrompt]);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new XTerm({
      theme: {
        background: "#1a1b26",
        foreground: "#a9b1d6",
        cursor: "#c0caf5",
        selectionBackground: "#33467c",
        black: "#1a1b26",
        red: "#f7768e",
        green: "#9ece6a",
        yellow: "#e0af68",
        blue: "#7aa2f7",
        magenta: "#bb9af7",
        cyan: "#7dcfff",
        white: "#a9b1d6",
      },
      fontFamily: "JetBrains Mono, Cascadia Code, Menlo, Consolas, monospace",
      fontSize: 14,
      cursorBlink: true,
      scrollback: 5000,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();
    termRef.current = term;

    // Welcome message
    term.writeln(
      "\x1b[36m╔══════════════════════════════════════╗\x1b[0m"
    );
    term.writeln(
      "\x1b[36m║   Jes Lucky Pick — Claude CLI       ║\x1b[0m"
    );
    term.writeln(
      "\x1b[36m╚══════════════════════════════════════╝\x1b[0m"
    );
    term.writeln("");
    term.writeln(
      `\x1b[90mModel: \x1b[36m${model}\x1b[0m`
    );
    term.writeln("");

    if (mode === "print") {
      term.writeln(
        "\x1b[90mPrint Mode — each command runs claude with the given arguments.\x1b[0m"
      );
      term.writeln("\x1b[90mExamples:\x1b[0m");
      term.writeln("\x1b[90m  --version\x1b[0m");
      term.writeln(
        '\x1b[90m  -p "say hello"\x1b[0m'
      );
      term.writeln("\x1b[90m  Ctrl+C to cancel a running command\x1b[0m");
      term.writeln(
        "\x1b[90m  Note: --model is auto-appended from the selector above\x1b[0m"
      );
    } else {
      term.writeln(
        "\x1b[90mInteractive Mode — conversational session with Claude.\x1b[0m"
      );
      term.writeln(
        "\x1b[90mType your message and press Enter. Context is maintained.\x1b[0m"
      );
      term.writeln(
        "\x1b[90m  /reset — start a new conversation\x1b[0m"
      );
      term.writeln("\x1b[90m  Ctrl+C to cancel current response\x1b[0m");
    }
    term.write("\r\n" + (mode === "interactive" ? INTERACTIVE_PROMPT : PROMPT));

    // SignalR connection
    const connection = new HubConnectionBuilder()
      .withUrl("/hubs/terminal", {
        accessTokenFactory: () => getAccessToken() ?? "",
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connectionRef.current = connection;

    // Print mode handlers
    connection.on("ReceiveOutput", (line: string) => {
      term.writeln(line);
    });

    connection.on("CommandComplete", () => {
      writePrompt();
    });

    // Interactive mode handlers
    connection.on("InteractiveOutput", (line: string) => {
      term.writeln(line);
    });

    connection.on("InteractiveComplete", () => {
      writePrompt();
    });

    connection.onreconnecting(() => {
      term.writeln("\r\n\x1b[33mReconnecting...\x1b[0m");
    });

    connection.onreconnected(() => {
      term.writeln("\x1b[32mReconnected.\x1b[0m");
      writePrompt();
    });

    connection.onclose(() => {
      term.writeln("\r\n\x1b[31mDisconnected from server.\x1b[0m");
    });

    connection.start().catch((err) => {
      term.writeln(`\r\n\x1b[31mFailed to connect: ${err}\x1b[0m`);
    });

    // Keystroke handling
    term.onData((data) => {
      if (
        !connectionRef.current ||
        connectionRef.current.state !== "Connected"
      )
        return;

      const prompt = mode === "interactive" ? INTERACTIVE_PROMPT : PROMPT;

      switch (data) {
        case "\r": {
          // Enter
          if (isRunningRef.current) break;
          const cmd = inputBufferRef.current.trim();
          term.write("\r\n");

          if (!cmd) {
            writePrompt();
            break;
          }

          historyRef.current.unshift(cmd);
          if (historyRef.current.length > 50) historyRef.current.pop();
          isRunningRef.current = true;

          if (mode === "interactive") {
            if (cmd === "/reset") {
              connectionRef.current
                .invoke("ResetConversation")
                .catch((err) => {
                  term.writeln(`\x1b[31mError: ${err}\x1b[0m`);
                })
                .finally(() => {
                  isRunningRef.current = false;
                });
            } else {
              connectionRef.current
                .invoke("SendInteractiveMessage", cmd, modelRef.current)
                .catch((err) => {
                  term.writeln(`\x1b[31mError: ${err}\x1b[0m`);
                  writePrompt();
                });
            }
          } else {
            // Print mode — auto-append --model if user didn't specify one
            let finalCmd = cmd;
            if (!cmd.includes("--model") && !cmd.startsWith("--version")) {
              finalCmd = `${cmd} --model ${modelRef.current}`;
            }
            connectionRef.current
              .invoke("SendCommand", finalCmd)
              .catch((err) => {
                term.writeln(`\x1b[31mError: ${err}\x1b[0m`);
                writePrompt();
              });
          }
          break;
        }
        case "\u007F": // Backspace
          if (!isRunningRef.current && inputBufferRef.current.length > 0) {
            inputBufferRef.current = inputBufferRef.current.slice(0, -1);
            term.write("\b \b");
          }
          break;
        case "\u0003": // Ctrl+C
          if (isRunningRef.current) {
            const method =
              mode === "interactive" ? "CancelInteractive" : "CancelCommand";
            connectionRef.current.invoke(method).catch(() => {});
          } else {
            term.write("^C");
            writePrompt();
          }
          break;
        case "\u001b[A": {
          // Arrow Up
          if (isRunningRef.current) break;
          const nextIdx = historyIndexRef.current + 1;
          if (nextIdx < historyRef.current.length) {
            historyIndexRef.current = nextIdx;
            term.write(
              "\r" +
                prompt +
                " ".repeat(inputBufferRef.current.length) +
                "\r" +
                prompt
            );
            const historyCmd = historyRef.current[nextIdx];
            inputBufferRef.current = historyCmd;
            term.write(historyCmd);
          }
          break;
        }
        case "\u001b[B": {
          // Arrow Down
          if (isRunningRef.current) break;
          term.write(
            "\r" +
              prompt +
              " ".repeat(inputBufferRef.current.length) +
              "\r" +
              prompt
          );
          if (historyIndexRef.current > 0) {
            historyIndexRef.current--;
            const historyCmd =
              historyRef.current[historyIndexRef.current];
            inputBufferRef.current = historyCmd;
            term.write(historyCmd);
          } else {
            historyIndexRef.current = -1;
            inputBufferRef.current = "";
          }
          break;
        }
        default:
          if (!isRunningRef.current && data >= " ") {
            inputBufferRef.current += data;
            term.write(data);
          }
          break;
      }
    });

    // Resize observer
    const observer = new ResizeObserver(() => {
      fitAddon.fit();
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      connection.stop();
      term.dispose();
    };
  }, [mode, model, writePrompt, getPrompt]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full rounded-md overflow-hidden"
    />
  );
}
