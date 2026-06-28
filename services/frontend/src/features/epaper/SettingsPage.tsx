import { DisplayGeometryForm } from "@/features/epaper/DisplayGeometryForm";
import { EpaperPanel } from "@/features/epaper/EpaperPanel";
import { RefreshControl } from "@/features/epaper/RefreshControl";
import { useSession } from "@/lib/session";

/** Device settings: the epaper URL/package, refresh control, and geometry. */
export function SettingsPage() {
  const { token, epaper, setEpaper } = useSession();

  if (!epaper) return <p className="text-fg-2 text-s">Loading…</p>;

  return (
    <section className="flex flex-col gap-m">
      <div>
        <h2>Settings</h2>
        <p className="text-fg-2 text-s mt-xs">
          Your epaper device URL, refresh control, and display geometry.
        </p>
      </div>
      <EpaperPanel epaper={epaper} />
      <RefreshControl epaper={epaper} token={token} onSaved={setEpaper} />
      <DisplayGeometryForm epaper={epaper} token={token} onSaved={setEpaper} />
    </section>
  );
}
