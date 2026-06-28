import { type User } from "@/lib/api";

interface Props {
  user: User | null;
  onLogout: () => void;
}

export function Header({ user, onLogout }: Props) {
  const initial = user?.email?.[0]?.toUpperCase() ?? "?";
  return (
    <header className="w-full flex items-center justify-between px-l py-m">
      <div className="flex items-center gap-s">
        <div className="w-8 h-8 rounded-s bg-highlight text-white flex items-center justify-center font-mono text-s font-bold">
          w
        </div>
        <span className="font-mono text-m font-semibold tracking-tight">
          wframe
        </span>
      </div>
      {user && (
        <button
          onClick={onLogout}
          className="w-8 h-8 rounded-full bg-highlight-soft text-highlight flex items-center justify-center font-semibold text-s hover:opacity-80 transition-opacity duration-fast ease-out"
          title="Sign out"
        >
          {initial}
        </button>
      )}
    </header>
  );
}
