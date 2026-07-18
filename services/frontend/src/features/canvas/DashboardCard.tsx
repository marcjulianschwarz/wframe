import { X } from "lucide-react";
import { type Dashboard, type Epaper } from "@/lib/api";

/** A dashboard, shown as a little card in the library. Clicking the body edits
 * it. When it's live on one or more boards, it shows where, with a stop button
 * that clears it everywhere. Assignment happens from the epaper side (each board
 * has an "Add dashboard" picker), so the card no longer arms or drags. */
export function DashboardCard({
  dashboard,
  liveOn,
  onEdit,
  onStop,
}: {
  dashboard: Dashboard;
  /** Epapers currently showing this dashboard. */
  liveOn: Epaper[];
  onEdit: () => void;
  /** Clear this dashboard from every device showing it. */
  onStop: () => void;
}) {
  const live = liveOn.length > 0;
  return (
    <div
      className="sketch relative flex flex-col gap-1 p-3 w-48 min-w-[11rem] max-w-[16rem] cursor-pointer"
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(e) => {
        if (e.key === "Enter") onEdit();
      }}
    >
      <span className="font-hand font-bold break-words" title={dashboard.name}>
        {dashboard.name}
      </span>

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
