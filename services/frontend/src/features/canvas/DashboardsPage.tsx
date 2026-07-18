import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Store } from "lucide-react";
import { Modal } from "@/components/Modal";
import { StoreModal } from "@/features/store/StoreModal";
import { CreateCustomForm } from "@/features/dashboard/CreateCustomForm";
import { useSession } from "@/lib/session";
import { useDashboards } from "@/lib/queries";
import { DashboardManager } from "./DashboardManager";

/** The dashboard library as its own page (/dashboards): browse the store, create
 * a custom dashboard, and edit/delete/configure the ones you own. Assignment to a
 * device still happens on each device's page — this is where the dashboards
 * themselves live. */
export function DashboardsPage() {
  const { notify } = useSession();
  const dash = useDashboards();
  const [creating, setCreating] = useState(false);
  const [browsing, setBrowsing] = useState(false);

  return (
    <div className="min-h-screen px-6 py-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link to="/" className="icon-btn" aria-label="Back to devices">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-bold m-0">Dashboards</h1>
        <div className="ml-auto flex items-center gap-2">
          <button className="btn" onClick={() => setBrowsing(true)}>
            <Store size={16} />
            Store
          </button>
          <button className="btn" onClick={() => setCreating(true)} title="Create a custom dashboard">
            <Plus size={16} />
            Custom
          </button>
        </div>
      </div>

      <DashboardManager dash={dash} />

      {/* --- Modals --- */}
      {browsing && <StoreModal onClose={() => setBrowsing(false)} onAdded={dash.add} />}

      {creating && (
        <Modal title="Create a dashboard" onClose={() => setCreating(false)}>
          <CreateCustomForm
            onCreated={(d) => {
              setCreating(false);
              dash.add(d);
              notify("success", `Created "${d.name}"`);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
