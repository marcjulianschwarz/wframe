import { useState } from "react";
import { type Epaper } from "@/lib/api";

const NATIVE_W = 480;
const NATIVE_H = 800;

interface Props {
  /** Live example HTML URL to render in the iframe (the "preview" mode). */
  previewUrl?: string | null;
  /** A rendered device bitmap URL to show instead (the "deployed" mode). */
  bitmapSrc?: string | null;
  /** Screen geometry to lay the content out at; falls back to native full screen. */
  epaper?: Epaper | null;
}

/** Mirrors what the device shows: a screen_W×screen_H canvas with the dashboard
 * drawn at image_* size/position, scaled into the frame and rotated clockwise.
 * Either renders the live preview iframe or a deployed bitmap image. */
export function DashboardPreview({ previewUrl, bitmapSrc, epaper }: Props) {
  const [loading, setLoading] = useState(true);

  const screenW = epaper?.screen_width ?? NATIVE_W;
  const screenH = epaper?.screen_height ?? NATIVE_H;
  const imageW = epaper?.image_width ?? NATIVE_W;
  const imageH = epaper?.image_height ?? NATIVE_H;
  const imageX = epaper?.image_x ?? 0;
  const imageY = epaper?.image_y ?? 0;
  const rotation = epaper?.rotation ?? 0;
  // After a 90/270 rotation the output's width and height swap.
  const quarterTurn = rotation === 90 || rotation === 270;
  const outW = quarterTurn ? screenH : screenW;
  const outH = quarterTurn ? screenW : screenH;

  return (
    <div className="relative bg-ui-surface-raised border border-ui-border rounded-ui-n p-ui-m flex justify-center h-[55vh]">
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-ui-s text-ui-secondary z-10">
          <span
            className="inline-block w-6 h-6 rounded-full border-2 border-ui-border-strong border-t-ui-accent animate-spin"
            aria-hidden
          />
          <span className="text-ui-s">
            {bitmapSrc ? "Fetching device image…" : "Loading preview…"}
          </span>
        </div>
      )}
      {bitmapSrc ? (
        <img
          key={bitmapSrc}
          src={bitmapSrc}
          alt="deployed epaper bitmap"
          width={outW}
          height={outH}
          style={{ imageRendering: "pixelated" }}
          className={`h-full w-auto max-w-full object-contain transition-opacity duration-ui-fast ${
            loading ? "opacity-0" : "opacity-100"
          }`}
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
        />
      ) : (
        <div
          className="relative h-full overflow-hidden flex items-center justify-center"
          style={{ aspectRatio: `${outW} / ${outH}` }}
        >
          <div
            className="origin-center overflow-hidden bg-black shrink-0"
            style={{
              position: "relative",
              width: screenW,
              height: screenH,
              transform: `rotate(${rotation}deg) scale(calc((55vh - 2rem) / ${outH}))`,
            }}
          >
            <div
              className="absolute overflow-hidden"
              style={{ left: imageX, top: imageY, width: imageW, height: imageH }}
            >
              <iframe
                key={previewUrl}
                title="dashboard preview"
                src={previewUrl ?? undefined}
                width={NATIVE_W}
                height={NATIVE_H}
                style={{
                  transformOrigin: "top left",
                  transform: `scale(${imageW / NATIVE_W}, ${imageH / NATIVE_H})`,
                }}
                className={`border-0 transition-opacity duration-ui-fast ${
                  loading ? "opacity-0" : "opacity-100"
                }`}
                onLoad={() => setLoading(false)}
                sandbox="allow-scripts"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
