import { useState } from "react";
import { authApi } from "@/lib/api";
import { auth } from "@/lib/auth";

type Mode = "login" | "register";

export function Login({ onLogin }: { onLogin: () => void }) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setBusy(true);
    setError(null);
    try {
      const fn = mode === "login" ? authApi.login : authApi.register;
      const { access_token } = await fn(email.trim(), password);
      auth.set(access_token);
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const isRegister = mode === "register";

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6">
      <form onSubmit={submit} className="sketch w-full max-w-sm p-6 flex flex-col gap-4">
        <span className="font-hand text-2xl font-bold">wframe</span>
        <h2 className="text-xl m-0">
          {isRegister ? "Create your account" : "Sign in"}
        </h2>

        {error && (
          <div
            className="text-sm rounded-xl px-3 py-2"
            style={{ color: "var(--danger)", background: "#f7dcd9" }}
          >
            {error}
          </div>
        )}

        <input
          className="field"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        <input
          className="field"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          required
        />
        {isRegister && <p className="text-soft text-sm m-0">At least 8 characters.</p>}

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            className="text-sm text-soft underline"
            onClick={() => {
              setMode(isRegister ? "login" : "register");
              setError(null);
            }}
          >
            {isRegister ? "Have an account? Sign in" : "Create an account"}
          </button>
          <button className="btn btn-accent" type="submit" disabled={busy}>
            {busy ? "…" : isRegister ? "Register" : "Sign in"}
          </button>
        </div>
      </form>
    </div>
  );
}
