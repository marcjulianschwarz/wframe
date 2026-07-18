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
  ToastViewport,
  type ToastData,
  type ToastStatus,
} from "@/components/Toast";
import { api, type Epaper, type User } from "@/lib/api";
import { auth } from "@/lib/auth";

interface SessionValue {
  token: string;
  user: User | null;
  /** Every epaper device the user owns (always at least one). */
  epapers: Epaper[];
  /** Replace the whole list (e.g. after create/delete). */
  setEpapers: (e: Epaper[]) => void;
  /** Insert-or-replace a single epaper in the list by id. */
  upsertEpaper: (e: Epaper) => void;
  refreshEpapers: () => Promise<void>;
  notify: (status: ToastStatus, message: string) => void;
  logout: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

/** App-wide session: holds the auth token, the current user, and their epapers.
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
  const [epapers, setEpapers] = useState<Epaper[]>([]);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const nextToastId = useRef(0);

  const notify = useCallback((status: ToastStatus, message: string) => {
    setToasts((list) => [...list, { id: nextToastId.current++, message, status }]);
  }, []);
  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const upsertEpaper = useCallback((e: Epaper) => {
    setEpapers((list) =>
      list.some((x) => x.id === e.id)
        ? list.map((x) => (x.id === e.id ? e : x))
        : [...list, e],
    );
  }, []);

  const refreshEpapers = useCallback(async () => {
    setEpapers(await api.listEpapers(token));
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [me, eps] = await Promise.all([api.me(token), api.listEpapers(token)]);
        if (cancelled) return;
        setUser(me);
        setEpapers(eps);
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
    epapers,
    setEpapers,
    upsertEpaper,
    refreshEpapers,
    notify,
    logout: () => {
      auth.clear();
      onLogout();
    },
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
