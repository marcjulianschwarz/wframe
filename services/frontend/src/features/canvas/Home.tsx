import { Link } from "react-router-dom";
import { LayoutGrid, LogOut, Plus } from "lucide-react";
import { type Epaper } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useEpaperActions, useEpapers, useUser } from "@/lib/queries";
import { DeviceCard } from "./DeviceCard";

/** Fleet home: every device drawn at true size as a live preview with quick
 * actions. Clicking a device opens its own page (settings + what it displays);
 * the dashboard library lives on its own /dashboards page. */
export function Home() {
  const { logout, notify } = useSession();
  const user = useUser();
  const epapers = useEpapers();
  const { create } = useEpaperActions();

  async function addEpaper() {
    try {
      await create.mutateAsync("New epaper");
      notify("success", "Added an epaper");
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
          <button className="btn" disabled={create.isPending} onClick={() => void addEpaper()} title="Add an epaper">
            <Plus size={16} />
            Device
          </button>
          <Link className="btn" to="/dashboards" title="Manage your dashboards">
            <LayoutGrid size={16} />
            Dashboards
          </Link>
          <button
            className="icon-btn"
            title={user?.email ? `Sign out (${user.email})` : "Sign out"}
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
          <p className="text-soft text-sm text-lg">No devices yet — add one to get started.</p>
        )}
      </div>
    </div>
  );
}
