import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/components/Modal";
import { api, type Dashboard, type StoreItem } from "@/lib/api";
import { useSession } from "@/lib/session";
import { StoreThumb } from "./StoreThumb";

/** Browse the built-in catalog and add a dashboard to the collection in one tap.
 * Config-heavy types (GitHub, transit, Home Assistant, image) are added here and
 * configured afterwards from their dashboard settings. */
export function StoreModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (d: Dashboard) => void;
}) {
  const { token, notify } = useSession();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [addingType, setAddingType] = useState<string | null>(null);

  useEffect(() => {
    api
      .listStore(token)
      .then(setItems)
      .catch((e) => notify("error", e instanceof Error ? e.message : String(e)));
  }, [token, notify]);

  async function add(item: StoreItem) {
    setAddingType(item.type);
    try {
      const d = await api.addStoreDashboard(token, item.type);
      onAdded(d);
      notify("success", `Added "${item.title}"`);
    } catch (e) {
      notify("error", e instanceof Error ? e.message : String(e));
    } finally {
      setAddingType(null);
    }
  }

  return (
    <Modal title="Store" onClose={onClose}>
      <p className="text-sm text-soft mb-4">
        Tap to add a built-in dashboard to your desk.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <button
            key={item.type}
            className="sketch flex flex-col gap-2 p-2 text-left cursor-pointer disabled:opacity-50"
            disabled={addingType !== null}
            onClick={() => void add(item)}
          >
            <StoreThumb type={item.type} className="w-full" />
            <div className="flex items-center gap-1">
              <span className="font-hand font-bold text-sm flex-1 truncate">
                {item.title}
              </span>
              <Plus size={15} />
            </div>
            <span className="text-xs text-soft line-clamp-2">{item.description}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
