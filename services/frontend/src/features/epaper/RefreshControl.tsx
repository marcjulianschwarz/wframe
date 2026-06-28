import { useState } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { api, type Epaper } from "@/lib/api";

/** Stop/resume the device and set how often it redraws. Stopping pauses the
 * bitmap endpoint (it returns 204) so the epaper freezes on its last image;
 * the refresh interval is the wait between redraws when running. */
export function RefreshControl({
  epaper,
  token,
  onSaved,
}: {
  epaper: Epaper;
  token: string;
  onSaved: (next: Epaper) => void;
}) {
  const [interval, setIntervalValue] = useState(epaper.refresh_interval);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const intervalDirty = interval !== epaper.refresh_interval;

  async function save(paused: boolean, refresh_interval: number) {
    setBusy(true);
    setError(null);
    try {
      const next = await api.setRefresh(token, epaper.id, { paused, refresh_interval });
      setIntervalValue(next.refresh_interval);
      onSaved(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-bg-1-light border border-border-1 rounded-n p-m flex flex-col gap-s shadow-normal">
      <div className="text-s text-fg-2 uppercase tracking-wider font-semibold">
        Refresh
      </div>
      <div className="flex items-center gap-s">
        <span className="text-s text-fg-2 flex-1">
          {epaper.paused
            ? "Stopped — the display is frozen on its last image."
            : "Running — the display redraws on the interval below."}
        </span>
        {epaper.paused ? (
          <Button
            variant="primary"
            disabled={busy}
            onClick={() => save(false, epaper.refresh_interval)}
          >
            {busy ? "…" : "Resume"}
          </Button>
        ) : (
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => save(true, epaper.refresh_interval)}
          >
            {busy ? "…" : "Stop"}
          </Button>
        )}
      </div>
      <label className="flex flex-col gap-xs">
        <span className="text-s text-fg-2">Refresh interval (seconds)</span>
        <div className="flex gap-s items-start">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={String(interval)}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10);
              setIntervalValue(Number.isNaN(n) ? 0 : n);
            }}
            disabled={busy}
          />
          <Button
            disabled={busy || !intervalDirty || interval < 0}
            onClick={() => save(epaper.paused, interval)}
          >
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </label>
      <span className="text-s text-fg-2">
        0 redraws on every device poll (~5s). Higher values save panel wear.
      </span>
      {error && <div className="text-s text-fg-danger">{error}</div>}
    </div>
  );
}
