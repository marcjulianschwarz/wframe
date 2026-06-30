import { useCallback, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { LogOut, Monitor, Store, Tv } from "lucide-react";
import { Sidebar, SidebarItem } from "@/ui/concepts/sidebar/component";
import { Login } from "@/features/auth/Login";
import { CollectionPage } from "@/features/dashboard/CollectionPage";
import { SettingsPage } from "@/features/epaper/SettingsPage";
import { StoreDetail } from "@/features/store/StoreDetail";
import { StorePage } from "@/features/store/StorePage";
import { auth } from "@/lib/auth";
import { SessionProvider, useSession } from "@/lib/session";

const NAV_ITEMS = [
  { to: "/store", label: "Store", icon: Store },
  { to: "/dashboards", label: "Dashboards", icon: Monitor },
  { to: "/settings", label: "Epapers", icon: Tv },
] as const;

function Shell() {
  const { user, logout } = useSession();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen text-ui-primary">
      <Sidebar
        title="wframe"
        footer={
          <>
            {user && (
              <p
                className="mb-s truncate text-s text-ui-secondary"
                title={user.email}
              >
                {user.email}
              </p>
            )}
            <SidebarItem icon={<LogOut size={16} />} onClick={logout}>
              Sign out
            </SidebarItem>
          </>
        }
      >
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <SidebarItem
            key={to}
            icon={<Icon size={16} />}
            active={pathname.startsWith(to)}
            onClick={() => navigate(to)}
          >
            {label}
          </SidebarItem>
        ))}
      </Sidebar>

      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto w-[90%] max-w-[1100px] my-l">
          <Routes>
            <Route path="/store" element={<StorePage />} />
            <Route path="/store/:type" element={<StoreDetail />} />
            <Route path="/dashboards" element={<CollectionPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/dashboards" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState<string | null>(auth.get());
  const onLogout = useCallback(() => setToken(null), []);

  if (!token) return <Login onLogin={() => setToken(auth.get())} />;

  return (
    <BrowserRouter>
      <SessionProvider token={token} onLogout={onLogout}>
        <Shell />
      </SessionProvider>
    </BrowserRouter>
  );
}
