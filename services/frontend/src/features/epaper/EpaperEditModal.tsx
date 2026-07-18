import { useState } from "react";
import { Check, Copy, Download, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { api, type Epaper } from "@/lib/api";
import { useSession } from "@/lib/session";
import { downloadWframePackage } from "./esphomeBundle";

/** Settings for an epaper: rename it, copy its device URL / download the ESPHome
 * package, or delete it. */
export function EpaperEditModal({
  epaper,
  onClose,
  onDeleted,
}: {
  epaper: Epaper;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { token, epapers, upsertEpaper, notify } = useSession();
  const [name, setName] = useState(epaper.name);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const isLast = epapers.length <= 1;

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      if (trimmed !== epaper.name) {
        upsertEpaper(await api.renameEpaper(token, epaper.id, trimmed));
      }
      notify("success", "Saved device");
      onClose();
    } catch (e) {
      notify("error", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(epaper.bitmap_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  async function remove() {
    if (isLast) return;
    if (!confirm(`Delete "${epaper.name}"? This can't be undone.`)) return;
    setBusy(true);
    try {
      await api.deleteEpaper(token, epaper.id);
      notify("success", `Deleted "${epaper.name}"`);
      onDeleted();
    } catch (e) {
      notify("error", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={`Settings — ${epaper.name}`}
      onClose={onClose}
      actions={
        <>
          <button
            className="btn btn-danger mr-auto"
            disabled={busy || isLast}
            title={isLast ? "You need at least one epaper" : "Delete this epaper"}
            onClick={() => void remove()}
          >
            <Trash2 size={16} />
            Delete
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-accent"
            disabled={busy || !name.trim()}
            onClick={() => void save()}
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
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

        <div className="flex flex-col gap-2">
          <span className="field-label">Device URL</span>
          <div className="flex gap-2 items-center">
            <code
              className="flex-1 text-xs px-3 py-2 rounded-xl border-2 break-all bg-[var(--paper-2)]"
              style={{ borderColor: "var(--line)" }}
            >
              {epaper.bitmap_url}
            </code>
            <button className="btn" onClick={() => void copyUrl()}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <span className="text-sm text-soft">
            Paste into your ESPHome config as <code>streaming_bmp.url</code>, or
            download the ready-made package. Keep it private — it's a secret URL.
          </span>
          <button
            className="btn self-start"
            onClick={() => downloadWframePackage(epaper)}
          >
            <Download size={16} />
            Download wframe.yaml
          </button>
        </div>
      </div>
    </Modal>
  );
}
