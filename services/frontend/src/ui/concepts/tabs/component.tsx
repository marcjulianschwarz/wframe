// @ui-source: concepts/tabs@0.1.0
// Managed copy. Edits here are local to this app.
// Improvements belong back in the ui repo's concepts/tabs — port
// them there and bump the version. Do not treat this as throwaway code.
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs(component: string): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error(`<${component}> must be used inside <Tabs>`);
  }
  return ctx;
}

interface TabsProps {
  /** id of the currently selected tab */
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export function Tabs({
  value,
  onValueChange,
  children,
  className = "",
}: TabsProps) {
  const baseId = useId();
  return (
    <TabsContext.Provider value={{ value, setValue: onValueChange, baseId }}>
      <div className={`flex flex-col gap-m ${className}`}>{children}</div>
    </TabsContext.Provider>
  );
}

interface TabListProps {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}

export function TabList({
  children,
  className = "",
  "aria-label": ariaLabel,
}: TabListProps) {
  const { value } = useTabs("TabList");
  const listRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  // Measure the active tab and slide the shared underline under it. Runs after
  // layout so the bar lands on the right spot before paint, and re-measures on
  // selection change and container resize.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLButtonElement>('[aria-selected="true"]');
    if (!active) return;
    setIndicator({
      left: active.offsetLeft,
      width: active.offsetWidth,
      ready: true,
    });
  }, [value]);

  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const active = list.querySelector<HTMLButtonElement>(
        '[aria-selected="true"]',
      );
      if (active) {
        setIndicator((prev) => ({
          ...prev,
          left: active.offsetLeft,
          width: active.offsetWidth,
        }));
      }
    });
    ro.observe(list);
    return () => ro.disconnect();
  }, []);

  // Roving arrow-key navigation across the enabled tabs.
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(e.key)) return;
    const tabs = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]:not(:disabled)',
      ) ?? [],
    );
    if (tabs.length === 0) return;
    const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
    let next = current;
    if (e.key === "ArrowLeft") next = (current - 1 + tabs.length) % tabs.length;
    if (e.key === "ArrowRight") next = (current + 1) % tabs.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = tabs.length - 1;
    e.preventDefault();
    tabs[next]?.focus();
    tabs[next]?.click();
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={`relative flex items-center gap-l border-b border-ui-border ${className}`}
    >
      {children}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-px h-0.5 bg-ui-accent transition-all duration-base ease-out"
        style={{
          left: indicator.left,
          width: indicator.width,
          opacity: indicator.ready ? 1 : 0,
        }}
      />
    </div>
  );
}

interface TabProps {
  /** unique id that pairs this tab with its panel */
  value: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function Tab({ value, children, disabled, className = "" }: TabProps) {
  const { value: selected, setValue, baseId } = useTabs("Tab");
  const active = selected === value;
  return (
    <button
      role="tab"
      type="button"
      id={`${baseId}-tab-${value}`}
      aria-selected={active}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={active ? 0 : -1}
      disabled={disabled}
      onClick={() => setValue(value)}
      className={`inline-flex items-center justify-center gap-s px-xs pb-s font-semibold text-m leading-none transition-colors duration-fast ease-out focus:outline-none focus-visible:!shadow-none focus-visible:!rounded-none focus-visible:text-ui-primary disabled:opacity-50 disabled:pointer-events-none ${
        active
          ? "text-ui-primary"
          : "text-ui-secondary hover:text-ui-primary"
      } ${className}`}
    >
      {children}
    </button>
  );
}

interface TabPanelProps {
  /** must match the `value` of the owning <Tab> */
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabPanel({ value, children, className = "" }: TabPanelProps) {
  const { value: selected, baseId } = useTabs("TabPanel");
  if (selected !== value) return null;
  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      tabIndex={0}
      className={className}
    >
      {children}
    </div>
  );
}
