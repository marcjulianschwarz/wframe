import { Button } from "@/ui/concepts/button/component";
import { Input } from "@/components/Input";
import { type EpaperRefresh } from "@/lib/api";

/** Controlled form for stop/resume and the redraw interval. The parent owns the
 * value and saves it. Stopping freezes the display on its last image; the
 * interval is the wait between redraws when running. */
export function RefreshControl({
  value,
  onChange,
  disabled,
}: {
  value: EpaperRefresh;
  onChange: (next: EpaperRefresh) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-ui-s">
      <div className="flex items-center gap-ui-s">
        <span className="text-ui-s text-ui-secondary flex-1">
          {value.paused
            ? "Stopped — the display is frozen on its last image."
            : "Running — the display redraws on the interval below."}
        </span>
        <Button
          variant={value.paused ? "primary" : "ghost"}
          disabled={disabled}
          onClick={() => onChange({ ...value, paused: !value.paused })}
        >
          {value.paused ? "Resume" : "Stop"}
        </Button>
      </div>
      <label className="flex flex-col gap-ui-xs">
        <span className="text-ui-s text-ui-secondary">Refresh interval (seconds)</span>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          value={String(value.refresh_interval)}
          onChange={(e) => {
            const n = Number.parseInt(e.target.value, 10);
            onChange({ ...value, refresh_interval: Number.isNaN(n) ? 0 : n });
          }}
          disabled={disabled}
        />
      </label>
      <span className="text-ui-s text-ui-secondary">
        0 redraws on every device poll (~5s). Higher values save panel wear.
      </span>
    </div>
  );
}
