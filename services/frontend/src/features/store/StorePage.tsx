import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type StoreItem } from "@/lib/api";
import { useSession } from "@/lib/session";

/** The store: a grid of built-in dashboards the user can browse and add. */
export function StorePage() {
  const { token } = useSession();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listStore(token)
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [token]);

  return (
    <section className="flex flex-col gap-m">
      <div>
        <h2>Store</h2>
        <p className="text-fg-2 text-s mt-xs">
          Pick a dashboard to preview it, then add it to your collection.
        </p>
      </div>
      {error && (
        <div className="p-m rounded-n border border-border-1 bg-bg-danger text-fg-danger text-s">
          {error}
        </div>
      )}
      <div className="grid gap-m grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.type}
            to={`/store/${item.type}`}
            className="text-left p-m rounded-n border border-border-1 bg-bg-1-light hover:border-border-2 transition-all duration-fast ease-out flex flex-col gap-xs"
          >
            <div className="font-semibold text-fg-1">{item.title}</div>
            <div className="text-s text-fg-2 flex-1">{item.description}</div>
            <div className="text-s font-mono text-fg-2 mt-s">{item.type}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
