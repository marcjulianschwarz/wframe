import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Search } from "lucide-react";
import { api, type StoreItem } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { useDashboards } from "@/lib/queries";
import { StoreThumb } from "./StoreThumb";

/** The store as its own page (/store): browse the built-in catalog, filter it
 * with a search bar, and add a view to the collection in one tap. Added views
 * land in the library (/dashboards); assignment to a device happens there and on
 * each device's page. Replaces the old modal. */
export function StorePage() {
  const { token, notify } = useSession();
  const { t, storeTitle, storeDescription } = useI18n();
  const dash = useDashboards();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [query, setQuery] = useState("");
  const [addingType, setAddingType] = useState<string | null>(null);

  useEffect(() => {
    api
      .listStore(token)
      .then(setItems)
      .catch((e) => notify("error", e instanceof Error ? e.message : String(e)));
  }, [token, notify]);

  // Filter on the *localized* title/description so search matches what's shown.
  const trimmed = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!trimmed) return items;
    return items.filter((item) => {
      const title = storeTitle(item.type, item.title).toLowerCase();
      const desc = storeDescription(item.type, item.description).toLowerCase();
      return title.includes(trimmed) || desc.includes(trimmed);
    });
  }, [items, trimmed, storeTitle, storeDescription]);

  async function add(item: StoreItem) {
    setAddingType(item.type);
    try {
      const d = await api.addStoreDashboard(token, item.type);
      dash.add(d);
      notify("success", t("store.addedName", { name: storeTitle(item.type, item.title) }));
    } catch (e) {
      notify("error", e instanceof Error ? e.message : String(e));
    } finally {
      setAddingType(null);
    }
  }

  return (
    <div className="min-h-screen px-6 py-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/dashboards" className="icon-btn" aria-label={t("store.backToDevices")}>
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-bold m-0">{t("store.title")}</h1>
      </div>

      {/* Search */}
      <div className="field flex items-center gap-2 mb-6" style={{ maxWidth: 420 }}>
        <Search size={16} className="text-soft shrink-0" />
        <input
          className="flex-1 bg-transparent border-0 outline-none"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("store.searchPlaceholder")}
          aria-label={t("store.searchLabel")}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
      </div>

      {filtered.length === 0 && trimmed ? (
        <p className="text-soft text-sm">{t("store.noResults", { query: query.trim() })}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map((item) => (
            <button
              key={item.type}
              className="sketch flex flex-col gap-2 p-2 text-left cursor-pointer disabled:opacity-50"
              disabled={addingType !== null}
              onClick={() => void add(item)}
            >
              <StoreThumb type={item.type} className="w-full" maxHeight={150} />
              <div className="flex items-center gap-1">
                <span className="font-hand font-bold text-sm flex-1 truncate">
                  {storeTitle(item.type, item.title)}
                </span>
                <Plus size={15} />
              </div>
              <span className="text-xs text-soft line-clamp-2">
                {storeDescription(item.type, item.description)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
