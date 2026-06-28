import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { api, type HaConnection } from "@/lib/api";

/** Connect screen for the Home Assistant dashboard.
 *
 * Home Assistant *pushes* light states to wframe (a cloud-hosted wframe can't
 * reach a home behind a router), so there's no data to enter here — only a
 * per-user ingest channel to set up. The user mints a connection, copies the
 * generated automation into their HA config, and lights start flowing. The
 * ingest token is a secret embedded in the webhook URL, so the snippet is
 * treated like the epaper URL: copy, don't share. */
export function HomeAssistantForm({ token }: { token: string }) {
  const [conn, setConn] = useState<HaConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getHaConnection(token)
      .then(setConn)
      .catch(() => setConn(null)) // 404 = not minted yet
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

  if (loading) return <p className="text-fg-2 text-s">Loading…</p>;

  return (
    <div className="bg-bg-1-light border border-border-1 rounded-n p-m flex flex-col gap-s">
      <div className="text-s text-fg-2 uppercase tracking-wider font-semibold">
        Home Assistant connection
      </div>

      {!conn ? (
        <>
          <p className="text-s text-fg-2">
            Home Assistant pushes your lights to wframe. Connect to generate a
            private webhook URL and an automation you paste into Home Assistant.
          </p>
          <Button variant="primary" onClick={connect} disabled={busy} className="self-start">
            {busy ? "Connecting…" : "Connect Home Assistant"}
          </Button>
        </>
      ) : (
        <>
          <CopyField label="Ingest token" value={conn.ingest_token} mono />
          <CopyField label="Webhook URL" value={conn.webhook_url} mono />
          <div className="flex flex-col gap-s pt-s border-t border-border-1">
            <CopyField label="Automation YAML" value={conn.automation_yaml} block />
            <p className="text-s text-fg-2">
              Paste this into your Home Assistant{" "}
              <span className="font-mono">configuration.yaml</span> and restart
              HA. It pushes all your lights once a minute. Keep it private — the
              URL contains your secret token.
            </p>
          </div>

          <div className="flex flex-col gap-s pt-s border-t border-border-1">
            <div className="text-s text-fg-2 uppercase tracking-wider font-semibold">
              Temperature chart (24h)
            </div>
            <CopyField label="Sensor ingest URL" value={conn.sensor_webhook_url} mono />
            <CopyField
              label="Integration config"
              value={conn.sensor_automation_yaml}
              block
            />
            <p className="text-s text-fg-2">
              For a 24h temperature chart, install the wframe Home Assistant
              integration (it reads your sensor's history from the recorder and
              pushes it here). Then paste the config above into{" "}
              <span className="font-mono">configuration.yaml</span>, set your{" "}
              <span className="font-mono">sensor</span> entity, and restart HA.
              Keep it private — the URL contains your secret token.
            </p>
          </div>
        </>
      )}

      {error && <div className="text-s text-fg-danger">{error}</div>}
    </div>
  );
}

/** A labelled value with a Copy button. ``block`` renders multi-line text in a
 * scrollable <pre>; otherwise it's a single inline <code> row. */
function CopyField({
  label,
  value,
  mono,
  block,
}: {
  label: string;
  value: string;
  mono?: boolean;
  block?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="flex flex-col gap-xs">
      <div className="text-s text-fg-2 uppercase tracking-wider">{label}</div>
      <div className={`flex gap-s ${block ? "items-start" : "items-center"}`}>
        {block ? (
          <pre className="flex-1 p-n rounded-s bg-bg-2 border border-border-1 font-mono text-s overflow-x-auto whitespace-pre max-h-72">
            {value}
          </pre>
        ) : (
          <code
            className={`flex-1 ${mono ? "font-mono" : ""} text-s px-n py-s rounded-s bg-bg-2 border border-border-1 break-all`}
          >
            {value}
          </code>
        )}
        <Button onClick={copy}>{copied ? "Copied" : "Copy"}</Button>
      </div>
    </div>
  );
}
