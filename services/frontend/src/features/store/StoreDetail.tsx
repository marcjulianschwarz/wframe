import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/Button";
import { DashboardPreview } from "@/features/epaper/DashboardPreview";
import { api, type DashboardType, type StoreItem } from "@/lib/api";
import { useSession } from "@/lib/session";

/** A single store dashboard: description, live preview, and an Add button that
 * drops a copy into the user's collection. */
export function StoreDetail() {
  const { type } = useParams<{ type: string }>();
  const { token, epapers } = useSession();
  // The store preview is generic; use the first device's geometry as a sample.
  const epaper = epapers[0] ?? null;
  const navigate = useNavigate();
  const [item, setItem] = useState<StoreItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!type) return;
    setItem(null);
    api
      .getStoreItem(token, type as DashboardType)
      .then(setItem)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [token, type]);

  async function add() {
    if (!item) return;
    setAdding(true);
    setError(null);
    try {
      const created = await api.addStoreDashboard(token, item.type);
      // Land on the collection, scrolled to the freshly added dashboard.
      navigate(`/dashboards?added=${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setAdding(false);
    }
  }

  if (error) {
    return (
      <div className="p-m rounded-n border border-border-1 bg-bg-danger text-fg-danger text-s">
        {error}
      </div>
    );
  }
  if (!item) return <p className="text-fg-2 text-s">Loading…</p>;

  return (
    <section className="flex flex-col gap-m">
      <Link to="/store" className="text-s text-fg-2 hover:text-fg-1 w-fit">
        ← Back to store
      </Link>
      <div className="flex gap-l items-start flex-col lg:flex-row">
        <div className="flex flex-col gap-m flex-1 w-full">
          <div>
            <h2>{item.title}</h2>
            <p className="text-fg-2 text-s mt-xs">{item.description}</p>
          </div>
          <Button variant="primary" className="self-start" onClick={add} disabled={adding}>
            {adding ? "Adding…" : "Add to my dashboards"}
          </Button>
          <p className="text-s text-fg-2">
            Adds a copy you can rename and deploy to your epaper. The original
            stays in the store.
          </p>
        </div>
        <div className="flex flex-col gap-s w-full lg:w-auto lg:shrink-0">
          <h2>Preview</h2>
          <DashboardPreview previewUrl={api.previewUrl(item.type)} epaper={epaper} />
        </div>
      </div>
    </section>
  );
}
