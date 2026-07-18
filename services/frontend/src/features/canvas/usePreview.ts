import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Epaper } from "@/lib/api";
import { useSession } from "@/lib/session";
import { qk } from "@/lib/queries";

/** How often the preview re-fetches the panel's BMP when the epaper has no
 * refresh interval set (interval 0 = "always serving"). */
const DEFAULT_PREVIEW_INTERVAL_S = 30;

/** Fields that change the rendered image; folded into the query key so editing
 * geometry/dashboard fetches a fresh frame while a stale one stays cached. */
function renderSignature(e: Epaper): string {
  return [
    e.dashboard_id,
    e.refresh_interval,
    e.screen_width,
    e.screen_height,
    e.image_width,
    e.image_height,
    e.image_x,
    e.image_y,
    e.rotation,
  ].join("|");
}

/** Fetches the real panel BMP for an epaper (as a blob object URL) and re-fetches
 * on its refresh cadence, so the preview mirrors what the device shows. Backed by
 * TanStack Query, so navigating between pages shows the cached frame instantly —
 * no "Rendering…" flash — while it revalidates in the background. Returns the
 * frame URL (or null when there's no dashboard / nothing fetched) plus a `bump()`
 * to force an immediate re-pull after an instant refresh. */
export function usePreview(epaper: Epaper): { src: string | null; bump: () => void } {
  const { token } = useSession();
  const qc = useQueryClient();
  const hasDashboard = epaper.dashboard_id !== null;
  const sig = renderSignature(epaper);
  const key = qk.preview(epaper.id, sig);

  const periodS =
    epaper.refresh_interval > 0 ? epaper.refresh_interval : DEFAULT_PREVIEW_INTERVAL_S;

  const { data } = useQuery({
    queryKey: key,
    queryFn: () => api.previewBitmap(token, epaper.id),
    enabled: hasDashboard,
    refetchInterval: periodS * 1000,
    // The blob URL is stable content for a given signature; revalidate on the
    // device cadence, not on mount, so navigation reuses the cached frame. Keep
    // it around a while so revisiting a page is instant.
    staleTime: periodS * 1000,
    gcTime: 5 * 60_000,
  });

  return {
    src: hasDashboard ? (data ?? null) : null,
    bump: () => void qc.invalidateQueries({ queryKey: key }),
  };
}

/** Longest edge an epaper frame is allowed to occupy on the canvas. The device is
 * drawn at its *true* aspect ratio, scaled so its longest side hits this. */
export const MAX_EDGE = 320;

/** The on-screen pixel size for an epaper's frame, at its true post-rotation
 * aspect ratio, scaled so the longest side hits `maxEdge`. */
export function frameSize(e: Epaper, maxEdge = MAX_EDGE): { w: number; h: number; scale: number } {
  const quarter = e.rotation === 90 || e.rotation === 270;
  const outW = quarter ? e.screen_height : e.screen_width;
  const outH = quarter ? e.screen_width : e.screen_height;
  const scale = maxEdge / Math.max(outW, outH);
  return { w: Math.round(outW * scale), h: Math.round(outH * scale), scale };
}
