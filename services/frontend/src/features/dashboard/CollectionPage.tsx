import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Play, Plus, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/Button";
import { ContextMenu } from "@/components/ContextMenu";
import { Modal } from "@/components/Modal";
import { CreateCustomForm } from "@/features/dashboard/CreateCustomForm";
import { EditDashboardModal } from "@/features/dashboard/EditDashboardModal";
import { api, type Dashboard, type DashboardSource } from "@/lib/api";
import { useSession } from "@/lib/session";

type Filter = "all" | DashboardSource;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "store", label: "From store" },
  { key: "custom", label: "Custom" },
];

/** The user's collection: their added/created dashboards, with filtering. Each
 * row deploys to the epaper via its play button; edit/delete live in a per-row
 * context menu. */
export function CollectionPage() {
  const { token, epaper, setEpaper, refreshEpaper, notify } = useSession();
  const [items, setItems] = useState<Dashboard[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);
  const [deployingId, setDeployingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Dashboard | null>(null);

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
  const isDeployed = (d: Dashboard) => epaper?.dashboard_id === d.id;

  // Send a dashboard to the epaper, or — when it's the one already live — stop
  // it (clears the epaper; the device then freezes on its last image).
  async function toggleDeploy(d: Dashboard) {
    const live = isDeployed(d);
    setDeployingId(d.id);
    setError(null);
    try {
      setEpaper(await api.setDashboard(token, live ? null : d.id));
      notify("success", live ? `Stopped "${d.name}"` : `Sent "${d.name}" to your epaper`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      notify("error", msg);
    } finally {
      setDeployingId(null);
    }
  }

  async function remove(d: Dashboard) {
    if (!confirm(`Delete "${d.name}"? This can't be undone.`)) return;
    setError(null);
    try {
      await api.deleteDashboard(token, d.id);
      // Deleting the deployed dashboard clears it server-side (SET NULL).
      if (isDeployed(d)) setEpaper(await api.getEpaper(token));
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
          <h2>My dashboards</h2>
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
            const deployed = isDeployed(d);
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
                      <span className="text-s text-highlight font-semibold shrink-0">● Live</span>
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
                    aria-label={deployed ? `Stop "${d.name}"` : `Send "${d.name}" to epaper`}
                    title={deployed ? "Stop (clear the epaper)" : "Send to epaper"}
                    onClick={() => toggleDeploy(d)}
                    disabled={busy}
                    className={`flex h-9 w-9 items-center justify-center rounded-s text-white transition-all duration-fast hover:brightness-110 active:brightness-95 disabled:opacity-40 disabled:pointer-events-none ${
                      deployed ? "bg-fg-danger" : "bg-highlight"
                    }`}
                  >
                    {busy ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : deployed ? (
                      <Square size={16} fill="currentColor" />
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
            // Keep the deployed dashboard's embedded copy in sync.
            if (isDeployed(updated)) void refreshEpaper();
            notify("success", `Saved "${updated.name}"`);
          }}
        />
      )}
    </section>
  );
}
