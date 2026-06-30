import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/ui/concepts/button/component";
import { api, type HaConnection } from "@/lib/api";

/** Connect screen for the Home Assistant dashboard.
 *
 * Home Assistant *pushes* sensor history to wframe (a cloud-hosted wframe can't
 * reach a home behind a router), so there's no data to enter here — only a
 * per-user ingest channel to set up. The user mints a connection, copies the
 * generated integration config into their HA config, and the 24h temperature
 * chart starts flowing. The ingest token is a secret embedded in the URL, so
 * the snippet is treated like the epaper URL: copy, don't share. */
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
    <div className="flex flex-col gap-s mt-l border-t border-border-1 pt-l">
      <h4 className="font-semibold text-fg-1">Configure Home Assistant</h4>
      {!conn ? (
        <>
          <p className="text-s text-fg-2">
            Home Assistant pushes your sensor history to wframe. Connect to
            generate a private ingest URL and the integration config you paste
            into Home Assistant.
          </p>
          <Button variant="primary" onClick={connect} disabled={busy} className="self-start">
            {busy ? "Connecting…" : "Connect Home Assistant"}
          </Button>
        </>
      ) : (
        <>
          <CopyField value={conn.sensor_webhook_url} mono />
          <CopyField value={conn.sensor_automation_yaml} block />
          <p className="text-s text-fg-2">
            For a 24h temperature chart, install the wframe Home Assistant
            integration (it reads your sensor's history from the recorder and
            pushes it here). Then paste the config above into{" "}
            <span className="font-mono">configuration.yaml</span>, set your{" "}
            <span className="font-mono">sensor</span> entity, and restart HA.
            Keep it private — the URL contains your secret token.
          </p>
        </>
      )}

      {error && <div className="text-s text-fg-danger">{error}</div>}
    </div>
  );
}

/** A copyable code value with the Copy button pinned inside its top-right
 * corner. ``block`` renders multi-line text in a scrollable <pre>; otherwise
 * it's a single inline <code> row. */
function CopyField({
  value,
  mono,
  block,
}: {
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
    <div className="relative rounded-s bg-bg-2 border border-border-1">
      {block ? (
        <pre className="p-n pr-12 font-mono text-s overflow-x-auto whitespace-pre max-h-72">
          {value}
        </pre>
      ) : (
        <code
          className={`block px-n py-s pr-12 ${mono ? "font-mono" : ""} text-s break-all`}
        >
          {value}
        </code>
      )}
      <Button
        variant="ghost"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy"}
        title={copied ? "Copied" : "Copy"}
        className="absolute right-xs top-xs h-8 w-8 px-0"
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </Button>
    </div>
  );
}
