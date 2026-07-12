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
      <div className="flex flex-col gap-ui-s">
        {epapers.map((e) => {
          const live = e.dashboard_id === dashboard.id;
          const busy = busyId === e.id;
          return (
            <button
              key={e.id}
              type="button"
              disabled={busy}
              onClick={() => void toggle(e)}
              className={`flex items-center justify-between gap-ui-m p-ui-m rounded-ui-n border text-left transition-all duration-ui-fast disabled:opacity-50 ${
                live
                  ? "bg-ui-accent-soft border-ui-accent"
                  : "bg-ui-surface-raised border-ui-border hover:border-ui-border-strong"
              }`}
            >
              <div className="min-w-0">
                <div className="font-ui-semibold text-ui-primary truncate">{e.name}</div>
                <div className="text-ui-s text-ui-secondary truncate">
                  {live
                    ? "Showing this — tap to stop"
                    : e.dashboard
                      ? `Currently: ${e.dashboard.name}`
                      : "Nothing deployed"}
                </div>
              </div>
              {live && (
                <span className="flex h-7 w-7 items-center justify-center rounded-ui-s bg-ui-accent text-white shrink-0">
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
