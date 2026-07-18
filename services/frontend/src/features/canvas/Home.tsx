import { Link } from "react-router-dom";
import { LayoutGrid, LogOut, Plus, Settings } from "lucide-react";
import { type Epaper } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useT } from "@/lib/i18n";
import { useEpaperActions, useEpapers, useUser } from "@/lib/queries";
import { DeviceCard } from "./DeviceCard";

/** Fleet home: every device drawn at true size as a live preview with quick
 * actions. Clicking a device opens its own page (settings + what it displays);
 * the dashboard library lives on its own /dashboards page. */
export function Home() {
  const { logout, notify } = useSession();
  const t = useT();
  const user = useUser();
  const epapers = useEpapers();
  const { create } = useEpaperActions();

  async function addEpaper() {
    try {
      await create.mutateAsync(t("home.newEpaper"));
      notify("success", t("home.addedEpaper"));
    } catch (e) {
      notify("error", e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="min-h-screen px-6 py-6">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <span className="text-2xl font-bold">wframe</span>
        <div className="flex items-center gap-2">
          <button className="btn" disabled={create.isPending} onClick={() => void addEpaper()} title={t("nav.addEpaper")}>
            <Plus size={16} />
            {t("nav.device")}
          </button>
          <Link className="btn" to="/dashboards" title={t("nav.manageViews")}>
            <LayoutGrid size={16} />
            {t("nav.views")}
          </Link>
          <Link className="icon-btn" to="/settings" title={t("nav.settings")} aria-label={t("nav.settings")}>
            <Settings size={16} />
          </Link>
          <button
            className="icon-btn"
            title={user?.email ? t("nav.signOutAs", { email: user.email }) : t("nav.signOut")}
            onClick={logout}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* The fleet */}
      <div className="flex flex-wrap items-end justify-center gap-10">
        {epapers.map((e: Epaper) => (
          <DeviceCard key={e.id} epaper={e} />
        ))}
        {epapers.length === 0 && (
          <p className="text-soft text-sm text-lg">{t("home.noDevices")}</p>
        )}
      </div>
    </div>
  );
}
