import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, type DashboardType, type StoreItem } from "@/lib/api";
import { useSession } from "@/lib/session";
import { StoreThumb } from "@/features/store/StoreThumb";

/** Frontend-only catalog structure: groups the flat store list into named
 * sections and picks a hero. The backend serves an unsorted list, so the
 * curation lives here. */
const CATEGORIES: { id: string; title: string; types: DashboardType[] }[] = [
  { id: "news", title: "News & Reading", types: ["hn_zeitung", "github"] },
  { id: "personal", title: "Personal", types: ["dashboard", "life", "weather"] },
  {
    id: "smart-home",
    title: "Smart Home",
    types: ["homeassistant", "homeassistant_temp"],
  },
  { id: "custom", title: "Make your own", types: ["image", "custom_url"] },
];

const FEATURED_TYPE: DashboardType = "dashboard";

/** The store: a featured dashboard up top, then browsable category rows. */
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

  const byType = useMemo(
    () => new Map(items.map((it) => [it.type, it])),
    [items],
  );
  const featured = byType.get(FEATURED_TYPE) ?? items[0] ?? null;

  // Build the visible sections, dropping anything the backend didn't return,
  // and gather leftovers the curation list didn't mention into a catch-all.
  const sections = useMemo(() => {
    const claimed = new Set<DashboardType>();
    const built = CATEGORIES.map((cat) => {
      const sectionItems = cat.types
        .map((t) => byType.get(t))
        .filter((it): it is StoreItem => Boolean(it));
      sectionItems.forEach((it) => claimed.add(it.type));
      return { ...cat, items: sectionItems };
    }).filter((s) => s.items.length > 0);

    const rest = items.filter((it) => !claimed.has(it.type));
    if (rest.length > 0) {
      built.push({ id: "more", title: "More", types: [], items: rest });
    }
    return built;
  }, [byType, items]);

  return (
    <section className="flex flex-col gap-l">
      <div>
        <h2>Store</h2>
        <p className="text-ui-secondary text-s mt-xs">
          Browse built-in dashboards. Open one to preview it, then add it to your
          collection.
        </p>
      </div>

      {error && (
        <div className="p-m rounded-n border border-ui-danger-border bg-ui-danger-bg text-ui-danger text-s">
          {error}
        </div>
      )}

      {featured && <FeaturedCard item={featured} />}

      {sections.map((section) => (
        <div key={section.id} className="flex flex-col gap-s">
          <h3 className="text-m font-semibold text-ui-primary">{section.title}</h3>
          <div className="flex gap-m overflow-x-auto pb-s -mx-xs px-xs snap-x">
            {section.items.map((item) => (
              <StoreTile key={item.type} item={item} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

/** The hero: a large live preview beside a headline and a clear call to action. */
function FeaturedCard({ item }: { item: StoreItem }) {
  return (
    <Link
      to={`/store/${item.type}`}
      className="group flex flex-col sm:flex-row gap-l rounded-n border-2 border-transparent bg-ui-surface-raised p-l cursor-pointer transition-colors duration-fast hover:border-ui-accent"
    >
      <div className="shrink-0 self-center sm:self-start">
        <StoreThumb type={item.type} className="w-40" />
      </div>
      <div className="flex flex-col gap-s">
        <span className="text-xs font-semibold uppercase tracking-wide text-ui-accent">
          Featured
        </span>
        <h3 className="text-l text-ui-primary">{item.title}</h3>
        <p className="text-m text-ui-secondary flex-1">{item.description}</p>
        <span className="mt-s text-m font-semibold text-ui-accent group-hover:underline">
          Preview & add →
        </span>
      </div>
    </Link>
  );
}

/** A browsable tile in a category row: portrait preview + title. */
function StoreTile({ item }: { item: StoreItem }) {
  return (
    <Link
      to={`/store/${item.type}`}
      className="group flex w-44 shrink-0 snap-start flex-col gap-s rounded-n border-2 border-transparent bg-ui-surface-raised py-s px-m cursor-pointer transition-colors duration-fast hover:border-ui-accent"
    >
      <StoreThumb type={item.type} className="w-full" />
      <div>
        <div className="text-m font-semibold text-ui-primary leading-tight group-hover:text-ui-accent">
          {item.title}
        </div>
        <div className="text-s text-ui-secondary line-clamp-2">
          {item.description}
        </div>
      </div>
    </Link>
  );
}
