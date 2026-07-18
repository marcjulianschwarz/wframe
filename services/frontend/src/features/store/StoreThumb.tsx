import { useEffect, useRef, useState } from "react";
import { api, type DashboardType } from "@/lib/api";

// The epaper's native portrait canvas; thumbnails preserve this 3:5 aspect.
const NATIVE_W = 480;
const NATIVE_H = 800;

interface Props {
  type: DashboardType;
  /** Set the rendered width via a Tailwind width class (e.g. "w-36"); height
   * follows the epaper aspect ratio. */
  className?: string;
}

/** A small live preview of a store dashboard, rendered as a scaled-down iframe
 * of the real preview page. Non-interactive — meant to sit inside a link. */
export function StoreThumb({ type, className = "" }: Props) {
  const [loading, setLoading] = useState(true);
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  // Scale the native-size frame to whatever width the tile ends up at.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / NATIVE_W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={frameRef}
      className={`relative overflow-hidden bg-black ${className}`}
      style={{ aspectRatio: `${NATIVE_W} / ${NATIVE_H}` }}
    >
      {loading && (
        <div className="absolute inset-0 grid place-items-center bg-[var(--paper-2)]">
          <span
            className="inline-block h-5 w-5 animate-spin rounded-full border-2"
            style={{ borderColor: "var(--ink-faint)", borderTopColor: "var(--accent)" }}
            aria-hidden
          />
        </div>
      )}
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: NATIVE_W,
          height: NATIVE_H,
          transform: `scale(${scale})`,
        }}
      >
        <iframe
          title={`${type} preview`}
          src={api.previewUrl(type)}
          width={NATIVE_W}
          height={NATIVE_H}
          className={`border-0 transition-opacity ${
            loading ? "opacity-0" : "opacity-100"
          }`}
          style={{ pointerEvents: "none" }}
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
          sandbox="allow-scripts"
          scrolling="no"
        />
      </div>
    </div>
  );
}
