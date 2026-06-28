import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Toast,
  ToastViewport,
  type ToastData,
  type ToastStatus,
} from "@/components/Toast";
import { api, type Epaper, type User } from "@/lib/api";
import { auth } from "@/lib/auth";

interface SessionValue {
  token: string;
  user: User | null;
  epaper: Epaper | null;
  setEpaper: (e: Epaper) => void;
  refreshEpaper: () => Promise<void>;
  notify: (status: ToastStatus, message: string) => void;
  logout: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

/** App-wide session: holds the auth token, the current user, and their epaper.
 * Provided once at the router root so every page can read them. */
export function SessionProvider({
  token,
  onLogout,
  children,
}: {
  token: string;
  onLogout: () => void;
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [epaper, setEpaper] = useState<Epaper | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const nextToastId = useRef(0);

  const notify = useCallback((status: ToastStatus, message: string) => {
    setToasts((list) => [...list, { id: nextToastId.current++, message, status }]);
  }, []);
  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const refreshEpaper = useCallback(async () => {
    setEpaper(await api.getEpaper(token));
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [me, ep] = await Promise.all([api.me(token), api.getEpaper(token)]);
        if (cancelled) return;
        setUser(me);
        setEpaper(ep);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/invalid or expired|user no longer|missing bearer/i.test(msg)) {
          onLogout();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, onLogout]);

  const value: SessionValue = {
    token,
    user,
    epaper,
    setEpaper,
    refreshEpaper,
    notify,
    logout: () => {
      auth.clear();
      onLogout();
    },
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
      <ToastViewport>
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </ToastViewport>
    </SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
