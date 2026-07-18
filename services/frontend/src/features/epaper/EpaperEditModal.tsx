import { useState } from "react";
import { Check, Copy, Download, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { api, type Epaper } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useT } from "@/lib/i18n";
import { useEpaperActions, useEpapers, useRemoveEpaper } from "@/lib/queries";
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
  const { token, notify } = useSession();
  const t = useT();
  const epapers = useEpapers();
  const { rename } = useEpaperActions();
  const removeEpaper = useRemoveEpaper();
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
        await rename.mutateAsync({ id: epaper.id, name: trimmed });
      }
      notify("success", t("device.savedDevice"));
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
    if (!confirm(t("epaper.deleteConfirm", { name: epaper.name }))) return;
    setBusy(true);
    try {
      await api.deleteEpaper(token, epaper.id);
      removeEpaper(epaper.id);
      notify("success", t("epaper.deletedName", { name: epaper.name }));
      onDeleted();
    } catch (e) {
      notify("error", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={t("device.settingsTitle", { name: epaper.name })}
      onClose={onClose}
      actions={
        <>
          <button
            className="btn btn-danger mr-auto"
            disabled={busy || isLast}
            title={isLast ? t("epaper.needOne") : t("epaper.deleteThis")}
            onClick={() => void remove()}
          >
            <Trash2 size={16} />
            {t("action.delete")}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            {t("action.cancel")}
          </button>
          <button
            className="btn btn-accent"
            disabled={busy || !name.trim()}
            onClick={() => void save()}
          >
            {busy ? t("action.saving") : t("action.save")}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="field-label">{t("epaper.name")}</span>
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
          <span className="field-label">{t("epaper.deviceUrl")}</span>
          <div className="flex gap-2 items-center">
            <code
              className="flex-1 text-xs px-3 py-2 rounded-xl border-2 break-all bg-[var(--paper-2)]"
              style={{ borderColor: "var(--line)" }}
            >
              {epaper.bitmap_url}
            </code>
            <button className="btn" onClick={() => void copyUrl()}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? t("action.copied") : t("action.copy")}
            </button>
          </div>
          <span className="text-sm text-soft">
            {t("epaper.urlHint")}
          </span>
          <button
            className="btn self-start"
            onClick={() => downloadWframePackage(epaper)}
          >
            <Download size={16} />
            {t("epaper.downloadPackage")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
