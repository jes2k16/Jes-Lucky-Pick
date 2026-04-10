/**
 * Timer Web Worker
 *
 * Runs setInterval off the main thread so it is NOT throttled when the
 * browser tab is hidden (unlike main-thread timers which are clamped to
 * ~1 second in background tabs).
 *
 * Messages IN  (main → worker):
 *   { type: 'start-tick',     ms: number }  – start the simulation tick interval
 *   { type: 'stop-tick' }                   – stop the simulation tick interval
 *   { type: 'start-countdown' }             – start a 1-second countdown interval
 *   { type: 'stop-countdown' }              – stop the countdown interval
 *   { type: 'stop-all' }                    – stop both intervals
 *
 * Messages OUT (worker → main):
 *   { type: 'tick' }        – fired at simulationSpeedMs
 *   { type: 'countdown' }   – fired every 1000 ms
 */

let tickId: ReturnType<typeof setInterval> | null = null;
let countdownId: ReturnType<typeof setInterval> | null = null;

self.onmessage = (e: MessageEvent<{ type: string; ms?: number }>) => {
  const { type, ms } = e.data;

  switch (type) {
    case "start-tick":
      if (tickId !== null) clearInterval(tickId);
      tickId = setInterval(() => self.postMessage({ type: "tick" }), ms ?? 500);
      break;

    case "stop-tick":
      if (tickId !== null) {
        clearInterval(tickId);
        tickId = null;
      }
      break;

    case "start-countdown":
      if (countdownId !== null) clearInterval(countdownId);
      countdownId = setInterval(() => self.postMessage({ type: "countdown" }), 1000);
      break;

    case "stop-countdown":
      if (countdownId !== null) {
        clearInterval(countdownId);
        countdownId = null;
      }
      break;

    case "stop-all":
      if (tickId !== null) { clearInterval(tickId); tickId = null; }
      if (countdownId !== null) { clearInterval(countdownId); countdownId = null; }
      break;
  }
};
