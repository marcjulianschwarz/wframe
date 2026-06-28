import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Login } from "@/features/auth/Login";
import { CustomUrlForm } from "@/features/dashboard/CustomUrlForm";
import { DashboardSelector } from "@/features/dashboard/DashboardSelector";
import { GithubForm } from "@/features/dashboard/GithubForm";
import { LocationButton } from "@/features/dashboard/LocationButton";
import { EpaperPanel } from "@/features/epaper/EpaperPanel";
import { DisplayGeometryForm } from "@/features/epaper/DisplayGeometryForm";
import { RefreshControl } from "@/features/epaper/RefreshControl";
import { Toast } from "@/components/Toast";
import {
  api,
  type DashboardOption,
  type DashboardType,
  type Epaper,
  type User,
} from "@/lib/api";
import { auth } from "@/lib/auth";

export default function App() {
  const [token, setToken] = useState<string | null>(auth.get());
  const [user, setUser] = useState<User | null>(null);
  const [options, setOptions] = useState<DashboardOption[]>([]);
  const [epaper, setEpaper] = useState<Epaper | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Which dashboard tile is highlighted in the UI (may differ from the saved
  // one while the user previews before deploying).
  const [pending, setPending] = useState<DashboardType | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  // After a successful deploy we show the *actual* device bitmap (cache-busted)
  // as confirmation, instead of the live example HTML. Holds that URL.
  const [deployedSrc, setDeployedSrc] = useState<string | null>(null);
  const [deployedLoading, setDeployedLoading] = useState(false);

  const logout = useCallback(() => {
    auth.clear();
    setToken(null);
    setUser(null);
    setEpaper(null);
  }, []);

  const load = useCallback(
    async (t: string) => {
      try {
        setError(null);
        const [me, opts, ep] = await Promise.all([
          api.me(t),
          api.listDashboards(t),
          api.getEpaper(t),
        ]);
        setUser(me);
        setOptions(opts);
        setEpaper(ep);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // A rejected token means the stored credential is stale; bounce to login.
        if (/invalid or expired|user no longer|missing bearer/i.test(msg)) {
          logout();
          return;
        }
        setError(msg);
      }
    },
    [logout],
  );

  useEffect(() => {
    if (token) void load(token);
  }, [token, load]);

  function selectDashboard(type: DashboardType) {
    setPending(type);
    setPendingUrl(null);
    setPreviewLoading(true);
    // Selecting a new dashboard goes back to the example preview.
    setDeployedSrc(null);
  }

  // Deploy the pending selection to the epaper.
  async function deploy() {
    if (!token || !pending) return;
    setSaving(true);
    try {
      const next = await api.setDashboard(token, pending, pendingUrl);
      setEpaper(next);
      // Pending is now the deployed one.
      setPending(null);
      setPendingUrl(null);
      // Confirm by showing the actual rendered device bitmap, cache-busted so
      // the browser fetches the freshly deployed image rather than a stale one.
      setDeployedLoading(true);
      setDeployedSrc(`${next.bitmap_url}?t=${Date.now()}`);
      setToast("Deployed to your epaper");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setToast(null);
    } finally {
      setSaving(false);
    }
  }

  // The tile that should appear selected: the pending pick, else the deployed.
  const selectedType = pending ?? epaper?.dashboard_type;
  const showCustomForm = selectedType === "custom_url";
  const showLocation = selectedType === "weather";
  const showGithub = selectedType === "github";
  // Deploy is offered whenever the pending pick isn't already the deployed one.
  const canDeploy =
    pending != null &&
    (pending !== epaper?.dashboard_type ||
      (pending === "custom_url" && pendingUrl !== epaper?.custom_url));

  if (!token) return <Login onLogin={() => setToken(auth.get())} />;

  // The preview shows the live example HTML of the selected dashboard, served
  // in an iframe. It uses canned data and never touches the deployed device.
  const previewType = selectedType ?? null;

  // Screen geometry drives both previews so they mirror what the device shows:
  // the dashboard (rendered at its native 480×800) is drawn at image_* size and
  // position on a screen_* canvas. Fall back to a native full-screen layout.
  const NATIVE_W = 480;
  const NATIVE_H = 800;
  const screenW = epaper?.screen_width ?? NATIVE_W;
  const screenH = epaper?.screen_height ?? NATIVE_H;
  const imageW = epaper?.image_width ?? NATIVE_W;
  const imageH = epaper?.image_height ?? NATIVE_H;
  const imageX = epaper?.image_x ?? 0;
  const imageY = epaper?.image_y ?? 0;
  const rotation = epaper?.rotation ?? 0;
  // After a 90/270 rotation the device output's width and height swap; the
  // preview frame and BMP hints follow the rotated (displayed) dimensions.
  const quarterTurn = rotation === 90 || rotation === 270;
  const outW = quarterTurn ? screenH : screenW;
  const outH = quarterTurn ? screenW : screenH;

  return (
    <div className="min-h-screen w-full">
      <div className="w-[90%] sm:w-[80%] max-w-[1000px] mx-auto my-l flex flex-col gap-l">
        <header className="flex items-center justify-between">
          <h1>wframe</h1>
          <div className="flex items-center gap-n">
            {user && <span className="text-s text-fg-2">{user.email}</span>}
            <Button
              variant="ghost"
              onClick={() => setShowSettings((s) => !s)}
              aria-pressed={showSettings}
            >
              {showSettings ? "Done" : "Settings"}
            </Button>
            <Button variant="ghost" onClick={logout}>
              Sign out
            </Button>
          </div>
        </header>

        {error && (
          <div className="p-m rounded-n border border-border-1 bg-bg-danger text-fg-danger text-s">
            {error}
          </div>
        )}

        {showSettings ? (
          <section className="flex flex-col gap-m">
            <div>
              <h2>Settings</h2>
              <p className="text-fg-2 text-s mt-xs">
                Your epaper device URL, refresh control, and display geometry.
              </p>
            </div>
            {epaper && <EpaperPanel epaper={epaper} />}
            {epaper && (
              <RefreshControl
                epaper={epaper}
                token={token}
                onSaved={(next) => {
                  setEpaper(next);
                  setToast(next.paused ? "Display stopped" : "Refresh saved");
                }}
              />
            )}
            {epaper && (
              <DisplayGeometryForm
                epaper={epaper}
                token={token}
                onSaved={(next) => {
                  setEpaper(next);
                  setToast("Display geometry saved");
                }}
              />
            )}
          </section>
        ) : (
        <section className="flex gap-l items-start flex-col lg:flex-row">
          {/* Left: dashboard picker. Deploy lives under the preview on the right. */}
          <div className="flex flex-col gap-m flex-1 w-full">
            <div>
              <h2>Choose a dashboard</h2>
              <p className="text-fg-2 text-s mt-xs">
                Selecting a dashboard previews it on the right. Click Deploy to
                send it to your epaper.
              </p>
            </div>
            <DashboardSelector
              options={options}
              selected={selectedType}
              onSelect={selectDashboard}
              disabled={saving}
            />
            {showCustomForm && (
              <CustomUrlForm
                initialUrl={epaper?.custom_url ?? null}
                saving={saving}
                onSave={(url) => setPendingUrl(url)}
              />
            )}
            {showLocation && <LocationButton token={token} />}
            {showGithub && <GithubForm token={token} />}
          </div>

          {/* Right: after a deploy, the actual device bitmap as confirmation;
              otherwise the live HTML example preview, both laid out to the
              configured screen geometry. */}
          {previewType && (
            <div className="flex flex-col gap-s w-full lg:w-auto lg:shrink-0">
              <h2>{deployedSrc ? "Deployed" : "Preview"}</h2>
              {/* The frame is the sizing authority: it caps the height, and the
                  media fits inside it while keeping the screen's aspect ratio. */}
              <div className="relative bg-bg-1-light border border-border-1 rounded-n p-m flex justify-center h-[55vh]">
                {(deployedSrc ? deployedLoading : previewLoading) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-s text-fg-2 z-10">
                    <span
                      className="inline-block w-6 h-6 rounded-full border-2 border-border-2 border-t-highlight animate-spin"
                      aria-hidden
                    />
                    <span className="text-s">
                      {deployedSrc ? "Fetching device image…" : "Loading preview…"}
                    </span>
                  </div>
                )}
                {deployedSrc ? (
                  // The real 1-bit BMP the epaper now serves — already composited
                  // and rotated, so it carries the displayed (output) ratio.
                  <img
                    key={deployedSrc}
                    src={deployedSrc}
                    alt="deployed epaper bitmap"
                    width={outW}
                    height={outH}
                    style={{ imageRendering: "pixelated" }}
                    className={`h-full w-auto max-w-full object-contain transition-opacity duration-fast ${
                      deployedLoading ? "opacity-0" : "opacity-100"
                    }`}
                    onLoad={() => setDeployedLoading(false)}
                    onError={() => setDeployedLoading(false)}
                  />
                ) : (
                  // Mirror the device: a screen_W×screen_H canvas (dashboard drawn
                  // at image_* size/position) scaled to the frame height and
                  // rotated clockwise. The outer box takes the output ratio so
                  // 90/270 turns reshape the frame.
                  <div
                    className="relative h-full overflow-hidden flex items-center justify-center"
                    style={{ aspectRatio: `${outW} / ${outH}` }}
                  >
                    {/* Unrotated screen canvas in real pixels, scaled so its
                        post-rotation height fills the frame (55vh minus the p-m
                        padding of 1rem each side), then rotated clockwise. */}
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
                        style={{
                          left: imageX,
                          top: imageY,
                          width: imageW,
                          height: imageH,
                        }}
                      >
                        <iframe
                          key={previewType}
                          title="dashboard preview"
                          src={api.previewUrl(previewType)}
                          width={NATIVE_W}
                          height={NATIVE_H}
                          style={{
                            transformOrigin: "top left",
                            // Stretch the native 480×800 content to fill the
                            // drawn-image box, matching the backend's resize.
                            transform: `scale(${imageW / NATIVE_W}, ${imageH / NATIVE_H})`,
                          }}
                          className={`border-0 transition-opacity duration-fast ${
                            previewLoading ? "opacity-0" : "opacity-100"
                          }`}
                          onLoad={() => setPreviewLoading(false)}
                          sandbox="allow-scripts"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Deploy lives directly under the preview it acts on. */}
              <div className="flex flex-col gap-s">
                <Button
                  variant="primary"
                  onClick={deploy}
                  disabled={!canDeploy || saving}
                >
                  {saving ? "Deploying…" : "Deploy to epaper"}
                </Button>
                {deployedSrc ? (
                  <span className="text-s text-fg-2">
                    This is the actual image your epaper is now serving.
                  </span>
                ) : pending && pending !== epaper?.dashboard_type ? (
                  <span className="text-s text-fg-2">
                    Previewing <span className="font-mono">{pending}</span> with
                    example data. Your epaper still shows{" "}
                    <span className="font-mono">{epaper?.dashboard_type}</span>.
                  </span>
                ) : (
                  <span className="text-s text-fg-2">
                    Example preview of what your epaper is serving.
                  </span>
                )}
              </div>
            </div>
          )}
        </section>
        )}
      </div>

      {toast && (
        <Toast message={toast} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
