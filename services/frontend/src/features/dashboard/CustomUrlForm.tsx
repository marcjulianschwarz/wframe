import { useState } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";

interface Props {
  initialUrl: string | null;
  saving?: boolean;
  onSave: (url: string) => void;
}

export function CustomUrlForm({ initialUrl, saving, onSave }: Props) {
  const [url, setUrl] = useState(initialUrl ?? "");

  const trimmed = url.trim();
  const valid = /^https?:\/\/.+/i.test(trimmed);

  return (
    <div className="bg-bg-1-light border border-border-1 rounded-n p-m flex flex-col gap-s">
      <div className="text-s text-fg-2 uppercase tracking-wider font-semibold">
        Custom page URL
      </div>
      <div className="flex gap-s items-start">
        <Input
          type="url"
          placeholder="https://example.com/my-page"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={saving}
        />
        <Button
          onClick={() => valid && onSave(trimmed)}
          disabled={!valid || saving}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
      {url.length > 0 && !valid && (
        <div className="text-s text-fg-danger">
          Enter a full URL starting with http:// or https://
        </div>
      )}
      <div className="text-s text-fg-2">
        We render this page to a 1-bit bitmap and serve it at your epaper URL.
      </div>
    </div>
  );
}
