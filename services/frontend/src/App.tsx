import { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Login } from "@/features/auth/Login";
import { Home } from "@/features/canvas/Home";
import { DevicePage } from "@/features/canvas/DevicePage";
import { DashboardsPage } from "@/features/canvas/DashboardsPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { StorePage } from "@/features/store/StorePage";
import { ViewPage } from "@/features/dashboard/ViewPage";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import { qk } from "@/lib/queries";
import { SessionProvider } from "@/lib/session";

export default function App() {
  const [token, setToken] = useState<string | null>(auth.get());
  const onLogout = useCallback(() => setToken(null), []);

  if (!token) return <Login onLogin={() => setToken(auth.get())} />;

  return (
    <SessionProvider token={token} onLogout={onLogout}>
      <AuthGuard token={token} onLogout={onLogout}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboards" element={<DashboardsPage />} />
            <Route path="/store" element={<StorePage />} />
            <Route path="/views/:id" element={<ViewPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/device/:id" element={<DevicePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthGuard>
    </SessionProvider>
  );
}

/** Signs the user out if the token turns out to be invalid or expired. Uses the
 * user query as the probe — every page needs it anyway, so it's already loading. */
function AuthGuard({
  token,
  onLogout,
  children,
}: {
  token: string;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const { error } = useQuery({ queryKey: qk.user, queryFn: () => api.me(token) });

  useEffect(() => {
    const msg = error instanceof Error ? error.message : "";
    if (/invalid or expired|user no longer|missing bearer/i.test(msg)) onLogout();
  }, [error, onLogout]);

  return <>{children}</>;
}
