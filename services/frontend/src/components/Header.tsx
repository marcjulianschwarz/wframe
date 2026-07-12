import { type User } from "@/lib/api";

interface Props {
  user: User | null;
  onLogout: () => void;
}

export function Header({ user, onLogout }: Props) {
  const initial = user?.email?.[0]?.toUpperCase() ?? "?";
  return (
    <header className="w-full flex items-center justify-between px-ui-l py-ui-m">
      <div className="flex items-center gap-ui-s">
        <div className="w-8 h-8 rounded-ui-s bg-ui-accent text-white flex items-center justify-center font-ui-mono text-ui-s font-ui-bold">
          w
        </div>
        <span className="font-ui-mono text-ui-m font-ui-semibold tracking-ui-tight">
          wframe
        </span>
      </div>
      {user && (
        <button
          onClick={onLogout}
          className="w-8 h-8 rounded-full bg-ui-accent-soft text-ui-accent flex items-center justify-center font-ui-semibold text-ui-s hover:opacity-80 transition-opacity duration-ui-fast ease-ui-out"
          title="Sign out"
        >
          {initial}
        </button>
      )}
    </header>
  );
}
