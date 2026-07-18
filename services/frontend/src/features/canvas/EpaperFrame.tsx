import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, Ruler, Settings, Square, Timer } from "lucide-react";
import { api, type Epaper } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Tooltip } from "@/components/Tooltip";

/** How often the preview re-fetches the panel's BMP when the epaper has no
 * refresh interval set (interval 0 = "always serving"): often enough to feel
 * live without hammering the render. */
const DEFAULT_PREVIEW_INTERVAL_S = 30;

/** Length of the serve window in seconds — must match the backend's
 * SERVE_WINDOW_SECONDS in epaper_router.py, since the next-refresh countdown is
 * derived from the same wall-clock schedule the device serve endpoint uses. */
const SERVE_WINDOW_SECONDS = 8;

/** Seconds until the next serve window opens, mirroring `should_serve_now`:
 * the timeline splits into repeating periods of SERVE_WINDOW (serving) +
 * refresh_interval (idle), and only the leading window serves. Returns 0 while
 * currently inside a serve window. */
function secondsUntilNextRefresh(refreshIntervalS: number, nowMs = Date.now()): number {
  const period = SERVE_WINDOW_SECONDS + refreshIntervalS;
  const posInPeriod = (nowMs / 1000) % period;
  if (posInPeriod < SERVE_WINDOW_SECONDS) return 0; // serving right now
  return Math.ceil(period - posInPeriod);
}

/** "in 1:05" / "in 42s" for a seconds count. */
function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return "now";
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m > 0 ? `in ${m}:${String(s).padStart(2, "0")}` : `in ${s}s`;
}

/** Longest edge an epaper frame is allowed to occupy on the canvas. The device is
 * drawn at its *true* aspect ratio, scaled so its longest side hits this. */
const MAX_EDGE = 320;

function frameSize(e: Epaper): { w: number; h: number; scale: number } {
  const quarter = e.rotation === 90 || e.rotation === 270;
  const outW = quarter ? e.screen_height : e.screen_width;
  const outH = quarter ? e.screen_width : e.screen_height;
  const scale = MAX_EDGE / Math.max(outW, outH);
  return { w: Math.round(outW * scale), h: Math.round(outH * scale), scale };
}

/** A single e-paper drawn at its true dimensions, with its name, a live dot, and
 * a little toolbar (settings, refresh rate, geometry, instant refresh). It shows
 * the deployed dashboard's live preview laid out at the device's geometry. When
 * the canvas is in "assign" mode it shows a clickable overlay to place a
 * dashboard, and it also accepts drag-and-drop. */
export function EpaperFrame({
  epaper,
  highlight,
  onAssign,
  onOpenSettings,
  onOpenRefresh,
  onOpenGeometry,
  onDropDashboard,
}: {
  epaper: Epaper;
  /** True while a dashboard is being placed — show the pick overlay. */
  highlight: boolean;
  /** Clicked the overlay to assign the pending dashboard here. */
  onAssign: () => void;
  onOpenSettings: () => void;
  onOpenRefresh: () => void;
  onOpenGeometry: () => void;
  /** A dashboard id was dropped onto this frame. */
  onDropDashboard: (dashboardId: string) => void;
}) {
  const { token, notify, upsertEpaper } = useSession();
  const [refreshing, setRefreshing] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  // Object URL of the last successfully fetched panel BMP. Held in state so the
  // <img> updates, and in a ref so we can revoke the previous one on replace.
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const previewSrcRef = useRef<string | null>(null);

  const { w, h } = frameSize(epaper);
  const live = !epaper.paused && epaper.dashboard_id !== null;
  const hasDashboard = epaper.dashboard_id !== null;

  // Fetch the real panel BMP and re-fetch on the epaper's refresh cadence, so the
  // preview mirrors exactly what the device shows. Keyed on the fields that change
  // the rendered image (dashboard + geometry) and the refresh interval, so editing
  // any of them re-pulls immediately. `bump` lets an instant-refresh re-pull too.
  const [bump, setBump] = useState(0);
  useEffect(() => {
    if (!hasDashboard) {
      setPreviewSrc(null);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const url = await api.previewBitmap(token, epaper.id);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        if (previewSrcRef.current) URL.revokeObjectURL(previewSrcRef.current);
        previewSrcRef.current = url;
        setPreviewSrc(url);
      } catch {
        // Leave the last good frame up on a transient failure.
      }
    }
    void load();
    const periodS = epaper.refresh_interval > 0 ? epaper.refresh_interval : DEFAULT_PREVIEW_INTERVAL_S;
    const timer = window.setInterval(() => void load(), periodS * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [
    token,
    epaper.id,
    epaper.dashboard_id,
    epaper.refresh_interval,
    epaper.screen_width,
    epaper.screen_height,
    epaper.image_width,
    epaper.image_height,
    epaper.image_x,
    epaper.image_y,
    epaper.rotation,
    hasDashboard,
    bump,
  ]);

  // Revoke the final object URL when the frame unmounts.
  useEffect(
    () => () => {
      if (previewSrcRef.current) URL.revokeObjectURL(previewSrcRef.current);
    },
    [],
  );

  // Tick once a second so the next-refresh countdown stays live. Only runs while
  // the epaper is actively serving on an interval (a countdown to show at all).
  const showsCountdown = live && epaper.refresh_interval > 0;
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!showsCountdown) return;
    const t = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [showsCountdown]);

  // Seconds until the next panel update (only meaningful while serving on an
  // interval). Recomputed each render, and the 1s ticker above keeps it fresh.
  const secsUntil = showsCountdown ? secondsUntilNextRefresh(epaper.refresh_interval) : null;

  // Status-dot tooltip: the live/paused state plus, when serving on an interval,
  // a live countdown to the next panel update (interval 0 = always serving).
  const statusTooltip = !hasDashboard
    ? "No dashboard"
    : epaper.paused
      ? "Paused"
      : epaper.refresh_interval <= 0
        ? "Live · updates continuously"
        : `Live · next update ${formatCountdown(secsUntil ?? 0)}`;

  // Heads-up popover: auto-show a refresh warning in the final 15s before the
  // panel updates, then let it hide once the window opens (secsUntil hits 0).
  const REFRESH_HEADS_UP_S = 15;
  const imminent = secsUntil !== null && secsUntil > 0 && secsUntil <= REFRESH_HEADS_UP_S;
  const headsUpLabel = imminent ? `Refreshing in ${secsUntil}s…` : statusTooltip;

  async function instantRefresh() {
    setRefreshing(true);
    try {
      upsertEpaper(await api.refreshNow(token, epaper.id));
      setBump((b) => b + 1); // re-pull the preview so it reflects the fresh render
      notify("success", `Refreshing ${epaper.name}…`);
    } catch (e) {
      notify("error", e instanceof Error ? e.message : String(e));
    } finally {
      setRefreshing(false);
    }
  }

  // Clear the deployed dashboard so the board goes empty and its live dot turns
  // off. Passing null to setDashboard removes it (and stops the device serving).
  async function stopDashboard() {
    setStopping(true);
    try {
      upsertEpaper(await api.setDashboard(token, epaper.id, null));
      notify("success", `Stopped ${epaper.name}`);
    } catch (e) {
      notify("error", e instanceof Error ? e.message : String(e));
    } finally {
      setStopping(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Header: name + live dot */}
      <div className="flex items-center gap-2 max-w-full">
        <span className="font-hand font-bold text-lg truncate" title={epaper.name}>
          {epaper.name}
        </span>
        <Tooltip label={headsUpLabel} open={imminent}>
          <span
            className={`live-dot ${live ? "" : "live-dot-off"}`}
            tabIndex={0}
            role="status"
            aria-label={statusTooltip}
          />
        </Tooltip>
      </div>

      {/* The screen, at true dimensions. Clicking it opens settings (unless the
          canvas is in assign mode, where the overlay claims the click). */}
      <div
        className={`sketch relative overflow-hidden bg-black ${dragOver ? "drop-target" : ""} ${
          highlight ? "" : "epaper-screen"
        }`}
        style={{ width: w, height: h, borderRadius: 16 }}
        role={highlight ? undefined : "button"}
        tabIndex={highlight ? undefined : 0}
        aria-label={highlight ? undefined : `Open settings for ${epaper.name}`}
        onClick={highlight ? undefined : onOpenSettings}
        onKeyDown={
          highlight
            ? undefined
            : (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpenSettings();
                }
              }
        }
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const id = e.dataTransfer.getData("text/dashboard-id");
          if (id) onDropDashboard(id);
        }}
      >
        {hasDashboard && previewSrc ? (
          // The BMP is already the full screen (composited + rotated by the
          // backend), so its pixel dimensions match the frame's post-rotation
          // aspect ratio. Just fill the frame box — no CSS rotation or geometry
          // math needed; this is a true 1:1 of what the panel displays.
          <img
            src={previewSrc}
            alt={`${epaper.name} preview`}
            className="w-full h-full object-contain pointer-events-none"
            style={{ imageRendering: "pixelated" }}
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-faint text-sm text-center px-2 bg-[var(--paper-2)]">
            {hasDashboard ? "Rendering…" : "Drop a dashboard here"}
          </div>
        )}

        {highlight && (
          <button
            className="drop-overlay text-lg"
            onClick={onAssign}
            aria-label={`Show this dashboard on ${epaper.name}`}
          >
            Tap to show here
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1.5">
        <button className="icon-btn" title="Settings" onClick={onOpenSettings}>
          <Settings size={16} />
        </button>
        <button className="icon-btn" title="Refresh rate" onClick={onOpenRefresh}>
          <Timer size={16} />
        </button>
        <button className="icon-btn" title="Geometry" onClick={onOpenGeometry}>
          <Ruler size={16} />
        </button>
        <button
          className="icon-btn"
          title="Refresh now"
          disabled={refreshing || epaper.paused}
          onClick={() => void instantRefresh()}
        >
          {refreshing ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
        </button>
        {hasDashboard && (
          <button
            className="icon-btn"
            title="Stop — remove the dashboard from this board"
            disabled={stopping}
            onClick={() => void stopDashboard()}
          >
            {stopping ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Square size={16} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
