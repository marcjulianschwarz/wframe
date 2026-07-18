import { type EpaperGeometry, type Rotation } from "@/lib/api";
import { useT } from "@/lib/i18n";
import type { TKey } from "@/lib/i18n";

type NumericField = Exclude<keyof EpaperGeometry, "rotation">;

const FIELDS: { key: NumericField; labelKey: TKey; min: number }[] = [
  { key: "screen_width", labelKey: "geometry.screenWidth", min: 1 },
  { key: "screen_height", labelKey: "geometry.screenHeight", min: 1 },
  { key: "image_width", labelKey: "geometry.imageWidth", min: 1 },
  { key: "image_height", labelKey: "geometry.imageHeight", min: 1 },
  { key: "image_x", labelKey: "geometry.imageX", min: 0 },
  { key: "image_y", labelKey: "geometry.imageY", min: 0 },
];

const ROTATIONS: Rotation[] = [0, 90, 180, 270];

/** Controlled form for the physical screen size and where/how big the rendered
 * dashboard is drawn on it. The parent owns the value and saves it. */
export function DisplayGeometryForm({
  value,
  onChange,
  disabled,
}: {
  value: EpaperGeometry;
  onChange: (next: EpaperGeometry) => void;
  disabled?: boolean;
}) {
  const t = useT();
  const overflowX = value.image_x + value.image_width > value.screen_width;
  const overflowY = value.image_y + value.image_height > value.screen_height;
  const fits = !overflowX && !overflowY;

  function set(key: NumericField, raw: string) {
    const n = Number.parseInt(raw, 10);
    onChange({ ...value, [key]: Number.isNaN(n) ? 0 : n });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-soft">
        {t("geometry.intro")}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col gap-1">
            <span className="field-label">{t(f.labelKey)}</span>
            <input
              className="field"
              type="number"
              inputMode="numeric"
              min={f.min}
              value={String(value[f.key])}
              onChange={(e) => set(f.key, e.target.value)}
              disabled={disabled}
            />
          </label>
        ))}
      </div>
      <label className="flex flex-col gap-1">
        <span className="field-label">{t("geometry.rotation")}</span>
        <select
          className="field"
          value={String(value.rotation)}
          onChange={(e) =>
            onChange({ ...value, rotation: Number.parseInt(e.target.value, 10) as Rotation })
          }
          disabled={disabled}
        >
          {ROTATIONS.map((r) => (
            <option key={r} value={r}>
              {r}°
            </option>
          ))}
        </select>
      </label>
      {!fits && (
        <div className="text-sm" style={{ color: "var(--danger)" }}>
          {overflowX ? t("geometry.overflowRight") : t("geometry.overflowBottom")}
        </div>
      )}
    </div>
  );
}
