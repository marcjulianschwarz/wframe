import { useState } from "react";
import { Modal } from "@/components/Modal";
import { DashboardConfig } from "@/features/dashboard/DashboardConfig";
import { api, type Dashboard } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useEpaperActions, type DashboardsStore } from "@/lib/queries";
import { DashboardCard } from "./DashboardCard";

/** The dashboard library: a grid of cards you can edit, delete, or stop (clear
 * from every device showing it). Mounted inside the "Your dashboards" modal on
 * home. Assignment happens on device pages, not here. */
export function DashboardManager({ dash }: { dash: DashboardsStore }) {
  const { notify } = useSession();
  const { setDashboard } = useEpaperActions();
  const [editing, setEditing] = useState<Dashboard | null>(null);

  // Clear a dashboard from every device showing it.
  async function stop(dashboard: Dashboard) {
    try {
      for (const e of dash.liveOn(dashboard)) {
        await setDashboard.mutateAsync({ id: e.id, dashboardId: null });
      }
      notify("success", `Stopped "${dashboard.name}"`);
    } catch (e) {
      notify("error", e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-4">
        {dash.dashboards.map((d) => (
          <DashboardCard
            key={d.id}
            dashboard={d}
            liveOn={dash.liveOn(d)}
            onEdit={() => setEditing(d)}
            onStop={() => void stop(d)}
          />
        ))}
        {dash.dashboards.length === 0 && (
          <p className="text-soft text-sm text-lg">
            No dashboards yet — add one from the Store or make your own.
          </p>
        )}
      </div>

      {editing && (
        <EditDashboardInline
          dashboard={editing}
          onClose={() => setEditing(null)}
          onSaved={(u) => {
            dash.update(u);
            setEditing(null);
            notify("success", `Saved "${u.name}"`);
          }}
          onDeleted={(d) => {
            dash.remove(d.id);
            setEditing(null);
            notify("success", `Deleted "${d.name}"`);
          }}
        />
      )}
    </>
  );
}

/** Rename/reconfigure/delete a dashboard. */
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
