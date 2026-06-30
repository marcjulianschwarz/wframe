import {
  Tv,
  Monitor,
  Newspaper,
  Calendar,
  CloudSun,
  Image,
  LayoutDashboard,
  Home,
  type LucideIcon,
} from "lucide-react";

/** Per-device icon + color are a purely cosmetic, client-side choice — the
 * Epaper API has no field for them — so we persist the user's pick in
 * localStorage keyed by device id. */

export interface EpaperAppearance {
  icon: string;
  color: string;
}

export const EPAPER_ICONS: { id: string; Icon: LucideIcon }[] = [
  { id: "tv", Icon: Tv },
  { id: "monitor", Icon: Monitor },
  { id: "newspaper", Icon: Newspaper },
  { id: "calendar", Icon: Calendar },
  { id: "weather", Icon: CloudSun },
  { id: "image", Icon: Image },
  { id: "dashboard", Icon: LayoutDashboard },
  { id: "home", Icon: Home },
];

/** Tailwind-purge-safe full class names: bg tint + matching foreground. */
export const EPAPER_COLORS: { id: string; bg: string; fg: string; swatch: string }[] = [
  { id: "slate", bg: "bg-slate-500/15", fg: "text-slate-500", swatch: "bg-slate-500" },
  { id: "blue", bg: "bg-blue-500/15", fg: "text-blue-500", swatch: "bg-blue-500" },
  { id: "emerald", bg: "bg-emerald-500/15", fg: "text-emerald-500", swatch: "bg-emerald-500" },
  { id: "amber", bg: "bg-amber-500/15", fg: "text-amber-500", swatch: "bg-amber-500" },
  { id: "rose", bg: "bg-rose-500/15", fg: "text-rose-500", swatch: "bg-rose-500" },
  { id: "violet", bg: "bg-violet-500/15", fg: "text-violet-500", swatch: "bg-violet-500" },
  { id: "cyan", bg: "bg-cyan-500/15", fg: "text-cyan-500", swatch: "bg-cyan-500" },
  { id: "fuchsia", bg: "bg-fuchsia-500/15", fg: "text-fuchsia-500", swatch: "bg-fuchsia-500" },
];

const DEFAULT: EpaperAppearance = { icon: "tv", color: "slate" };

const KEY = "wframe.epaper.appearance";

function readAll(): Record<string, EpaperAppearance> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, EpaperAppearance>) : {};
  } catch {
    return {};
  }
}

export function getAppearance(id: string): EpaperAppearance {
  return { ...DEFAULT, ...readAll()[id] };
}

export function setAppearance(id: string, appearance: EpaperAppearance): void {
  const all = readAll();
  all[id] = appearance;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage full or unavailable — appearance is cosmetic, so ignore */
  }
}

export function iconFor(id: string): LucideIcon {
  return (EPAPER_ICONS.find((i) => i.id === id) ?? EPAPER_ICONS[0]).Icon;
}

export function colorFor(id: string) {
  return EPAPER_COLORS.find((c) => c.id === id) ?? EPAPER_COLORS[0];
}
