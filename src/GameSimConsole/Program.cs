// Small console app to simulate the AI Training game loop
// 1 Manager, 3 Experts, 6/42 lotto — random guesses (simulating AI fallback)
// Purpose: observe round-by-round flow, scoring, and elimination behavior

var random = new Random();

// ── Game settings ──
const int NumberRangeMin = 1;
const int NumberRangeMax = 42;
const int CombinationSize = 6;
const int TriesPerRound = 6;
const int EliminationThreshold = 2; // score < 2 → eliminated
const int ExpertsPerManager = 3;

string[] personalities = ["Scanner", "Sticky", "Gambler"];
string[] names = ["Alpha", "Bravo", "Charlie"];

// ── Generate secret combination ──
int[] GenerateSecret()
{
    var secret = new HashSet<int>();
    while (secret.Count < CombinationSize)
        secret.Add(random.Next(NumberRangeMin, NumberRangeMax + 1));
    return [.. secret.OrderBy(n => n)];
}

// ── Generate a random guess ──
int[] GenerateGuess()
{
    var guess = new HashSet<int>();
    while (guess.Count < CombinationSize)
        guess.Add(random.Next(NumberRangeMin, NumberRangeMax + 1));
    return [.. guess.OrderBy(n => n)];
}

// ── Score a guess ──
int ScoreGuess(int[] guess, int[] secret)
{
    var secretSet = new HashSet<int>(secret);
    return guess.Count(n => secretSet.Contains(n));
}

// ── Run one full game ──
(int rounds, bool winner) RunGame(bool verbose)
{
    var secret = GenerateSecret();
    var active = new bool[ExpertsPerManager];
    Array.Fill(active, true);
    var bestScores = new int[ExpertsPerManager];

    if (verbose)
    {
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine("╔══════════════════════════════════════════════╗");
        Console.WriteLine("║      AI TRAINING GAME — 1 MGR / 3 EXPERTS  ║");
        Console.WriteLine("╚══════════════════════════════════════════════╝");
        Console.ResetColor();
        Console.WriteLine($"  Secret : [{string.Join(", ", secret)}]");
        Console.WriteLine($"  Rules  : {TriesPerRound} tries/round, elim if best < {EliminationThreshold}★");
        Console.WriteLine();
    }

    int round = 0;

    while (true)
    {
        round++;
        Array.Clear(bestScores);
        int activeCount = active.Count(a => a);

        if (verbose)
        {
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine($"── Round {round}  ({activeCount} expert(s) active) ──");
            Console.ResetColor();
        }

        for (int e = 0; e < ExpertsPerManager; e++)
        {
            if (!active[e]) continue;

            if (verbose)
            {
                Console.ForegroundColor = ConsoleColor.DarkGray;
                Console.Write($"  {names[e],7} ({personalities[e],8}): ");
                Console.ResetColor();
            }

            bool won = false;
            for (int t = 1; t <= TriesPerRound; t++)
            {
                var guess = GenerateGuess();
                int stars = ScoreGuess(guess, secret);
                if (stars > bestScores[e]) bestScores[e] = stars;

                if (verbose)
                {
                    string starStr = new string('★', stars) + new string('☆', CombinationSize - stars);
                    Console.ForegroundColor = stars >= 3 ? ConsoleColor.Green
                                            : stars >= 2 ? ConsoleColor.DarkYellow
                                            : ConsoleColor.DarkGray;
                    Console.Write($"T{t}:{starStr} ");
                    Console.ResetColor();
                }

                if (stars >= 5)
                {
                    if (verbose)
                    {
                        Console.WriteLine();
                        Console.ForegroundColor = ConsoleColor.Magenta;
                        Console.WriteLine($"  🏆 {names[e]} WINS with {stars}★! Guess=[{string.Join(", ", guess)}]");
                        Console.ResetColor();
                    }
                    won = true;
                    break;
                }
            }

            if (won) return (round, true);

            if (verbose)
            {
                Console.ForegroundColor = bestScores[e] >= EliminationThreshold ? ConsoleColor.Green : ConsoleColor.Red;
                Console.WriteLine($"→ best {bestScores[e]}★");
                Console.ResetColor();
            }
        }

        // Elimination phase
        if (verbose)
        {
            Console.Write("  Elim: ");
        }

        for (int e = 0; e < ExpertsPerManager; e++)
        {
            if (!active[e]) continue;
            if (bestScores[e] < EliminationThreshold)
            {
                active[e] = false;
                if (verbose)
                {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.Write($"☠{names[e]}  ");
                    Console.ResetColor();
                }
            }
            else if (verbose)
            {
                Console.ForegroundColor = ConsoleColor.Green;
                Console.Write($"✓{names[e]}  ");
                Console.ResetColor();
            }
        }

        if (verbose) Console.WriteLine();

        if (!active.Any(a => a))
        {
            if (verbose)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("  → All experts eliminated. No winner.");
                Console.ResetColor();
            }
            return (round, false);
        }

        if (verbose) Console.WriteLine();
        if (round >= 200) return (round, false);
    }
}

// ── Run one verbose game ──
var sw = System.Diagnostics.Stopwatch.StartNew();
var (singleRounds, singleWinner) = RunGame(verbose: true);
sw.Stop();

Console.WriteLine();
Console.ForegroundColor = ConsoleColor.Cyan;
Console.WriteLine($"  Result      : {(singleWinner ? "Winner found" : "All eliminated")} after {singleRounds} round(s)");
Console.WriteLine($"  ⏱ Wall-clock: {sw.ElapsedMilliseconds} ms  ← this is why AI mode feels instant!");
Console.ResetColor();
Console.WriteLine();

// ── Statistics across 10,000 simulations ──
Console.ForegroundColor = ConsoleColor.Yellow;
Console.WriteLine("══ 10,000 simulation statistics (random guesses) ══");
Console.ResetColor();

int totalRounds = 0, winners = 0, allElim = 0, maxR = 0, minR = int.MaxValue;
var dist = new Dictionary<int, int>();

for (int i = 0; i < 10_000; i++)
{
    var (r, w) = RunGame(verbose: false);
    totalRounds += r;
    if (w) winners++; else allElim++;
    if (r > maxR) maxR = r;
    if (r < minR) minR = r;
    dist.TryGetValue(r, out int c);
    dist[r] = c + 1;
}

Console.WriteLine($"  Winners found  : {winners,5}  ({winners / 100.0:F1}%)");
Console.WriteLine($"  All eliminated : {allElim,5}  ({allElim / 100.0:F1}%)");
Console.WriteLine($"  Avg rounds     : {totalRounds / 10_000.0:F2}");
Console.WriteLine($"  Min / Max      : {minR} / {maxR}");
Console.WriteLine();
Console.WriteLine("  Round distribution:");
foreach (var (r, c) in dist.OrderBy(kv => kv.Key).Take(15))
{
    string bar = new string('█', c / 100);
    Console.WriteLine($"    Round {r,3}: {c,5} games ({c / 100.0:F1}%)  {bar}");
}
if (dist.Count > 15)
    Console.WriteLine($"    ... and {dist.Count - 15} more round values");

Console.WriteLine();
Console.ForegroundColor = ConsoleColor.Yellow;
Console.WriteLine("══ ROOT CAUSE SUMMARY ══");
Console.ResetColor();
Console.WriteLine("  With random guessing (AI call fallback), a full game");
Console.WriteLine("  completes in < 1 ms — multiple rounds, all instant.");
Console.WriteLine();
Console.WriteLine("  AI mode has NO pacing between tries, unlike Simulation");
Console.WriteLine("  mode which uses setInterval(tick, simulationSpeedMs).");
Console.WriteLine();
Console.WriteLine("  FIX: add await delay(simulationSpeedMs) at the start");
Console.WriteLine("  of each try in runExpertAllTries() so the game is");
Console.WriteLine("  watchable whether AI calls succeed or fall back.");
