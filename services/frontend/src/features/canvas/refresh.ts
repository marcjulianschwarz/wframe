/** Length of the serve window in seconds — must match the backend's
 * SERVE_WINDOW_SECONDS in epaper_router.py, since the next-refresh countdown is
 * derived from the same wall-clock schedule the device serve endpoint uses. */
export const SERVE_WINDOW_SECONDS = 8;

/** Seconds until the next serve window opens, mirroring `should_serve_now`:
 * the timeline splits into repeating periods of SERVE_WINDOW (serving) +
 * refresh_interval (idle), and only the leading window serves. Returns 0 while
 * currently inside a serve window. */
export function secondsUntilNextRefresh(refreshIntervalS: number, nowMs = Date.now()): number {
  const period = SERVE_WINDOW_SECONDS + refreshIntervalS;
  const posInPeriod = (nowMs / 1000) % period;
  if (posInPeriod < SERVE_WINDOW_SECONDS) return 0; // serving right now
  return Math.ceil(period - posInPeriod);
}

/** "in 1:05" / "in 42s" for a seconds count. */
export function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return "now";
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m > 0 ? `in ${m}:${String(s).padStart(2, "0")}` : `in ${s}s`;
}
