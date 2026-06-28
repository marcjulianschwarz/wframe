import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/ui/concepts/button/component";
import { Input } from "@/components/Input";
import { Modal } from "@/ui/concepts/modal/component";
import { EpaperCard } from "@/features/epaper/EpaperCard";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";

/** Device settings: manage every epaper the user owns. Each device has its own
 * name, secret URL/package, refresh control, and display geometry. */
export function SettingsPage() {
  const { token, epapers, upsertEpaper, notify } = useSession();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      upsertEpaper(await api.createEpaper(token, trimmed));
      notify("success", `Added "${trimmed}"`);
      setAdding(false);
      setName("");
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
          <h2>My epapers</h2>
          <p className="text-fg-2 text-s mt-xs">
            Each device has its own URL, refresh control, and display geometry.
            Expand one to configure it.
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
        <div className="flex flex-col gap-s">
          {epapers.map((e) => (
            <EpaperCard key={e.id} epaper={e} />
          ))}
        </div>
      )}

      {adding && (
        <Modal
          title="Add an epaper"
          onClose={() => {
            setAdding(false);
            setName("");
          }}
          actions={
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setAdding(false);
                  setName("");
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" disabled={busy || !name.trim()} onClick={() => void create()}>
                {busy ? "Adding…" : "Add"}
              </Button>
            </>
          }
        >
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
          <p className="text-s text-fg-2 mt-s">
            A new device URL is generated automatically. You can paste it into
            your ESPHome config or download the ready-made package.
          </p>
        </Modal>
      )}
    </section>
  );
}
