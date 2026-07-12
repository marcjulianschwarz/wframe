import { Input } from "@/components/Input";
import { type EpaperGeometry, type Rotation } from "@/lib/api";

type NumericField = Exclude<keyof EpaperGeometry, "rotation">;

const FIELDS: { key: NumericField; label: string; min: number }[] = [
  { key: "screen_width", label: "Screen width", min: 1 },
  { key: "screen_height", label: "Screen height", min: 1 },
  { key: "image_width", label: "Image width", min: 1 },
  { key: "image_height", label: "Image height", min: 1 },
  { key: "image_x", label: "Image X", min: 0 },
  { key: "image_y", label: "Image Y", min: 0 },
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
  const overflowX = value.image_x + value.image_width > value.screen_width;
  const overflowY = value.image_y + value.image_height > value.screen_height;
  const fits = !overflowX && !overflowY;

  function set(key: NumericField, raw: string) {
    const n = Number.parseInt(raw, 10);
    onChange({ ...value, [key]: Number.isNaN(n) ? 0 : n });
  }

  return (
    <div className="flex flex-col gap-ui-s">
      <p className="text-ui-s text-ui-secondary">
        Screen size in pixels, and the size and position of the rendered
        dashboard drawn on it.
      </p>
      <div className="grid grid-cols-2 gap-ui-s mt-ui-xs">
        {FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col gap-ui-xs">
            <span className="text-ui-s text-ui-secondary">{f.label}</span>
            <Input
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
      <label className="flex flex-col gap-ui-xs">
        <span className="text-ui-s text-ui-secondary">Rotation</span>
        <select
          value={String(value.rotation)}
          onChange={(e) =>
            onChange({ ...value, rotation: Number.parseInt(e.target.value, 10) as Rotation })
          }
          disabled={disabled}
          className="w-full px-ui-m py-ui-n rounded-ui-s border border-ui-border bg-ui-surface-raised text-ui-primary text-ui-m hover:border-ui-border-strong focus:border-ui-accent focus:shadow-ui-focus outline-none transition-colors duration-ui-fast ease-ui-out"
        >
          {ROTATIONS.map((r) => (
            <option key={r} value={r}>
              {r}°
            </option>
          ))}
        </select>
      </label>
      {!fits && (
        <div className="text-ui-s text-ui-danger">
          The image extends past the {overflowX ? "right" : "bottom"} edge of the
          screen.
        </div>
      )}
    </div>
  );
}
