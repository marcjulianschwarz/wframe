import { useState } from "react";
import { Check, ChevronDown, ChevronRight, Pencil, Trash2, X } from "lucide-react";
import { Input } from "@/components/Input";
import { api, type Epaper } from "@/lib/api";
import { useSession } from "@/lib/session";
import { DisplayGeometryForm } from "./DisplayGeometryForm";
import { EpaperPanel } from "./EpaperPanel";
import { RefreshControl } from "./RefreshControl";

/** One physical epaper device: name (inline-editable), what it's showing, a
 * delete action, and a collapsible block with its URL/package, refresh, and
 * geometry settings. */
export function EpaperCard({ epaper }: { epaper: Epaper }) {
  const { token, upsertEpaper, setEpapers, epapers, notify } = useSession();
  const [open, setOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(epaper.name);
  const [busy, setBusy] = useState(false);

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === epaper.name) {
      setEditingName(false);
      setName(epaper.name);
      return;
    }
    setBusy(true);
    try {
      upsertEpaper(await api.renameEpaper(token, epaper.id, trimmed));
      setEditingName(false);
      notify("success", "Renamed device");
    } catch (e) {
      notify("error", e instanceof Error ? e.message : String(e));
      setName(epaper.name);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    // Never let the user delete their last device — the app always needs one.
    if (epapers.length <= 1) {
      notify("error", "You need at least one epaper.");
      return;
    }
    if (!confirm(`Delete "${epaper.name}"? This can't be undone.`)) return;
    setBusy(true);
    try {
      await api.deleteEpaper(token, epaper.id);
      setEpapers(epapers.filter((e) => e.id !== epaper.id));
      notify("success", `Deleted "${epaper.name}"`);
    } catch (e) {
      notify("error", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-bg-1-light border border-border-1 rounded-n shadow-normal">
      <div className="flex items-center gap-s p-m">
        <button
          type="button"
          aria-label={open ? "Collapse settings" : "Expand settings"}
          onClick={() => setOpen((v) => !v)}
          className="flex h-8 w-8 items-center justify-center rounded-s text-fg-2 hover:bg-bg-hover hover:text-fg-1 transition-colors duration-fast"
        >
          {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>

        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="flex items-center gap-s">
              <Input
                autoFocus
                value={name}
                disabled={busy}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void saveName();
                  if (e.key === "Escape") {
                    setEditingName(false);
                    setName(epaper.name);
                  }
                }}
              />
              <button
                type="button"
                aria-label="Save name"
                onClick={() => void saveName()}
                disabled={busy}
                className="flex h-8 w-8 items-center justify-center rounded-s text-highlight hover:bg-bg-hover"
              >
                <Check size={18} />
              </button>
              <button
                type="button"
                aria-label="Cancel"
                onClick={() => {
                  setEditingName(false);
                  setName(epaper.name);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-s text-fg-2 hover:bg-bg-hover"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-s">
              <span className="font-semibold text-fg-1 truncate">{epaper.name}</span>
              <button
                type="button"
                aria-label="Rename"
                onClick={() => setEditingName(true)}
                className="flex h-7 w-7 items-center justify-center rounded-s text-fg-2 hover:bg-bg-hover hover:text-fg-1 shrink-0"
              >
                <Pencil size={14} />
              </button>
            </div>
          )}
          <div className="text-s text-fg-2 truncate mt-xs">
            {epaper.dashboard ? (
              <>Showing <span className="text-highlight font-semibold">{epaper.dashboard.name}</span></>
            ) : epaper.paused ? (
              "Stopped — frozen on its last image"
            ) : (
              "Nothing deployed yet"
            )}
          </div>
        </div>

        <button
          type="button"
          aria-label={`Delete "${epaper.name}"`}
          title="Delete device"
          onClick={() => void remove()}
          disabled={busy}
          className="flex h-8 w-8 items-center justify-center rounded-s text-fg-2 hover:bg-bg-danger hover:text-fg-danger transition-colors duration-fast disabled:opacity-40 disabled:pointer-events-none shrink-0"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {open && (
        <div className="flex flex-col gap-m p-m pt-0">
          <EpaperPanel epaper={epaper} />
          <RefreshControl epaper={epaper} token={token} onSaved={upsertEpaper} />
          <DisplayGeometryForm epaper={epaper} token={token} onSaved={upsertEpaper} />
        </div>
      )}
    </div>
  );
}
