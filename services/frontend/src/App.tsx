import { useCallback, useState } from "react";
import {
  BrowserRouter,
  NavLink,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { Button } from "@/components/Button";
import { Login } from "@/features/auth/Login";
import { CollectionPage } from "@/features/dashboard/CollectionPage";
import { SettingsPage } from "@/features/epaper/SettingsPage";
import { StoreDetail } from "@/features/store/StoreDetail";
import { StorePage } from "@/features/store/StorePage";
import { auth } from "@/lib/auth";
import { SessionProvider, useSession } from "@/lib/session";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `px-n py-s rounded-s text-m font-semibold transition-colors duration-fast ${
    isActive ? "text-fg-1 bg-bg-hover" : "text-fg-2 hover:text-fg-1"
  }`;

function Shell() {
  const { user, logout } = useSession();
  return (
    <div className="min-h-screen w-full">
      <div className="w-[90%] sm:w-[80%] max-w-[1100px] mx-auto my-l flex flex-col gap-l">
        <header className="flex items-center justify-between gap-m flex-wrap">
          <div className="flex items-center gap-l">
            <h1>wframe</h1>
            <nav className="flex items-center gap-xs">
              <NavLink to="/store" className={navClass}>
                Store
              </NavLink>
              <NavLink to="/dashboards" className={navClass}>
                Dashboards
              </NavLink>
              <NavLink to="/settings" className={navClass}>
                Epapers
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-n">
            {user && <span className="text-s text-fg-2">{user.email}</span>}
            <Button variant="ghost" onClick={logout}>
              Sign out
            </Button>
          </div>
        </header>

        <Routes>
          <Route path="/store" element={<StorePage />} />
          <Route path="/store/:type" element={<StoreDetail />} />
          <Route path="/dashboards" element={<CollectionPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboards" replace />} />
        </Routes>
      </div>
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
