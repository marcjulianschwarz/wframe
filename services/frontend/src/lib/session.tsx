import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ToastViewport,
  type ToastData,
  type ToastStatus,
} from "@/components/Toast";
import { auth } from "@/lib/auth";

interface SessionValue {
  token: string;
  notify: (status: ToastStatus, message: string) => void;
  logout: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

/** App-wide session: the auth token, toast notifications, and logout. User and
 * device data live in TanStack Query (see lib/queries.ts), so they cache across
 * navigation instead of being re-fetched into context each time. */
export function SessionProvider({
  token,
  onLogout,
  children,
}: {
  token: string;
  onLogout: () => void;
  children: ReactNode;
}) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const nextToastId = useRef(0);

  const notify = useCallback((status: ToastStatus, message: string) => {
    setToasts((list) => [...list, { id: nextToastId.current++, message, status }]);
  }, []);
  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const value: SessionValue = {
    token,
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
