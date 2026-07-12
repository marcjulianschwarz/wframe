import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/ui/concepts/button/component";
import { Input } from "@/components/Input";
import { Modal } from "@/ui/concepts/modal/component";
import { api, type Epaper } from "@/lib/api";
import { useSession } from "@/lib/session";
import { AppearancePicker } from "./AppearancePicker";
import { setAppearance, type EpaperAppearance } from "./appearance";

/** Edit an existing device: its name (persisted to the API) and its badge
 * icon/color (persisted client-side). */
export function EpaperEditModal({
  epaper,
  appearance,
  onClose,
  onAppearanceSaved,
  onDelete,
  deleting,
}: {
  epaper: Epaper;
  appearance: EpaperAppearance;
  onClose: () => void;
  onAppearanceSaved: (next: EpaperAppearance) => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const { token, upsertEpaper, notify } = useSession();
  const [name, setName] = useState(epaper.name);
  const [draft, setDraft] = useState<EpaperAppearance>(appearance);
  const [busy, setBusy] = useState(false);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      if (trimmed !== epaper.name) {
        upsertEpaper(await api.renameEpaper(token, epaper.id, trimmed));
      }
      setAppearance(epaper.id, draft);
      onAppearanceSaved(draft);
      notify("success", "Saved device");
      onClose();
    } catch (e) {
      notify("error", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Edit device"
      width="md"
      layout="bar"
      onClose={onClose}
      actions={
        <>
          <Button
            variant="danger"
            disabled={busy || deleting}
            onClick={onDelete}
            className="mr-auto"
          >
            <Trash2 size={16} />
            Delete
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={busy || !name.trim()}
            onClick={() => void save()}
          >
            {busy ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-ui-m">
        <label className="flex flex-col gap-ui-xs">
          <span className="text-ui-s text-ui-secondary">Name</span>
          <Input
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
        <AppearancePicker value={draft} onChange={setDraft} />
      </div>
    </Modal>
  );
}
