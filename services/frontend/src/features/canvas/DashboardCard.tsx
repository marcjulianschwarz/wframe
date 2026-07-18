import { Plus, X } from "lucide-react";
import { type Dashboard, type Epaper } from "@/lib/api";

/** A dashboard, shown as a little draggable card on the desk. The plus button
 * arms "placement" mode (highlights every epaper to tap); the card is also
 * draggable straight onto an epaper. When it's live somewhere, a stop button
 * appears. Clicking the body edits it. */
export function DashboardCard({
  dashboard,
  liveOn,
  arming,
  onArm,
  onEdit,
  onStop,
}: {
  dashboard: Dashboard;
  /** Epapers currently showing this dashboard. */
  liveOn: Epaper[];
  /** True while this card is the one being placed. */
  arming: boolean;
  /** Toggle placement mode for this dashboard. */
  onArm: () => void;
  onEdit: () => void;
  /** Clear this dashboard from every device showing it. */
  onStop: () => void;
}) {
  const live = liveOn.length > 0;
  return (
    <div
      className={`sketch relative flex flex-col gap-1 p-3 w-48 min-w-[11rem] max-w-[16rem] cursor-grab active:cursor-grabbing transition-transform ${
        arming ? "-translate-y-1" : ""
      }`}
      style={arming ? { boxShadow: "3px 3px 0 var(--accent)" } : undefined}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/dashboard-id", dashboard.id);
        e.dataTransfer.effectAllowed = "copy";
      }}
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(e) => {
        if (e.key === "Enter") onEdit();
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-hand font-bold break-words" title={dashboard.name}>
          {dashboard.name}
        </span>
        <button
          className="icon-btn shrink-0"
          style={{ width: 28, height: 28 }}
          title={arming ? "Cancel" : "Show on an epaper"}
          onClick={(e) => {
            e.stopPropagation();
            onArm();
          }}
        >
          <Plus size={15} className={arming ? "rotate-45 transition-transform" : "transition-transform"} />
        </button>
      </div>

      <span className="text-xs text-soft break-words">
        {dashboard.description || dashboard.custom_url || dashboard.type || "custom"}
      </span>

      {live && (
        <div className="flex items-start gap-1.5 mt-1">
          <span className="live-dot shrink-0 mt-0.5" style={{ width: 9, height: 9 }} />
          <span className="text-xs font-bold text-soft break-words flex-1">
            {liveOn.length === 1 ? liveOn[0].name : `${liveOn.length} devices`}
          </span>
          <button
            className="chip"
            style={{ padding: "1px 8px", fontSize: 11 }}
            title="Stop everywhere"
            onClick={(e) => {
              e.stopPropagation();
              onStop();
            }}
          >
            <X size={12} className="inline -mt-0.5" /> Stop
          </button>
        </div>
      )}
    </div>
  );
}
