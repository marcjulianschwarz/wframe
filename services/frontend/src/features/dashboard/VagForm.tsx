import { useEffect, useState } from "react";
import { Button } from "@/ui/concepts/button/component";
import { Input } from "@/components/Input";
import { api, type VagStop } from "@/lib/api";

/** Lets the user pick which VGN stop the VAG departures dashboard shows.
 * Search goes through the backend (which proxies the VAG stop API); picking a
 * result saves it immediately. */
export function VagForm({ token }: { token: string }) {
  const [saved, setSaved] = useState<VagStop | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VagStop[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getVagStop(token)
      .then(setSaved)
      .catch(() => setSaved(null)); // 404 = not set yet
  }, [token]);

  const trimmed = query.trim();

  async function search() {
    if (trimmed.length < 2) return;
    setSearching(true);
    setError(null);
    try {
      const found = await api.searchVagStops(token, trimmed);
      setResults(found);
      if (found.length === 0) setError(`No stops found for "${trimmed}".`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSearching(false);
    }
  }

  async function pick(stop: VagStop) {
    setSaving(true);
    setError(null);
    try {
      setSaved(await api.setVagStop(token, stop));
      setResults([]);
      setQuery("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-ui-surface-raised border border-ui-border rounded-ui-n p-ui-m flex flex-col gap-ui-s">
      <div className="text-ui-s text-ui-secondary uppercase tracking-wider font-ui-semibold">
        VGN stop
      </div>
      <div className="flex gap-ui-s items-start">
        <Input
          type="text"
          placeholder="Plärrer"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          disabled={searching || saving}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <Button onClick={search} disabled={trimmed.length < 2 || searching || saving}>
          {searching ? "Searching…" : "Search"}
        </Button>
      </div>
      {results.length > 0 && (
        <div className="flex flex-col gap-ui-xs">
          {results.map((stop) => (
            <button
              key={stop.vgn_number}
              type="button"
              onClick={() => void pick(stop)}
              disabled={saving}
              className="flex items-center justify-between gap-ui-s text-left text-ui-s p-ui-s rounded-ui-s border border-ui-border hover:border-ui-accent hover:bg-ui-accent-soft transition-all duration-ui-fast disabled:opacity-40"
            >
              <span className="text-ui-primary truncate">{stop.name}</span>
              <span className="text-ui-secondary shrink-0">
                {stop.products ?? ""}
              </span>
            </button>
          ))}
        </div>
      )}
      {error && <div className="text-ui-s text-ui-danger">{error}</div>}
      {saved && !error && (
        <div className="text-ui-s text-ui-secondary">
          Showing departures for{" "}
          <span className="text-ui-primary font-ui-semibold">{saved.name}</span>
          {saved.products ? ` (${saved.products})` : ""}.
        </div>
      )}
    </div>
  );
}
