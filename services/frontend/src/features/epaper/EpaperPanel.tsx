import { useState } from "react";
import { Button } from "@/ui/concepts/button/component";
import { type Epaper } from "@/lib/api";
import { downloadWframePackage } from "./esphomeBundle";

export function EpaperPanel({ epaper }: { epaper: Epaper }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(epaper.bitmap_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="flex flex-col gap-ui-s">
      <div className="text-ui-s text-ui-secondary uppercase tracking-wider font-ui-semibold">
        Device URL
      </div>
      <div className="flex gap-ui-s items-center">
        <code className="flex-1 font-ui-mono text-ui-s px-ui-n py-ui-s rounded-ui-s bg-ui-surface-sunken border border-ui-border break-all">
          {epaper.bitmap_url}
        </code>
        <Button onClick={copy}>{copied ? "Copied" : "Copy"}</Button>
      </div>
      <div className="text-ui-s text-ui-secondary">
        Paste into your ESPHome <span className="font-ui-mono">epaper.yaml</span>{" "}
        as <span className="font-ui-mono">streaming_bmp.url</span>, or download the
        ready-made package below.
      </div>

      <div className="flex flex-col gap-ui-s pt-ui-s border-t border-ui-border">
        <Button
          variant="primary"
          className="self-start"
          onClick={() => downloadWframePackage(epaper)}
        >
          Download wframe.yaml
        </Button>
        <div className="text-ui-s text-ui-secondary">
          <p>
            This is a self-contained ESPHome <em>package</em>: it pulls in the{" "}
            <span className="font-ui-mono">streaming_bmp</span> component and your
            bitmap stream, with your URL already filled in. You keep your own
            board, wifi, and display config — just include this file and point
            it at your display:
          </p>
          <pre className="mt-ui-s p-ui-n rounded-ui-s bg-ui-surface-sunken border border-ui-border font-ui-mono text-ui-s overflow-x-auto whitespace-pre">{`# your-device.yaml
substitutions:
  wframe_display_id: my_epaper   # ← the id: of YOUR display

packages:
  wframe: !include wframe.yaml`}</pre>
          <p className="mt-ui-s">
            Substitutions you set in <strong>your</strong> config override the
            defaults in the package — that&apos;s where you wire it to your
            hardware. Keep <span className="font-ui-mono">wframe.yaml</span>{" "}
            private: it contains your secret URL.
          </p>
        </div>
      </div>
    </div>
  );
}
