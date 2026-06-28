import { useState } from "react";
import { Button } from "@/ui/concepts/button/component";
import { Input } from "@/components/Input";
import { api, type Dashboard } from "@/lib/api";
import { useSession } from "@/lib/session";

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
    <div className="flex flex-col gap-s">
      <label className="text-s text-fg-2 flex flex-col gap-xs">
        Name
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My dashboard"
          disabled={busy}
        />
      </label>
      <label className="text-s text-fg-2 flex flex-col gap-xs">
        Description <span className="opacity-60">(optional)</span>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What this shows"
          disabled={busy}
        />
      </label>
      <label className="text-s text-fg-2 flex flex-col gap-xs">
        Slug
        <Input
          value={slug}
          onChange={(e) => setSlugEdited(slugify(e.target.value))}
          placeholder="my-dashboard"
          disabled={busy}
          className="font-mono"
        />
      </label>
      <label className="text-s text-fg-2 flex flex-col gap-xs">
        URL
        <Input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/my-page"
          disabled={busy}
        />
      </label>
      {url.length > 0 && !urlValid && (
        <div className="text-s text-fg-danger">
          Enter a full URL starting with http:// or https://
        </div>
      )}
      {error && <div className="text-s text-fg-danger">{error}</div>}
      <Button variant="primary" className="self-start" onClick={submit} disabled={!canSubmit}>
        {busy ? "Creating…" : "Create dashboard"}
      </Button>
    </div>
  );
}
