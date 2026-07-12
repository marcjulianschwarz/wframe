import { useState } from "react";
import { Frame, Pencil, RefreshCw, Settings2 } from "lucide-react";
import { Button } from "@/ui/concepts/button/component";
import { Modal } from "@/ui/concepts/modal/component";
import {
  api,
  type Epaper,
  type EpaperGeometry,
  type EpaperRefresh,
  type Rotation,
} from "@/lib/api";
import { useSession } from "@/lib/session";
import { DisplayGeometryForm } from "./DisplayGeometryForm";
import { EpaperPanel } from "./EpaperPanel";
import { RefreshControl } from "./RefreshControl";
import { EpaperEditModal } from "./EpaperEditModal";
import {
  colorFor,
  getAppearance,
  iconFor,
  type EpaperAppearance,
} from "./appearance";

type ModalKind = "edit" | "configure" | "geometry" | "refresh" | null;

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

/** One physical epaper device, shown as a card: a user-chosen icon/color badge,
 * a name, a delete action, and buttons that open modals for editing the card,
 * the device URL/package, display geometry, and refresh settings. */
export function EpaperCard({ epaper }: { epaper: Epaper }) {
  const { token, upsertEpaper, setEpapers, epapers, notify } = useSession();
  const [modal, setModal] = useState<ModalKind>(null);
  const [busy, setBusy] = useState(false);
  const [appearance, setAppearance] = useState<EpaperAppearance>(() =>
    getAppearance(epaper.id),
  );

  // Draft state for the geometry/refresh modals. Seeded when the modal opens.
  const [geometry, setGeometry] = useState<EpaperGeometry>(() => pickGeometry(epaper));
  const [refresh, setRefresh] = useState<EpaperRefresh>(() => ({
    paused: epaper.paused,
    refresh_interval: epaper.refresh_interval,
  }));

  const Icon = iconFor(appearance.icon);
  const color = colorFor(appearance.color);

  function openGeometry() {
    setGeometry(pickGeometry(epaper));
    setModal("geometry");
  }

  function openRefresh() {
    setRefresh({ paused: epaper.paused, refresh_interval: epaper.refresh_interval });
    setModal("refresh");
  }

  async function saveGeometry() {
    setBusy(true);
    try {
      upsertEpaper(await api.setGeometry(token, epaper.id, geometry));
      notify("success", "Saved geometry");
      setModal(null);
    } catch (e) {
      notify("error", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function saveRefresh() {
    setBusy(true);
    try {
      upsertEpaper(await api.setRefresh(token, epaper.id, refresh));
      notify("success", "Saved refresh settings");
      setModal(null);
    } catch (e) {
      notify("error", e instanceof Error ? e.message : String(e));
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
      setModal(null);
    } catch (e) {
      notify("error", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-bg-1-light border border-border-1 rounded-n shadow-normal p-m flex flex-col gap-m">
      <div className="flex items-start gap-s">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-n ${color.bg} ${color.fg}`}
        >
          <Icon size={22} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-s">
            <span className="font-semibold text-fg-1 truncate">{epaper.name}</span>
            <button
              type="button"
              aria-label="Edit device"
              onClick={() => setModal("edit")}
              className="flex h-7 w-7 items-center justify-center rounded-s text-fg-2 hover:bg-bg-hover hover:text-fg-1 shrink-0"
            >
              <Pencil size={14} />
            </button>
          </div>
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
      </div>

      <div className="flex flex-wrap gap-s">
        <Button onClick={() => setModal("configure")}>
          <Settings2 size={16} />
          Configure
        </Button>
        <Button onClick={openGeometry}>
          <Frame size={16} />
          Geometry
        </Button>
        <Button onClick={openRefresh}>
          <RefreshCw size={16} />
          Refresh
        </Button>
      </div>

      {modal === "edit" && (
        <EpaperEditModal
          epaper={epaper}
          appearance={appearance}
          onClose={() => setModal(null)}
          onAppearanceSaved={setAppearance}
          onDelete={() => void remove()}
          deleting={busy}
        />
      )}

      {modal === "configure" && (
        <Modal
          title={`Configure ${epaper.name}`}
          width="xl"
          layout="bar"
          onClose={() => setModal(null)}
        >
          <EpaperPanel epaper={epaper} />
        </Modal>
      )}

      {modal === "geometry" && (
        <Modal
          title={`Geometry — ${epaper.name}`}
          width="lg"
          layout="bar"
          onClose={() => setModal(null)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button variant="primary" disabled={busy} onClick={() => void saveGeometry()}>
                {busy ? "Saving…" : "Save"}
              </Button>
            </>
          }
        >
          <DisplayGeometryForm value={geometry} onChange={setGeometry} disabled={busy} />
        </Modal>
      )}

      {modal === "refresh" && (
        <Modal
          title={`Refresh — ${epaper.name}`}
          width="md"
          layout="bar"
          onClose={() => setModal(null)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button variant="primary" disabled={busy} onClick={() => void saveRefresh()}>
                {busy ? "Saving…" : "Save"}
              </Button>
            </>
          }
        >
          <RefreshControl value={refresh} onChange={setRefresh} disabled={busy} />
        </Modal>
      )}
    </div>
  );
}
