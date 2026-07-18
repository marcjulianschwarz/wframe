import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Pause, Play, RefreshCw, Ruler, Settings, Timer } from "lucide-react";
import { Modal } from "@/components/Modal";
import { DisplayGeometryForm } from "@/features/epaper/DisplayGeometryForm";
import { RefreshControl } from "@/features/epaper/RefreshControl";
import { EpaperEditModal } from "@/features/epaper/EpaperEditModal";
import {
  type Dashboard,
  type Epaper,
  type EpaperGeometry,
  type EpaperRefresh,
  type Rotation,
} from "@/lib/api";
import { useSession } from "@/lib/session";
import { useDashboards, useEpaperActions, useEpapers } from "@/lib/queries";
import { frameSize, usePreview } from "./usePreview";

function pickGeometry(e: Epaper): EpaperGeometry {
  return {
    screen_width: e.screen_width,
    screen_height: e.screen_height,
    image_width: e.image_width,
    image_height: e.image_height,
    image_x: e.image_x,
    image_y: e.image_y,
    rotation: e.rotation as Rotation,
  };
}

type SettingsModal = "settings" | "geometry" | "refresh" | null;

/** One device, in full: a large live preview, the "what it's showing" chooser
 * (live-preview tiles of your dashboards — this is where a playlist will grow),
 * and settings (name, geometry, refresh). Reached at /device/:id from home. */
export function DevicePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notify } = useSession();
  const dash = useDashboards();
  const epapers = useEpapers();
  const actions = useEpaperActions();
  const epaper = epapers.find((e) => e.id === id) ?? null;

  const [modal, setModal] = useState<SettingsModal>(null);
  const [geometry, setGeometry] = useState<EpaperGeometry | null>(null);
  const [refresh, setRefresh] = useState<EpaperRefresh | null>(null);

  const { src, bump } = usePreview(epaper ?? ({ dashboard_id: null } as Epaper));
  const busy =
    actions.setDashboard.isPending ||
    actions.setRefresh.isPending ||
    actions.setGeometry.isPending ||
    actions.refreshNow.isPending;

  if (!epaper) {
    return (
      <div className="min-h-screen px-6 py-6 flex flex-col items-center gap-4">
        <p className="text-soft text-lg">This device doesn’t exist.</p>
        <Link to="/" className="btn">
          <ArrowLeft size={16} /> Back to devices
        </Link>
      </div>
    );
  }

  const hasDashboard = epaper.dashboard_id !== null;
  const live = !epaper.paused && hasDashboard;
  const { w, h } = frameSize(epaper, 420);

  const fail = (e: unknown) => notify("error", e instanceof Error ? e.message : String(e));

  async function assign(dashboard: Dashboard) {
    const cleared = dashboard.id === epaper!.dashboard_id;
    try {
      await actions.setDashboard.mutateAsync({
        id: epaper!.id,
        dashboardId: cleared ? null : dashboard.id,
      });
      notify("success", cleared ? "Cleared dashboard" : `Showing "${dashboard.name}"`);
    } catch (e) {
      fail(e);
    }
  }

  function togglePause() {
    actions.setRefresh.mutate(
      {
        id: epaper!.id,
        refresh: { paused: !epaper!.paused, refresh_interval: epaper!.refresh_interval },
      },
      { onError: fail },
    );
  }

  function refreshNow() {
    actions.refreshNow.mutate(epaper!.id, {
      onSuccess: () => {
        bump();
        notify("success", "Refreshing…");
      },
      onError: fail,
    });
  }

  function openGeometry() {
    setGeometry(pickGeometry(epaper!));
    setModal("geometry");
  }
  function openRefresh() {
    setRefresh({ paused: epaper!.paused, refresh_interval: epaper!.refresh_interval });
    setModal("refresh");
  }

  function saveGeometry() {
    if (!geometry) return;
    actions.setGeometry.mutate(
      { id: epaper!.id, geometry },
      {
        onSuccess: () => {
          notify("success", "Saved geometry");
          setModal(null);
        },
        onError: fail,
      },
    );
  }

  function saveRefresh() {
    if (!refresh) return;
    actions.setRefresh.mutate(
      { id: epaper!.id, refresh },
      {
        onSuccess: () => {
          notify("success", "Saved refresh settings");
          setModal(null);
        },
        onError: fail,
      },
    );
  }

  return (
    <div className="min-h-screen px-6 py-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link to="/" className="icon-btn" aria-label="Back to devices">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-bold m-0 truncate">{epaper.name}</h1>
        <span
          className={`live-dot ${live ? "" : "live-dot-off"}`}
          role="status"
          aria-label={live ? "Live" : epaper.paused ? "Paused" : "No dashboard"}
        />
        <div className="ml-auto flex items-center gap-2">
          <button className="btn" disabled={busy || epaper.paused || !hasDashboard} onClick={() => void refreshNow()}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="btn" disabled={busy || !hasDashboard} onClick={() => void togglePause()}>
            {epaper.paused ? <Play size={16} /> : <Pause size={16} />}
            {epaper.paused ? "Resume" : "Pause"}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-10 items-start">
        {/* Live preview */}
        <div className="flex flex-col items-center gap-3 shrink-0">
          <div
            className="sketch relative overflow-hidden bg-black"
            style={{ width: w, height: h, borderRadius: 18 }}
          >
            {hasDashboard && src ? (
              <img
                src={src}
                alt={`${epaper.name} preview`}
                className="w-full h-full object-contain"
                style={{ imageRendering: "pixelated" }}
                draggable={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-faint text-sm text-center px-2 bg-[var(--paper-2)]">
                {hasDashboard ? "Rendering…" : "No dashboard yet"}
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="flex items-center gap-1.5">
            <button className="icon-btn" title="Settings" onClick={() => setModal("settings")}>
              <Settings size={16} />
            </button>
            <button className="icon-btn" title="Refresh rate" onClick={openRefresh}>
              <Timer size={16} />
            </button>
            <button className="icon-btn" title="Geometry" onClick={openGeometry}>
              <Ruler size={16} />
            </button>
          </div>
        </div>

        {/* What it's showing */}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold mb-1">What it’s showing</h2>
          <p className="text-soft text-sm mb-4">
            Pick a dashboard to display. A rotating playlist is coming here.
          </p>

          {dash.dashboards.length === 0 ? (
            <p className="text-soft text-sm">
              No dashboards yet — add one from the Store on the home screen.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {dash.dashboards.map((d) => (
                <DashboardTile
                  key={d.id}
                  dashboard={d}
                  epaper={epaper}
                  current={d.id === epaper.dashboard_id}
                  onPick={() => void assign(d)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- Setting modals --- */}
      {modal === "settings" && (
        <EpaperEditModal
          epaper={epaper}
          onClose={() => setModal(null)}
          onDeleted={() => navigate("/")}
        />
      )}

      {modal === "geometry" && geometry && (
        <Modal
          title={`Geometry — ${epaper.name}`}
          onClose={() => setModal(null)}
          actions={
            <>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-accent" disabled={busy} onClick={() => void saveGeometry()}>
                {busy ? "Saving…" : "Save"}
              </button>
            </>
          }
        >
          <DisplayGeometryForm value={geometry} onChange={setGeometry} disabled={busy} />
        </Modal>
      )}

      {modal === "refresh" && refresh && (
        <Modal
          title={`Refresh — ${epaper.name}`}
          onClose={() => setModal(null)}
          actions={
            <>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-accent" disabled={busy} onClick={() => void saveRefresh()}>
                {busy ? "Saving…" : "Save"}
              </button>
            </>
          }
        >
          <RefreshControl value={refresh} onChange={setRefresh} disabled={busy} />
        </Modal>
      )}
    </div>
  );
}

/** A dashboard offered to a device. Clicking it makes it live (or clears it if it
 * was already the current one); the big preview above is the source of truth for
 * how the selection actually looks on this device. The current one is badged. */
function DashboardTile({
  dashboard,
  current,
  onPick,
}: {
  dashboard: Dashboard;
  epaper: Epaper;
  current: boolean;
  onPick: () => void;
}) {
  return (
    <button
      className="sketch relative flex flex-col gap-1 p-3 text-left h-full"
      style={current ? { boxShadow: "3px 3px 0 var(--accent)" } : undefined}
      title={current ? "Showing — tap to clear" : `Show "${dashboard.name}"`}
      onClick={onPick}
    >
      {current && (
        <span
          className="absolute top-2 right-2 rounded-full p-0.5"
          style={{ background: "var(--accent)", color: "white" }}
        >
          <Check size={12} />
        </span>
      )}
      <span className="font-bold break-words pr-5">{dashboard.name}</span>
      <span className="text-xs text-soft break-words">
        {dashboard.description || dashboard.custom_url || dashboard.type || "custom"}
      </span>
      {current && (
        <span className="text-xs font-bold mt-1" style={{ color: "var(--accent)" }}>
          Live now
        </span>
      )}
    </button>
  );
}
