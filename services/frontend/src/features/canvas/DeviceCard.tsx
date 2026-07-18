import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Pause, Play, RefreshCw, Square } from "lucide-react";
import { type Epaper } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useEpaperActions } from "@/lib/queries";
import { Tooltip } from "@/components/Tooltip";
import { frameSize, usePreview } from "./usePreview";
import { formatCountdown, secondsUntilNextRefresh } from "./refresh";

/** One device on the fleet home: its live preview drawn at true dimensions, a
 * name + status dot, and quick actions (refresh now, pause/resume, stop). The
 * preview navigates to the device's own page; assignment and settings live there,
 * so home stays glanceable. */
export function DeviceCard({ epaper }: { epaper: Epaper }) {
  const { notify } = useSession();
  const navigate = useNavigate();
  const { src, bump } = usePreview(epaper);
  const { setDashboard, setRefresh, refreshNow } = useEpaperActions();

  const { w, h } = frameSize(epaper);
  const hasDashboard = epaper.dashboard_id !== null;
  const live = !epaper.paused && hasDashboard;

  // Live countdown to the next panel update, ticked once a second while serving.
  const showsCountdown = live && epaper.refresh_interval > 0;
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!showsCountdown) return;
    const t = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [showsCountdown]);
  const secsUntil = showsCountdown ? secondsUntilNextRefresh(epaper.refresh_interval) : null;

  const statusLabel = !hasDashboard
    ? "No dashboard"
    : epaper.paused
      ? "Paused"
      : epaper.refresh_interval <= 0
        ? "Live · updates continuously"
        : `Live · next update ${formatCountdown(secsUntil ?? 0)}`;

  const open = () => navigate(`/device/${epaper.id}`);

  const fail = (e: unknown) => notify("error", e instanceof Error ? e.message : String(e));

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Name + status */}
      <div className="flex items-center gap-2 max-w-full">
        <span className="font-bold text-lg truncate" title={epaper.name}>
          {epaper.name}
        </span>
        <Tooltip label={statusLabel}>
          <span
            className={`live-dot ${live ? "" : "live-dot-off"}`}
            tabIndex={0}
            role="status"
            aria-label={statusLabel}
          />
        </Tooltip>
      </div>

      {/* The live preview — clicking opens the device page. */}
      <button
        className="sketch relative overflow-hidden bg-black epaper-screen p-0"
        style={{ width: w, height: h, borderRadius: 16 }}
        aria-label={`Open ${epaper.name}`}
        onClick={open}
      >
        {hasDashboard && src ? (
          <img
            src={src}
            alt={`${epaper.name} preview`}
            className="w-full h-full object-contain pointer-events-none"
            style={{ imageRendering: "pixelated" }}
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-faint text-sm text-center px-2 bg-[var(--paper-2)]">
            {hasDashboard ? "Rendering…" : "No dashboard yet"}
          </div>
        )}
      </button>

      {/* Quick actions */}
      <div className="flex items-center gap-1.5">
        <button
          className="icon-btn"
          title="Refresh now"
          disabled={refreshNow.isPending || epaper.paused || !hasDashboard}
          onClick={() =>
            refreshNow.mutate(epaper.id, {
              onSuccess: () => {
                bump();
                notify("success", `Refreshing ${epaper.name}…`);
              },
              onError: fail,
            })
          }
        >
          {refreshNow.isPending ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
        </button>

        <button
          className="icon-btn"
          title={epaper.paused ? "Resume" : "Pause"}
          disabled={setRefresh.isPending || !hasDashboard}
          onClick={() =>
            setRefresh.mutate(
              {
                id: epaper.id,
                refresh: { paused: !epaper.paused, refresh_interval: epaper.refresh_interval },
              },
              {
                onSuccess: () =>
                  notify("success", epaper.paused ? `Resumed ${epaper.name}` : `Paused ${epaper.name}`),
                onError: fail,
              },
            )
          }
        >
          {setRefresh.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : epaper.paused ? (
            <Play size={16} />
          ) : (
            <Pause size={16} />
          )}
        </button>

        {hasDashboard && (
          <button
            className="icon-btn"
            title="Stop — clear the dashboard from this device"
            disabled={setDashboard.isPending}
            onClick={() =>
              setDashboard.mutate(
                { id: epaper.id, dashboardId: null },
                { onSuccess: () => notify("success", `Stopped ${epaper.name}`), onError: fail },
              )
            }
          >
            {setDashboard.isPending ? <Loader2 size={16} className="animate-spin" /> : <Square size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}
