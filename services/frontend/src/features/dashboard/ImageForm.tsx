import { useEffect, useRef, useState } from "react";
import { Button } from "@/ui/concepts/button/component";
import { api, type ImageAlgorithm, type ImageConfig, type ImageFit } from "@/lib/api";

const ALGORITHMS: { value: ImageAlgorithm; label: string }[] = [
  { value: "floyd_steinberg", label: "Floyd–Steinberg" },
  { value: "ordered", label: "Ordered (Bayer)" },
  { value: "atkinson", label: "Atkinson" },
  { value: "threshold", label: "Threshold" },
];

const FITS: { value: ImageFit; label: string }[] = [
  { value: "contain", label: "Contain (letterbox)" },
  { value: "cover", label: "Cover (crop)" },
  { value: "stretch", label: "Stretch" },
];

/** Uploads the source image for the Image dashboard and lets the user pick a
 * dithering algorithm + fit. The original is stored server-side, so changing
 * the algorithm/fit re-dithers without a re-upload. */
export function ImageForm({ token }: { token: string }) {
  const [config, setConfig] = useState<ImageConfig | null>(null);
  // Local mirror of config.contrast so the slider can update its label live and
  // only commit (a PATCH) on release; re-synced whenever config changes.
  const [contrast, setContrast] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .getImage(token)
      .then(setConfig)
      .catch(() => setConfig(null)); // 404 = nothing uploaded yet
  }, [token]);

  useEffect(() => {
    if (config) setContrast(config.contrast);
  }, [config]);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      setConfig(await api.uploadImage(token, file));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function changeSettings(algorithm: ImageAlgorithm, fit: ImageFit, contrast: number) {
    setBusy(true);
    setError(null);
    try {
      setConfig(await api.setImageSettings(token, algorithm, fit, contrast));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-bg-1-light border border-border-1 rounded-n p-m flex flex-col gap-s">
      <div className="text-s text-fg-2 uppercase tracking-wider font-semibold">Image</div>
      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/bmp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = ""; // allow re-selecting the same file
        }}
      />
      <div className="flex items-center gap-s flex-wrap">
        <Button onClick={() => fileInput.current?.click()} disabled={busy}>
          {busy ? "Uploading…" : config ? "Replace image" : "Upload image"}
        </Button>
        {config && <span className="text-s text-fg-2 font-mono">{config.content_type}</span>}
      </div>
      {!config && !error && (
        <div className="text-s text-fg-2">
          Upload an image (PNG, JPEG, GIF, WebP, or BMP, max 8&nbsp;MB) to show it fullscreen.
        </div>
      )}
      {config && (
        <>
          <label className="text-s text-fg-2 flex flex-col gap-xs">
            Dithering
            <select
              className="bg-bg-1 border border-border-1 rounded-n p-xs text-fg-1"
              value={config.algorithm}
              disabled={busy}
              onChange={(e) =>
                void changeSettings(e.target.value as ImageAlgorithm, config.fit, config.contrast)
              }
            >
              {ALGORITHMS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-s text-fg-2 flex flex-col gap-xs">
            Fit
            <select
              className="bg-bg-1 border border-border-1 rounded-n p-xs text-fg-1"
              value={config.fit}
              disabled={busy}
              onChange={(e) =>
                void changeSettings(config.algorithm, e.target.value as ImageFit, config.contrast)
              }
            >
              {FITS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-s text-fg-2 flex flex-col gap-xs">
            <span>
              Contrast <span className="font-mono">{contrast.toFixed(2)}×</span>
              <span className="opacity-60"> — lower to recover detail</span>
            </span>
            <input
              type="range"
              min={0.2}
              max={2}
              step={0.05}
              value={contrast}
              disabled={busy}
              // Track locally for a live label; commit once on release so we
              // don't fire a PATCH on every slider tick.
              onChange={(e) => setContrast(Number(e.target.value))}
              onPointerUp={() => void changeSettings(config.algorithm, config.fit, contrast)}
              onKeyUp={() => void changeSettings(config.algorithm, config.fit, contrast)}
            />
          </label>
        </>
      )}
      {error && <div className="text-s text-fg-danger">{error}</div>}
    </div>
  );
}
