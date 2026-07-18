import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Store } from "lucide-react";
import { Modal } from "@/components/Modal";
import { CreateCustomForm } from "@/features/dashboard/CreateCustomForm";
import { useSession } from "@/lib/session";
import { useT } from "@/lib/i18n";
import { useDashboards } from "@/lib/queries";
import { DashboardManager } from "./DashboardManager";

/** The dashboard library as its own page (/dashboards): browse the store, create
 * a custom dashboard, and edit/delete/configure the ones you own. Assignment to a
 * device still happens on each device's page — this is where the dashboards
 * themselves live. */
export function DashboardsPage() {
  const { notify } = useSession();
  const t = useT();
  const navigate = useNavigate();
  const dash = useDashboards();
  const [creating, setCreating] = useState(false);

  return (
    <div className="min-h-screen px-6 py-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link to="/" className="icon-btn" aria-label={t("views.backToDevices")}>
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-bold m-0">{t("views.title")}</h1>
        <div className="ml-auto flex items-center gap-2">
          <Link className="btn" to="/store">
            <Store size={16} />
            {t("views.store")}
          </Link>
          <button className="btn" onClick={() => setCreating(true)} title={t("views.createCustom")}>
            <Plus size={16} />
            {t("views.custom")}
          </button>
        </div>
      </div>

      <DashboardManager dash={dash} />

      {/* --- Modals --- */}
      {creating && (
        <Modal title={t("views.createTitle")} onClose={() => setCreating(false)}>
          <CreateCustomForm
            onCreated={(d) => {
              setCreating(false);
              dash.add(d);
              notify("success", t("views.createdName", { name: d.name }));
              navigate(`/views/${d.id}`);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
