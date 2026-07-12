import { useEffect, useState } from "react";
import { Button } from "@/ui/concepts/button/component";
import { Input } from "@/components/Input";
import { api } from "@/lib/api";

/** Lets the user pick which public GitHub account the github dashboard renders.
 * The username is validated against GitHub's API server-side on save, so a
 * typo surfaces here instead of producing an empty card. */
export function GithubForm({ token }: { token: string }) {
  const [username, setUsername] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getGithub(token)
      .then((p) => {
        setSaved(p.username);
        setUsername(p.username);
      })
      .catch(() => setSaved(null)); // 404 = not set yet
  }, [token]);

  const trimmed = username.trim();
  const valid = /^[A-Za-z0-9-]{1,39}$/.test(trimmed);

  async function save() {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const p = await api.setGithub(token, trimmed);
      setSaved(p.username);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-ui-surface-raised border border-ui-border rounded-ui-n p-ui-m flex flex-col gap-ui-s">
      <div className="text-ui-s text-ui-secondary uppercase tracking-wider font-ui-semibold">
        GitHub username
      </div>
      <div className="flex gap-ui-s items-start">
        <Input
          type="text"
          placeholder="octocat"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          disabled={busy}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <Button
          onClick={save}
          disabled={!valid || busy || trimmed === saved}
        >
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
      {username.length > 0 && !valid && (
        <div className="text-ui-s text-ui-danger">
          Letters, numbers, and hyphens only (max 39 characters).
        </div>
      )}
      {error && <div className="text-ui-s text-ui-danger">{error}</div>}
      {saved && !error && (
        <div className="text-ui-s text-ui-secondary">
          Showing the public profile for{" "}
          <span className="font-ui-mono">@{saved}</span>.
        </div>
      )}
    </div>
  );
}
