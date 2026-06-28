import { useState } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { api, type Epaper, type EpaperGeometry, type Rotation } from "@/lib/api";

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

function pickGeometry(e: Epaper): EpaperGeometry {
  return {
    screen_width: e.screen_width,
    screen_height: e.screen_height,
    image_width: e.image_width,
    image_height: e.image_height,
    image_x: e.image_x,
    image_y: e.image_y,
    rotation: e.rotation as Rotation,
  };
}

/** Configure the physical screen size and where/how big the rendered dashboard
 * is drawn on it. The backend composites the dashboard onto a screen-sized
 * canvas at this size and position before serving the BMP to the device. */
export function DisplayGeometryForm({
  epaper,
  token,
  onSaved,
}: {
  epaper: Epaper;
  token: string;
  onSaved: (next: Epaper) => void;
}) {
  const [values, setValues] = useState<EpaperGeometry>(() => pickGeometry(epaper));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // The image must fit fully inside the screen at its position.
  const overflowX = values.image_x + values.image_width > values.screen_width;
  const overflowY = values.image_y + values.image_height > values.screen_height;
  const fits = !overflowX && !overflowY;
  const dirty =
    FIELDS.some((f) => values[f.key] !== epaper[f.key]) ||
    values.rotation !== epaper.rotation;

  function set(key: NumericField, raw: string) {
    const n = Number.parseInt(raw, 10);
    setSaved(false);
    setValues((v) => ({ ...v, [key]: Number.isNaN(n) ? 0 : n }));
  }

  function setRotation(raw: string) {
    setSaved(false);
    setValues((v) => ({ ...v, rotation: Number.parseInt(raw, 10) as Rotation }));
  }

  async function save() {
    if (!fits || !dirty) return;
    setBusy(true);
    setError(null);
    try {
      const next = await api.setGeometry(token, epaper.id, values);
      setValues(pickGeometry(next));
      setSaved(true);
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
        Display geometry
      </div>
      <p className="text-s text-fg-2">
        Screen size in pixels, and the size and position of the rendered
        dashboard drawn on it.
      </p>
      <div className="grid grid-cols-2 gap-s mt-xs">
        {FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col gap-xs">
            <span className="text-s text-fg-2">{f.label}</span>
            <Input
              type="number"
              inputMode="numeric"
              min={f.min}
              value={String(values[f.key])}
              onChange={(e) => set(f.key, e.target.value)}
              disabled={busy}
            />
          </label>
        ))}
      </div>
      <label className="flex flex-col gap-xs">
        <span className="text-s text-fg-2">Rotation</span>
        <select
          value={String(values.rotation)}
          onChange={(e) => setRotation(e.target.value)}
          disabled={busy}
          className="w-full px-m py-n rounded-s border border-border-1 bg-bg-1-light text-fg-1 text-m hover:border-border-2 focus:border-highlight focus:shadow-focus outline-none transition-colors duration-fast ease-out"
        >
          {ROTATIONS.map((r) => (
            <option key={r} value={r}>
              {r}°
            </option>
          ))}
        </select>
      </label>
      {!fits && (
        <div className="text-s text-fg-danger">
          The image extends past the {overflowX ? "right" : "bottom"} edge of the
          screen.
        </div>
      )}
      {error && <div className="text-s text-fg-danger">{error}</div>}
      <div className="flex items-center gap-s mt-xs">
        <Button onClick={save} disabled={!fits || !dirty || busy}>
          {busy ? "Saving…" : "Save geometry"}
        </Button>
        {saved && !dirty && (
          <span className="text-s text-fg-2">Saved.</span>
        )}
      </div>
    </div>
  );
}
