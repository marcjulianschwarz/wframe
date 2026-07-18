import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import {
  api,
  type DashboardType,
  type HaConnection,
  type ImageAlgorithm,
  type ImageConfig,
  type ImageFit,
  type Location,
  type VagStop,
} from "@/lib/api";
import { useSession } from "@/lib/session";

/** Per-dashboard-type settings, rendered inside the dashboard edit modal. Each
 * type has its own backend config (GitHub username, weather location, transit
 * stop, image upload, Home Assistant connection); types without settings render
 * nothing. */
export function DashboardConfig({ type }: { type: DashboardType | null }) {
  if (type === "weather") return <LocationConfig />;
  if (type === "github") return <GithubConfig />;
  if (type === "homeassistant" || type === "homeassistant_temp")
    return <HomeAssistantConfig />;
  if (type === "image") return <ImageConfig />;
  if (type === "vag") return <VagConfig />;
  if (type === "calendar") return <CalendarConfig />;
  return null;
}

/** A titled box wrapping one type's settings. */
function ConfigBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="sketch p-3 flex flex-col gap-2" style={{ borderRadius: 16 }}>
      <div className="field-label uppercase tracking-wider">{title}</div>
      {children}
    </div>
  );
}

function ErrorLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm" style={{ color: "var(--danger)" }}>
      {children}
    </div>
  );
}

function CalendarConfig() {
  const { token } = useSession();
  const [url, setUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getCalendar(token)
      .then((c) => setUrl(c.ics_url))
      .catch(() => {
        // No feed yet — leave blank; the renderer shows a "set a feed" screen.
      });
  }, [token]);

  const trimmed = url.trim();
  const valid = /^(webcal|https?):\/\//i.test(trimmed);

  async function save() {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const c = await api.setCalendar(token, trimmed);
      setUrl(c.ics_url);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConfigBox title="Calendar feed (ICS link)">
      <div className="flex gap-2 items-start">
        <input
          className="field"
          type="url"
          placeholder="webcal://…  or  https://…/calendar.ics"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void save()}
          disabled={busy}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <button className="btn" onClick={() => void save()} disabled={!valid || busy}>
          {busy ? "Saving…" : saved ? "Saved" : "Save"}
        </button>
      </div>
      {url.length > 0 && !valid && (
        <ErrorLine>Paste a webcal:// or https:// calendar link.</ErrorLine>
      )}
      {error && <ErrorLine>{error}</ErrorLine>}
      <div className="text-sm text-soft">
        Paste a published iCalendar link (e.g. from iCloud, Google Calendar) to
        show your upcoming events. Keep this link private — anyone who has it can
        read the calendar. It's stored on your account and fetched server-side; it
        is never logged.
      </div>
    </ConfigBox>
  );
}

function GithubConfig() {
  const { token } = useSession();
  const [username, setUsername] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getGithub(token)
      .then((p) => {
        setSaved(p.username);
        setUsername(p.username);
      })
      .catch(() => setSaved(null));
  }, [token]);

  const trimmed = username.trim();
  const valid = /^[A-Za-z0-9-]{1,39}$/.test(trimmed);

  async function save() {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const p = await api.setGithub(token, trimmed);
      setSaved(p.username);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConfigBox title="GitHub username">
      <div className="flex gap-2 items-start">
        <input
          className="field"
          type="text"
          placeholder="octocat"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void save()}
          disabled={busy}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <button
          className="btn"
          onClick={() => void save()}
          disabled={!valid || busy || trimmed === saved}
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
      {username.length > 0 && !valid && (
        <ErrorLine>Letters, numbers, and hyphens only (max 39 characters).</ErrorLine>
      )}
      {error && <ErrorLine>{error}</ErrorLine>}
      {saved && !error && (
        <div className="text-sm text-soft">
          Showing the public profile for <span className="font-bold">@{saved}</span>.
        </div>
      )}
    </ConfigBox>
  );
}

function LocationConfig() {
  const { token } = useSession();
  const [loc, setLoc] = useState<Location | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getLocation(token)
      .then(setLoc)
      .catch(() => setLoc(null));
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
          setLoc(await api.setLocation(token, pos.coords.latitude, pos.coords.longitude));
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
    <ConfigBox title="Weather location">
      <div className="flex items-center gap-2 flex-wrap">
        <button className="btn" onClick={requestLocation} disabled={busy}>
          {busy ? "Locating…" : loc ? "Update location" : "Allow location"}
        </button>
        {loc && (
          <span className="text-sm text-soft">
            {loc.latitude.toFixed(3)}, {loc.longitude.toFixed(3)}
          </span>
        )}
      </div>
      {!loc && !error && (
        <div className="text-sm text-soft">
          The weather dashboard needs your location to fetch a local forecast.
        </div>
      )}
      {error && <ErrorLine>{error}</ErrorLine>}
    </ConfigBox>
  );
}

function VagConfig() {
  const { token } = useSession();
  const [saved, setSaved] = useState<VagStop | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VagStop[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getVagStop(token)
      .then(setSaved)
      .catch(() => setSaved(null));
  }, [token]);

  const trimmed = query.trim();

  async function search() {
    if (trimmed.length < 2) return;
    setSearching(true);
    setError(null);
    try {
      const found = await api.searchVagStops(token, trimmed);
      setResults(found);
      if (found.length === 0) setError(`No stops found for "${trimmed}".`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSearching(false);
    }
  }

  async function pick(stop: VagStop) {
    setSaving(true);
    setError(null);
    try {
      setSaved(await api.setVagStop(token, stop));
      setResults([]);
      setQuery("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ConfigBox title="VGN stop">
      <div className="flex gap-2 items-start">
        <input
          className="field"
          type="text"
          placeholder="Plärrer"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void search()}
          disabled={searching || saving}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <button
          className="btn"
          onClick={() => void search()}
          disabled={trimmed.length < 2 || searching || saving}
        >
          {searching ? "Searching…" : "Search"}
        </button>
      </div>
      {results.length > 0 && (
        <div className="flex flex-col gap-1">
          {results.map((stop) => (
            <button
              key={stop.vgn_number}
              type="button"
              onClick={() => void pick(stop)}
              disabled={saving}
              className="chip flex items-center justify-between gap-2 text-left disabled:opacity-40"
              style={{ borderRadius: 12, justifyContent: "space-between" }}
            >
              <span className="truncate">{stop.name}</span>
              <span className="text-soft shrink-0">{stop.products ?? ""}</span>
            </button>
          ))}
        </div>
      )}
      {error && <ErrorLine>{error}</ErrorLine>}
      {saved && !error && (
        <div className="text-sm text-soft">
          Showing departures for <span className="font-bold">{saved.name}</span>
          {saved.products ? ` (${saved.products})` : ""}.
        </div>
      )}
    </ConfigBox>
  );
}

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

function ImageConfig() {
  const { token } = useSession();
  const [config, setConfig] = useState<ImageConfig | null>(null);
  const [contrast, setContrast] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .getImage(token)
      .then(setConfig)
      .catch(() => setConfig(null));
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

  async function changeSettings(algorithm: ImageAlgorithm, fit: ImageFit, c: number) {
    setBusy(true);
    setError(null);
    try {
      setConfig(await api.setImageSettings(token, algorithm, fit, c));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConfigBox title="Image">
      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/bmp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = "";
        }}
      />
      <div className="flex items-center gap-2 flex-wrap">
        <button className="btn" onClick={() => fileInput.current?.click()} disabled={busy}>
          {busy ? "Uploading…" : config ? "Replace image" : "Upload image"}
        </button>
        {config && <span className="text-sm text-soft">{config.content_type}</span>}
      </div>
      {!config && !error && (
        <div className="text-sm text-soft">
          Upload an image (PNG, JPEG, GIF, WebP, or BMP, max 8&nbsp;MB) to show it
          fullscreen.
        </div>
      )}
      {config && (
        <>
          <label className="flex flex-col gap-1">
            <span className="field-label">Dithering</span>
            <select
              className="field"
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
          <label className="flex flex-col gap-1">
            <span className="field-label">Fit</span>
            <select
              className="field"
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
          <label className="flex flex-col gap-1">
            <span className="field-label">
              Contrast {contrast.toFixed(2)}× — lower to recover detail
            </span>
            <input
              type="range"
              min={0.2}
              max={2}
              step={0.05}
              value={contrast}
              disabled={busy}
              onChange={(e) => setContrast(Number(e.target.value))}
              onPointerUp={() => void changeSettings(config.algorithm, config.fit, contrast)}
              onKeyUp={() => void changeSettings(config.algorithm, config.fit, contrast)}
            />
          </label>
        </>
      )}
      {error && <ErrorLine>{error}</ErrorLine>}
    </ConfigBox>
  );
}

function HomeAssistantConfig() {
  const { token } = useSession();
  const [conn, setConn] = useState<HaConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getHaConnection(token)
      .then(setConn)
      .catch(() => setConn(null))
      .finally(() => setLoading(false));
  }, [token]);

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      setConn(await api.createHaConnection(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConfigBox title="Home Assistant">
      {loading ? (
        <p className="text-sm text-soft">Loading…</p>
      ) : !conn ? (
        <>
          <p className="text-sm text-soft">
            Home Assistant pushes your sensor history to wframe. Connect to generate
            a private ingest URL and the integration config you paste into Home
            Assistant.
          </p>
          <button className="btn btn-accent self-start" onClick={() => void connect()} disabled={busy}>
            {busy ? "Connecting…" : "Connect Home Assistant"}
          </button>
        </>
      ) : (
        <>
          <CopyField value={conn.sensor_webhook_url} />
          <CopyField value={conn.sensor_automation_yaml} block />
          <p className="text-sm text-soft">
            Paste the config above into your Home Assistant configuration, set your
            sensor entity, and restart HA. Keep it private — the URL contains your
            secret token.
          </p>
        </>
      )}
      {error && <ErrorLine>{error}</ErrorLine>}
    </ConfigBox>
  );
}

function CopyField({ value, block }: { value: string; block?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }
  return (
    <div className="relative rounded-xl border-2 bg-[var(--paper-2)]" style={{ borderColor: "var(--line)" }}>
      {block ? (
        <pre className="p-3 pr-12 text-xs overflow-x-auto whitespace-pre max-h-72">{value}</pre>
      ) : (
        <code className="block px-3 py-2 pr-12 text-xs break-all">{value}</code>
      )}
      <button
        className="icon-btn absolute right-1.5 top-1.5"
        style={{ width: 30, height: 30 }}
        onClick={() => void copy()}
        aria-label={copied ? "Copied" : "Copy"}
        title={copied ? "Copied" : "Copy"}
      >
        {copied ? <Check size={15} /> : <Copy size={15} />}
      </button>
    </div>
  );
}
