import {
  EPAPER_COLORS,
  EPAPER_ICONS,
  type EpaperAppearance,
} from "./appearance";

/** Lets the user pick the device's badge icon and color. Controlled — the
 * parent owns the value and persists it. */
export function AppearancePicker({
  value,
  onChange,
}: {
  value: EpaperAppearance;
  onChange: (next: EpaperAppearance) => void;
}) {
  return (
    <div className="flex flex-col gap-s">
      <div className="flex flex-col gap-xs">
        <span className="text-s text-fg-2">Icon</span>
        <div className="flex flex-wrap gap-xs">
          {EPAPER_ICONS.map(({ id, Icon }) => {
            const active = id === value.icon;
            return (
              <button
                key={id}
                type="button"
                aria-label={`Icon ${id}`}
                aria-pressed={active}
                onClick={() => onChange({ ...value, icon: id })}
                className={`flex h-9 w-9 items-center justify-center rounded-s border transition-colors duration-fast ${
                  active
                    ? "border-ui-accent text-ui-accent bg-bg-hover"
                    : "border-border-1 text-fg-2 hover:bg-bg-hover hover:text-fg-1"
                }`}
              >
                <Icon size={18} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-xs">
        <span className="text-s text-fg-2">Color</span>
        <div className="flex flex-wrap gap-xs">
          {EPAPER_COLORS.map(({ id, swatch }) => {
            const active = id === value.color;
            return (
              <button
                key={id}
                type="button"
                aria-label={`Color ${id}`}
                aria-pressed={active}
                onClick={() => onChange({ ...value, color: id })}
                className={`flex h-9 w-9 items-center justify-center rounded-s border transition-colors duration-fast ${
                  active ? "border-ui-accent" : "border-transparent hover:border-border-1"
                }`}
              >
                <span className={`h-5 w-5 rounded-full ${swatch}`} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
