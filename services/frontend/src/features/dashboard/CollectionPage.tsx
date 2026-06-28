import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/Button";
import { ContextMenu } from "@/components/ContextMenu";
import { Modal } from "@/components/Modal";
import { CreateCustomForm } from "@/features/dashboard/CreateCustomForm";
import { DeployTargetModal } from "@/features/dashboard/DeployTargetModal";
import { EditDashboardModal } from "@/features/dashboard/EditDashboardModal";
import { api, type Dashboard, type DashboardSource, type Epaper } from "@/lib/api";
import { useSession } from "@/lib/session";

type Filter = "all" | DashboardSource;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "store", label: "From store" },
  { key: "custom", label: "Custom" },
];

/** The user's collection: their added/created dashboards, with filtering. Each
 * row deploys to an epaper via its play button; with one device it deploys
 * directly, with several it opens a target picker. Edit/delete live in a
 * per-row context menu. */
export function CollectionPage() {
  const { token, epapers, upsertEpaper, refreshEpapers, notify } = useSession();
  const [items, setItems] = useState<Dashboard[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);
  const [deployingId, setDeployingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Dashboard | null>(null);
  // When set, the target picker is open for this dashboard (multi-device case).
  const [targeting, setTargeting] = useState<Dashboard | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await api.listDashboards(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const shown = items.filter((d) => filter === "all" || d.source === filter);
  const showingOn = (d: Dashboard): Epaper[] =>
    epapers.filter((e) => e.dashboard_id === d.id);

  // Send (or, when already live on it, clear) a dashboard on a specific epaper.
  async function deployTo(d: Dashboard, epaper: Epaper, clear: boolean) {
    setDeployingId(d.id);
    setError(null);
    try {
      upsertEpaper(await api.setDashboard(token, epaper.id, clear ? null : d.id));
      notify(
        "success",
        clear ? `Stopped "${d.name}" on ${epaper.name}` : `Sent "${d.name}" to ${epaper.name}`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      notify("error", msg);
    } finally {
      setDeployingId(null);
    }
  }

  // Play button: one device deploys/clears it directly; several open the picker.
  async function onPlay(d: Dashboard) {
    if (epapers.length === 1) {
      const only = epapers[0];
      await deployTo(d, only, only.dashboard_id === d.id);
      return;
    }
    setTargeting(d);
  }

  async function remove(d: Dashboard) {
    if (!confirm(`Delete "${d.name}"? This can't be undone.`)) return;
    setError(null);
    try {
      await api.deleteDashboard(token, d.id);
      // Deleting a deployed dashboard clears it server-side (SET NULL) on every
      // device showing it; pull the fresh epaper state so badges stay accurate.
      if (showingOn(d).length > 0) await refreshEpapers();
      await load();
      notify("success", `Deleted "${d.name}"`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      notify("error", msg);
    }
  }

  return (
    <section className="flex flex-col gap-m">
      <div className="flex items-start justify-between gap-m flex-wrap">
        <div>
          <h2>Dashboards</h2>
          <p className="text-fg-2 text-s mt-xs">
            Hit play to send a dashboard to your epaper. Edit and delete live in
            the ⋯ menu.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-m rounded-n border border-border-1 bg-bg-danger text-fg-danger text-s">
          {error}
        </div>
      )}

      <div className="flex gap-xs">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            variant={filter === f.key ? "primary" : "ghost"}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="p-l rounded-n border border-dashed border-border-1 text-fg-2 text-s text-center">
          {items.length === 0
            ? "No dashboards yet. Add one from the store or create a custom one."
            : "No dashboards match this filter."}
        </div>
      ) : (
        <div className="flex flex-col gap-s">
          {shown.map((d) => {
            const live = showingOn(d);
            const deployed = live.length > 0;
            const busy = deployingId === d.id;
            return (
              <div
                key={d.id}
                className={`p-m rounded-n border transition-all duration-fast ease-out flex items-center gap-m ${
                  deployed
                    ? "bg-highlight-soft border-highlight"
                    : "bg-bg-1-light border-border-1 hover:border-border-2"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-s">
                    <span className="font-semibold text-fg-1 truncate">{d.name}</span>
                    {deployed && (
                      <span className="text-s text-highlight font-semibold shrink-0" title={live.map((e) => e.name).join(", ")}>
                        ● Live on {live.length === 1 ? live[0].name : `${live.length} devices`}
                      </span>
                    )}
                  </div>
                  <div className="text-s text-fg-2 truncate">
                    {d.description || (d.custom_url ?? d.type)}
                  </div>
                  <div className="text-s font-mono text-fg-2 mt-xs">
                    {d.source} · {d.slug}
                  </div>
                </div>
                <div className="flex items-center gap-xs shrink-0">
                  <button
                    type="button"
                    aria-label={`Send "${d.name}" to an epaper`}
                    title={epapers.length === 1 ? "Send to epaper" : "Choose epaper(s)"}
                    onClick={() => void onPlay(d)}
                    disabled={busy}
                    className="flex h-9 w-9 items-center justify-center rounded-s text-white bg-highlight transition-all duration-fast hover:brightness-110 active:brightness-95 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {busy ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Play size={18} fill="currentColor" />
                    )}
                  </button>
                  <ContextMenu
                    items={[
                      {
                        label: "Edit",
                        icon: <Pencil size={16} />,
                        onSelect: () => setEditing(d),
                      },
                      {
                        label: "Delete",
                        icon: <Trash2 size={16} />,
                        danger: true,
                        onSelect: () => void remove(d),
                      },
                    ]}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create a custom dashboard — opens the form in a modal. */}
      <Button variant="default" className="self-start" onClick={() => setCreating(true)}>
        <Plus size={16} />
        Create
      </Button>

      {creating && (
        <Modal title="Create a custom dashboard" onClose={() => setCreating(false)}>
          <CreateCustomForm
            onCreated={(d) => {
              setCreating(false);
              void load();
              notify("success", `Created "${d.name}"`);
            }}
          />
        </Modal>
      )}

      {editing && (
        <EditDashboardModal
          dashboard={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setEditing(null);
            setItems((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
            // Keep deployed copies in sync across every device showing it.
            if (showingOn(updated).length > 0) void refreshEpapers();
            notify("success", `Saved "${updated.name}"`);
          }}
        />
      )}

      {targeting && (
        <DeployTargetModal
          dashboard={targeting}
          epapers={epapers}
          onClose={() => setTargeting(null)}
          onToggle={(epaper, clear) => deployTo(targeting, epaper, clear)}
        />
      )}
    </section>
  );
}
