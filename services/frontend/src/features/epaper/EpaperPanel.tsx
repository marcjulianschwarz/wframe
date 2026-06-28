import { useState } from "react";
import { Button } from "@/components/Button";
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
    <div className="bg-bg-1-light border border-border-1 rounded-n p-m flex flex-col gap-s shadow-normal">
      <div className="text-s text-fg-2 uppercase tracking-wider font-semibold">
        Device URL
      </div>
      <div className="flex gap-s items-center">
        <code className="flex-1 font-mono text-s px-n py-s rounded-s bg-bg-2 border border-border-1 break-all">
          {epaper.bitmap_url}
        </code>
        <Button onClick={copy}>{copied ? "Copied" : "Copy"}</Button>
      </div>
      <div className="text-s text-fg-2">
        Paste into your ESPHome <span className="font-mono">epaper.yaml</span>{" "}
        as <span className="font-mono">streaming_bmp.url</span>, or download the
        ready-made package below.
      </div>

      <div className="flex flex-col gap-s pt-s border-t border-border-1">
        <Button
          variant="primary"
          className="self-start"
          onClick={() => downloadWframePackage(epaper)}
        >
          Download wframe.yaml
        </Button>
        <div className="text-s text-fg-2">
          <p>
            This is a self-contained ESPHome <em>package</em>: it pulls in the{" "}
            <span className="font-mono">streaming_bmp</span> component and your
            bitmap stream, with your URL already filled in. You keep your own
            board, wifi, and display config — just include this file and point
            it at your display:
          </p>
          <pre className="mt-s p-n rounded-s bg-bg-2 border border-border-1 font-mono text-s overflow-x-auto whitespace-pre">{`# your-device.yaml
substitutions:
  wframe_display_id: my_epaper   # ← the id: of YOUR display

packages:
  wframe: !include wframe.yaml`}</pre>
          <p className="mt-s">
            Substitutions you set in <strong>your</strong> config override the
            defaults in the package — that&apos;s where you wire it to your
            hardware. Keep <span className="font-mono">wframe.yaml</span>{" "}
            private: it contains your secret URL.
          </p>
        </div>
      </div>
    </div>
  );
}
