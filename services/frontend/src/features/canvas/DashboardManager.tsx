import { useNavigate } from "react-router-dom";
import { type Dashboard } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useT } from "@/lib/i18n";
import { useEpaperActions, type DashboardsStore } from "@/lib/queries";
import { DashboardCard } from "./DashboardCard";

/** The view library: a grid of cards. Clicking a card opens its full editor page
 * (/views/:id); each card can also stop (clear it from every device showing it).
 * Assignment to a device happens on device pages, not here. */
export function DashboardManager({ dash }: { dash: DashboardsStore }) {
  const { notify } = useSession();
  const t = useT();
  const navigate = useNavigate();
  const { setDashboard } = useEpaperActions();

  // Clear a view from every device showing it.
  async function stop(dashboard: Dashboard) {
    try {
      for (const e of dash.liveOn(dashboard)) {
        await setDashboard.mutateAsync({ id: e.id, dashboardId: null });
      }
      notify("success", t("views.stoppedName", { name: dashboard.name }));
    } catch (e) {
      notify("error", e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="flex flex-wrap gap-4">
      {dash.dashboards.map((d) => (
        <DashboardCard
          key={d.id}
          dashboard={d}
          liveOn={dash.liveOn(d)}
          onEdit={() => navigate(`/views/${d.id}`)}
          onStop={() => void stop(d)}
        />
      ))}
      {dash.dashboards.length === 0 && (
        <p className="text-soft text-sm text-lg">{t("views.noneYet")}</p>
      )}
    </div>
  );
}
