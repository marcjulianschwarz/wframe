import { useState } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Modal } from "@/components/Modal";
import { GithubForm } from "@/features/dashboard/GithubForm";
import { HomeAssistantForm } from "@/features/dashboard/HomeAssistantForm";
import { LocationButton } from "@/features/dashboard/LocationButton";
import { api, type Dashboard } from "@/lib/api";
import { useSession } from "@/lib/session";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface Props {
  dashboard: Dashboard;
  onSaved: (d: Dashboard) => void;
  onClose: () => void;
}

/** Edit one of the user's own dashboards in a modal: name, description, slug,
 * and (for custom ones) the URL. */
export function EditDashboardModal({ dashboard, onSaved, onClose }: Props) {
  const { token } = useSession();
  const [name, setName] = useState(dashboard.name);
  const [description, setDescription] = useState(dashboard.description ?? "");
  const [slug, setSlug] = useState(dashboard.slug);
  const [url, setUrl] = useState(dashboard.custom_url ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCustom = dashboard.source === "custom";
  const urlValid = !isCustom || /^https?:\/\/.+/i.test(url.trim());
  const canSave = name.trim().length > 0 && urlValid && !busy;

  async function save() {
    if (!canSave) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api.updateDashboard(token, dashboard.id, {
        name: name.trim(),
        description: description.trim() || null,
        slug: slugify(slug),
        ...(isCustom ? { custom_url: url.trim() } : {}),
      });
      onSaved(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Edit dashboard"
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={!canSave}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-s">
        <label className="text-s text-fg-2 flex flex-col gap-xs">
          Name
          <Input value={name} onChange={(e) => setName(e.target.value)} disabled={busy} autoFocus />
        </label>
        <label className="text-s text-fg-2 flex flex-col gap-xs">
          Description <span className="opacity-60">(optional)</span>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={busy}
          />
        </label>
        <label className="text-s text-fg-2 flex flex-col gap-xs">
          Slug
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            disabled={busy}
            className="font-mono"
          />
        </label>
        {isCustom && (
          <label className="text-s text-fg-2 flex flex-col gap-xs">
            URL
            <Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} disabled={busy} />
          </label>
        )}
        {isCustom && url.length > 0 && !urlValid && (
          <div className="text-s text-fg-danger">
            Enter a full URL starting with http:// or https://
          </div>
        )}
        {/* Per-user config the renderer needs for these built-ins. */}
        {dashboard.type === "weather" && <LocationButton token={token} />}
        {dashboard.type === "github" && <GithubForm token={token} />}
        {dashboard.type === "homeassistant" && <HomeAssistantForm token={token} />}
        {error && <div className="text-s text-fg-danger">{error}</div>}
      </div>
    </Modal>
  );
}
