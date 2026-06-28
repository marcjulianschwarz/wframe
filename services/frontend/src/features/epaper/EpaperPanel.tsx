import { useState } from "react";
import { Button } from "@/components/Button";
import { type Epaper } from "@/lib/api";

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
        Your epaper URL
      </div>
      <div className="flex gap-s items-center">
        <code className="flex-1 font-mono text-s px-n py-s rounded-s bg-bg-2 border border-border-1 break-all">
          {epaper.bitmap_url}
        </code>
        <Button onClick={copy}>{copied ? "Copied" : "Copy"}</Button>
      </div>
      <div className="text-s text-fg-2">
        Paste into your ESPHome <span className="font-mono">epaper.yaml</span> as{" "}
        <span className="font-mono">streaming_bmp.url</span>.
      </div>
    </div>
  );
}
