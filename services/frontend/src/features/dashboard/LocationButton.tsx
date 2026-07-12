import { useEffect, useState } from "react";
import { Button } from "@/ui/concepts/button/component";
import { api, type Location } from "@/lib/api";

/** Lets the user grant browser geolocation, which the weather dashboard needs.
 * Stores the coordinates server-side so the renderer can fetch a forecast. */
export function LocationButton({ token }: { token: string }) {
  const [loc, setLoc] = useState<Location | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getLocation(token)
      .then(setLoc)
      .catch(() => setLoc(null)); // 404 = not set yet
  }, [token]);

  function requestLocation() {
    setError(null);
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const next = await api.setLocation(
            token,
            pos.coords.latitude,
            pos.coords.longitude,
          );
          setLoc(next);
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
        } finally {
          setBusy(false);
        }
      },
      (err) => {
        setError(err.message || "Could not get your location.");
        setBusy(false);
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  return (
    <div className="bg-ui-surface-raised border border-ui-border rounded-ui-n p-ui-m flex flex-col gap-ui-s">
      <div className="text-ui-s text-ui-secondary uppercase tracking-wider font-ui-semibold">
        Weather location
      </div>
      <div className="flex items-center gap-ui-s flex-wrap">
        <Button onClick={requestLocation} disabled={busy}>
          {busy ? "Locating…" : loc ? "Update location" : "Allow location"}
        </Button>
        {loc && (
          <span className="text-ui-s text-ui-secondary font-ui-mono">
            {loc.latitude.toFixed(3)}, {loc.longitude.toFixed(3)}
          </span>
        )}
      </div>
      {!loc && !error && (
        <div className="text-ui-s text-ui-secondary">
          The weather dashboard needs your location to fetch a local forecast.
        </div>
      )}
      {error && <div className="text-ui-s text-ui-danger">{error}</div>}
    </div>
  );
}
