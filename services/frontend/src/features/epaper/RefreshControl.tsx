import { type EpaperRefresh } from "@/lib/api";
import { useT } from "@/lib/i18n";

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
  const t = useT();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-soft flex-1">
          {value.paused ? t("refresh.stopped") : t("refresh.running")}
        </span>
        <button
          className={value.paused ? "btn btn-accent" : "btn"}
          disabled={disabled}
          onClick={() => onChange({ ...value, paused: !value.paused })}
        >
          {value.paused ? t("refresh.resume") : t("refresh.stop")}
        </button>
      </div>
      <label className="flex flex-col gap-1">
        <span className="field-label">{t("refresh.interval")}</span>
        <input
          className="field"
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
      <span className="text-xs text-soft">
        {t("refresh.intervalHint")}
      </span>
    </div>
  );
}
