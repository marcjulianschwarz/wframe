import { useCallback, useEffect, useState } from "react";
import { LogOut, Plus, Store } from "lucide-react";
import { Modal } from "@/components/Modal";
import { StoreModal } from "@/features/store/StoreModal";
import { CreateCustomForm } from "@/features/dashboard/CreateCustomForm";
import { DashboardConfig } from "@/features/dashboard/DashboardConfig";
import { DisplayGeometryForm } from "@/features/epaper/DisplayGeometryForm";
import { RefreshControl } from "@/features/epaper/RefreshControl";
import { EpaperEditModal } from "@/features/epaper/EpaperEditModal";
import {
  api,
  type Dashboard,
  type Epaper,
  type EpaperGeometry,
  type EpaperRefresh,
  type Rotation,
} from "@/lib/api";
import { useSession } from "@/lib/session";
import { DashboardCard } from "./DashboardCard";
import { EpaperFrame } from "./EpaperFrame";

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

type EpaperModal =
  | { kind: "settings" | "geometry" | "refresh"; epaper: Epaper }
  | null;

/** The whole app on one playful desk: e-papers across the top drawn at their true
 * dimensions, dashboard cards below. Place a dashboard by tapping a card's plus
 * (then tap the epaper) or by dragging the card onto an epaper. */
export function Canvas() {
  const { token, user, logout, epapers, upsertEpaper, setEpapers, refreshEpapers, notify } =
    useSession();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  // The dashboard being placed (plus-armed); tapping an epaper assigns it.
  const [arming, setArming] = useState<Dashboard | null>(null);
  const [creating, setCreating] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [editing, setEditing] = useState<Dashboard | null>(null);
  const [modal, setModal] = useState<EpaperModal>(null);
  const [busy, setBusy] = useState(false);

  // Draft state for the geometry/refresh modals.
  const [geometry, setGeometry] = useState<EpaperGeometry | null>(null);
  const [refresh, setRefresh] = useState<EpaperRefresh | null>(null);

  const loadDashboards = useCallback(async () => {
    try {
      setDashboards(await api.listDashboards(token));
    } catch (e) {
      notify("error", e instanceof Error ? e.message : String(e));
    }
  }, [token, notify]);

  useEffect(() => {
    void loadDashboards();
  }, [loadDashboards]);

  const liveOn = (d: Dashboard): Epaper[] =>
    epapers.filter((e) => e.dashboard_id === d.id);

  // Send a dashboard to a specific epaper.
  async function assign(dashboard: Dashboard, epaper: Epaper) {
    try {
      upsertEpaper(await api.setDashboard(token, epaper.id, dashboard.id));
      notify("success", `Showing "${dashboard.name}" on ${epaper.name}`);
    } catch (e) {
      notify("error", e instanceof Error ? e.message : String(e));
    }
  }

  // Clear a dashboard from every device showing it.
  async function stop(dashboard: Dashboard) {
    const targets = liveOn(dashboard);
    try {
      for (const e of targets) {
        upsertEpaper(await api.setDashboard(token, e.id, null));
      }
      notify("success", `Stopped "${dashboard.name}"`);
    } catch (e) {
      notify("error", e instanceof Error ? e.message : String(e));
    }
  }

  async function addEpaper() {
    setBusy(true);
    try {
      const created = await api.createEpaper(token, "New epaper");
      upsertEpaper(created);
      notify("success", "Added an epaper");
      // Open its settings straight away so the user can name it and grab its URL.
      setModal({ kind: "settings", epaper: created });
    } catch (e) {
      notify("error", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function openSettings(epaper: Epaper) {
    setModal({ kind: "settings", epaper });
  }
  function openGeometry(epaper: Epaper) {
    setGeometry(pickGeometry(epaper));
    setModal({ kind: "geometry", epaper });
  }
  function openRefresh(epaper: Epaper) {
    setRefresh({ paused: epaper.paused, refresh_interval: epaper.refresh_interval });
    setModal({ kind: "refresh", epaper });
  }

  async function saveGeometry() {
    if (!modal || modal.kind !== "geometry" || !geometry) return;
    setBusy(true);
    try {
      upsertEpaper(await api.setGeometry(token, modal.epaper.id, geometry));
      notify("success", "Saved geometry");
      setModal(null);
    } catch (e) {
      notify("error", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function saveRefresh() {
    if (!modal || modal.kind !== "refresh" || !refresh) return;
    setBusy(true);
    try {
      upsertEpaper(await api.setRefresh(token, modal.epaper.id, refresh));
      notify("success", "Saved refresh settings");
      setModal(null);
    } catch (e) {
      notify("error", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen px-6 py-6" onClick={() => arming && setArming(null)}>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8" onClick={(e) => e.stopPropagation()}>
        <span className="font-hand text-2xl font-bold">wframe</span>
        <div className="flex items-center gap-2">
          <button
            className="btn"
            disabled={busy}
            onClick={() => void addEpaper()}
            title="Add an epaper"
          >
            <Plus size={16} />
            Epaper
          </button>
          <button
            className="btn"
            onClick={() => setCreating(true)}
            title="Create a dashboard"
          >
            <Plus size={16} />
            Dashboard
          </button>
          <button className="btn" onClick={() => setBrowsing(true)}>
            <Store size={16} />
            Store
          </button>
          <button
            className="icon-btn"
            title={user?.email ? `Sign out (${user.email})` : "Sign out"}
            onClick={logout}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Epapers */}
      <div className="flex flex-wrap items-end justify-center gap-10 mb-16">
        {epapers.map((e) => (
          <div key={e.id} onClick={(ev) => ev.stopPropagation()}>
            <EpaperFrame
              epaper={e}
              highlight={arming !== null}
              onAssign={() => {
                if (arming) {
                  void assign(arming, e);
                  setArming(null);
                }
              }}
              onOpenSettings={() => openSettings(e)}
              onOpenRefresh={() => openRefresh(e)}
              onOpenGeometry={() => openGeometry(e)}
              onDropDashboard={(id) => {
                const d = dashboards.find((x) => x.id === id);
                if (d) void assign(d, e);
              }}
            />
          </div>
        ))}
      </div>

      {/* Hint while placing */}
      {arming && (
        <p className="text-center font-hand text-lg mb-6" style={{ color: "var(--accent)" }}>
          Tap an epaper to show “{arming.name}” — or drag any card onto one.
        </p>
      )}

      {/* Dashboards */}
      <div className="flex flex-wrap justify-center gap-4">
        {dashboards.map((d) => (
          <div key={d.id} onClick={(ev) => ev.stopPropagation()}>
            <DashboardCard
              dashboard={d}
              liveOn={liveOn(d)}
              arming={arming?.id === d.id}
              onArm={() => setArming((cur) => (cur?.id === d.id ? null : d))}
              onEdit={() => setEditing(d)}
              onStop={() => void stop(d)}
            />
          </div>
        ))}
        {dashboards.length === 0 && (
          <p className="text-soft text-sm font-hand text-lg">
            No dashboards yet — add one from the Store or make your own.
          </p>
        )}
      </div>

      {/* --- Modals --- */}
      {browsing && (
        <StoreModal
          onClose={() => setBrowsing(false)}
          onAdded={(d) => setDashboards((prev) => [...prev, d])}
        />
      )}

      {creating && (
        <Modal title="Create a dashboard" onClose={() => setCreating(false)}>
          <CreateCustomForm
            onCreated={(d) => {
              setCreating(false);
              setDashboards((prev) => [...prev, d]);
              notify("success", `Created "${d.name}"`);
            }}
          />
        </Modal>
      )}

      {editing && (
        <EditDashboardInline
          dashboard={editing}
          onClose={() => setEditing(null)}
          onSaved={(u) => {
            setDashboards((prev) => prev.map((d) => (d.id === u.id ? u : d)));
            if (liveOn(u).length > 0) void refreshEpapers();
            setEditing(null);
            notify("success", `Saved "${u.name}"`);
          }}
          onDeleted={(d) => {
            setDashboards((prev) => prev.filter((x) => x.id !== d.id));
            if (liveOn(d).length > 0) void refreshEpapers();
            setEditing(null);
            notify("success", `Deleted "${d.name}"`);
          }}
        />
      )}

      {modal?.kind === "settings" && (
        <EpaperEditModal
          epaper={modal.epaper}
          onClose={() => setModal(null)}
          onDeleted={() => {
            setEpapers(epapers.filter((e) => e.id !== modal.epaper.id));
            setModal(null);
          }}
        />
      )}

      {modal?.kind === "geometry" && geometry && (
        <Modal
          title={`Geometry — ${modal.epaper.name}`}
          onClose={() => setModal(null)}
          actions={
            <>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button className="btn btn-accent" disabled={busy} onClick={() => void saveGeometry()}>
                {busy ? "Saving…" : "Save"}
              </button>
            </>
          }
        >
          <DisplayGeometryForm value={geometry} onChange={setGeometry} disabled={busy} />
        </Modal>
      )}

      {modal?.kind === "refresh" && refresh && (
        <Modal
          title={`Refresh — ${modal.epaper.name}`}
          onClose={() => setModal(null)}
          actions={
            <>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>
                Cancel
              </button>
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

/** Inline rename/delete modal for a dashboard, hand-rolled with the new styles. */
function EditDashboardInline({
  dashboard,
  onClose,
  onSaved,
  onDeleted,
}: {
  dashboard: Dashboard;
  onClose: () => void;
  onSaved: (d: Dashboard) => void;
  onDeleted: (d: Dashboard) => void;
}) {
  const { token, notify } = useSession();
  const [name, setName] = useState(dashboard.name);
  const [url, setUrl] = useState(dashboard.custom_url ?? "");
  const [busy, setBusy] = useState(false);
  const isCustom = dashboard.source === "custom";
  const urlValid = !isCustom || /^https?:\/\/.+/i.test(url.trim());

  async function save() {
    const trimmed = name.trim();
    if (!trimmed || !urlValid) return;
    setBusy(true);
    try {
      const updated = await api.updateDashboard(token, dashboard.id, {
        name: trimmed,
        ...(isCustom ? { custom_url: url.trim() } : {}),
      });
      onSaved(updated);
    } catch (e) {
      notify("error", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete "${dashboard.name}"? This can't be undone.`)) return;
    setBusy(true);
    try {
      await api.deleteDashboard(token, dashboard.id);
      onDeleted(dashboard);
    } catch (e) {
      notify("error", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Edit dashboard"
      onClose={onClose}
      actions={
        <>
          <button className="btn btn-danger mr-auto" disabled={busy} onClick={() => void remove()}>
            Delete
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-accent"
            disabled={busy || !name.trim() || !urlValid}
            onClick={() => void save()}
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="field-label">Name</span>
          <input
            className="field"
            autoFocus
            value={name}
            maxLength={80}
            disabled={busy}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void save();
            }}
          />
        </label>

        {isCustom && (
          <label className="flex flex-col gap-1">
            <span className="field-label">URL</span>
            <input
              className="field"
              type="url"
              value={url}
              disabled={busy}
              placeholder="https://example.com/my-page"
              onChange={(e) => setUrl(e.target.value)}
            />
            {url.length > 0 && !urlValid && (
              <span className="text-sm" style={{ color: "var(--danger)" }}>
                Enter a full URL starting with http:// or https://
              </span>
            )}
          </label>
        )}

        <DashboardConfig type={dashboard.type} />
      </div>
    </Modal>
  );
}
