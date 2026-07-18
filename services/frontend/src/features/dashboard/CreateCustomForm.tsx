import { useState } from "react";
import { api, type Dashboard } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useT } from "@/lib/i18n";

/** Lowercase kebab slug, mirroring the backend's slugify so the auto-filled
 * preview matches what will be saved. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface Props {
  onCreated: (d: Dashboard) => void;
}

/** Create a custom (URL-backed) dashboard: name, optional description, an
 * editable auto-generated slug, and the URL to render. */
export function CreateCustomForm({ onCreated }: Props) {
  const { token } = useSession();
  const t = useT();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  // Null until the user edits it: until then the slug tracks the name.
  const [slugEdited, setSlugEdited] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slug = slugEdited ?? slugify(name);
  const urlValid = /^https?:\/\/.+/i.test(url.trim());
  const canSubmit = name.trim().length > 0 && urlValid && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const created = await api.createCustomDashboard(token, {
        name: name.trim(),
        description: description.trim() || null,
        slug: slug || null,
        custom_url: url.trim(),
      });
      onCreated(created);
      setName("");
      setDescription("");
      setUrl("");
      setSlugEdited(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="field-label">{t("custom.name")}</span>
        <input
          className="field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("custom.namePlaceholder")}
          disabled={busy}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="field-label">{t("custom.description")}</span>
        <input
          className="field"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("custom.descriptionPlaceholder")}
          disabled={busy}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="field-label">{t("custom.slug")}</span>
        <input
          className="field"
          value={slug}
          onChange={(e) => setSlugEdited(slugify(e.target.value))}
          placeholder={t("custom.slugPlaceholder")}
          disabled={busy}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="field-label">{t("custom.url")}</span>
        <input
          className="field"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t("custom.urlPlaceholder")}
          disabled={busy}
        />
      </label>
      {url.length > 0 && !urlValid && (
        <div className="text-sm" style={{ color: "var(--danger)" }}>
          {t("custom.urlInvalid")}
        </div>
      )}
      {error && (
        <div className="text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </div>
      )}
      <button className="btn btn-accent self-start" onClick={submit} disabled={!canSubmit}>
        {busy ? t("action.creating") : t("custom.createView")}
      </button>
    </div>
  );
}
