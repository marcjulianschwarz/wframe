import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/ui/concepts/button/component";
import { Modal } from "@/ui/concepts/modal/component";
import { type Dashboard, type Epaper } from "@/lib/api";

/** Pick which epaper(s) show a dashboard. Each row toggles deploy/clear for one
 * device; a device already showing this dashboard is marked and clears on tap. */
export function DeployTargetModal({
  dashboard,
  epapers,
  onClose,
  onToggle,
}: {
  dashboard: Dashboard;
  epapers: Epaper[];
  onClose: () => void;
  onToggle: (epaper: Epaper, clear: boolean) => Promise<void>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggle(epaper: Epaper) {
    const live = epaper.dashboard_id === dashboard.id;
    setBusyId(epaper.id);
    try {
      await onToggle(epaper, live);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Modal
      title={`Show "${dashboard.name}" on…`}
      onClose={onClose}
      actions={
        <Button variant="ghost" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="flex flex-col gap-s">
        {epapers.map((e) => {
          const live = e.dashboard_id === dashboard.id;
          const busy = busyId === e.id;
          return (
            <button
              key={e.id}
              type="button"
              disabled={busy}
              onClick={() => void toggle(e)}
              className={`flex items-center justify-between gap-m p-m rounded-n border text-left transition-all duration-fast disabled:opacity-50 ${
                live
                  ? "bg-highlight-soft border-highlight"
                  : "bg-bg-1-light border-border-1 hover:border-border-2"
              }`}
            >
              <div className="min-w-0">
                <div className="font-semibold text-fg-1 truncate">{e.name}</div>
                <div className="text-s text-fg-2 truncate">
                  {live
                    ? "Showing this — tap to stop"
                    : e.dashboard
                      ? `Currently: ${e.dashboard.name}`
                      : "Nothing deployed"}
                </div>
              </div>
              {live && (
                <span className="flex h-7 w-7 items-center justify-center rounded-s bg-highlight text-white shrink-0">
                  <Check size={16} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
