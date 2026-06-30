import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/ui/concepts/button/component";
import { Input } from "@/components/Input";
import { Modal } from "@/ui/concepts/modal/component";
import { EpaperCard } from "@/features/epaper/EpaperCard";
import { AppearancePicker } from "@/features/epaper/AppearancePicker";
import { setAppearance, type EpaperAppearance } from "@/features/epaper/appearance";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";

const DEFAULT_APPEARANCE: EpaperAppearance = { icon: "tv", color: "slate" };

/** Device settings: manage every epaper the user owns. Each device has its own
 * name, icon/color, secret URL/package, refresh control, and display geometry. */
export function SettingsPage() {
  const { token, epapers, upsertEpaper, notify } = useSession();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [appearance, setLocalAppearance] = useState<EpaperAppearance>(DEFAULT_APPEARANCE);
  const [busy, setBusy] = useState(false);

  function reset() {
    setAdding(false);
    setName("");
    setLocalAppearance(DEFAULT_APPEARANCE);
  }

  async function create() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const created = await api.createEpaper(token, trimmed);
      setAppearance(created.id, appearance);
      upsertEpaper(created);
      notify("success", `Added "${trimmed}"`);
      reset();
    } catch (e) {
      notify("error", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-m">
      <div className="flex items-start justify-between gap-m flex-wrap">
        <div>
          <h2>Epapers</h2>
          <p className="text-fg-2 text-s mt-xs">
            Each device has its own URL, refresh control, and display geometry.
            Use the buttons on a card to configure it.
          </p>
        </div>
        <Button variant="primary" onClick={() => setAdding(true)}>
          <Plus size={16} />
          Add epaper
        </Button>
      </div>

      {epapers.length === 0 ? (
        <p className="text-fg-2 text-s">Loading…</p>
      ) : (
        <div className="grid gap-s sm:grid-cols-2">
          {epapers.map((e) => (
            <EpaperCard key={e.id} epaper={e} />
          ))}
        </div>
      )}

      {adding && (
        <Modal
          title="Add an epaper"
          width="md"
          layout="bar"
          onClose={reset}
          actions={
            <>
              <Button variant="ghost" onClick={reset}>
                Cancel
              </Button>
              <Button variant="primary" disabled={busy || !name.trim()} onClick={() => void create()}>
                {busy ? "Adding…" : "Add"}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-m">
            <label className="flex flex-col gap-xs">
              <span className="text-s text-fg-2">Name</span>
              <Input
                autoFocus
                placeholder="Living room"
                value={name}
                maxLength={80}
                disabled={busy}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void create();
                }}
              />
            </label>
            <AppearancePicker value={appearance} onChange={setLocalAppearance} />
            <p className="text-s text-fg-2">
              A new device URL is generated automatically. You can paste it into
              your ESPHome config or download the ready-made package.
            </p>
          </div>
        </Modal>
      )}
    </section>
  );
}
