import { useCallback, useState } from "react";
import { Login } from "@/features/auth/Login";
import { Canvas } from "@/features/canvas/Canvas";
import { auth } from "@/lib/auth";
import { SessionProvider } from "@/lib/session";

export default function App() {
  const [token, setToken] = useState<string | null>(auth.get());
  const onLogout = useCallback(() => setToken(null), []);

  if (!token) return <Login onLogin={() => setToken(auth.get())} />;

  return (
    <SessionProvider token={token} onLogout={onLogout}>
      <Canvas />
    </SessionProvider>
  );
}
