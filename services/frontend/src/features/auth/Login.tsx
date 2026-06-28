import { useState } from "react";
import { Button } from "@/ui/concepts/button/component";
import { Input } from "@/components/Input";
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
    <div className="min-h-screen w-full flex items-center justify-center p-l">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-bg-1-light border border-border-1 rounded-n p-l flex flex-col gap-m shadow-normal"
      >
        <div className="flex items-center gap-s">
          <div className="w-8 h-8 rounded-s bg-highlight text-white flex items-center justify-center font-mono text-s font-bold">
            w
          </div>
          <span className="font-mono text-m font-semibold">wframe</span>
        </div>

        <h2>{isRegister ? "Create your account" : "Sign in"}</h2>

        {error && (
          <div className="p-n rounded-s border border-border-1 bg-bg-danger text-fg-danger text-s">
            {error}
          </div>
        )}

        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          required
        />
        {isRegister && (
          <p className="text-fg-2 text-s">At least 8 characters.</p>
        )}

        <div className="flex items-center justify-between">
          <button
            type="button"
            className="text-s text-fg-2 hover:text-fg-1 underline"
            onClick={() => {
              setMode(isRegister ? "login" : "register");
              setError(null);
            }}
          >
            {isRegister ? "Have an account? Sign in" : "Create an account"}
          </button>
          <Button variant="primary" type="submit" disabled={busy}>
            {busy ? "…" : isRegister ? "Register" : "Sign in"}
          </Button>
        </div>
      </form>
    </div>
  );
}
