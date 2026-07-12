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
    <div className="flex flex-col gap-ui-s">
      <div className="flex flex-col gap-ui-xs">
        <span className="text-ui-s text-ui-secondary">Icon</span>
        <div className="flex flex-wrap gap-ui-xs">
          {EPAPER_ICONS.map(({ id, Icon }) => {
            const active = id === value.icon;
            return (
              <button
                key={id}
                type="button"
                aria-label={`Icon ${id}`}
                aria-pressed={active}
                onClick={() => onChange({ ...value, icon: id })}
                className={`flex h-9 w-9 items-center justify-center rounded-ui-s border transition-colors duration-ui-fast ${
                  active
                    ? "border-ui-accent text-ui-accent bg-ui-surface-hover"
                    : "border-ui-border text-ui-secondary hover:bg-ui-surface-hover hover:text-ui-primary"
                }`}
              >
                <Icon size={18} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-ui-xs">
        <span className="text-ui-s text-ui-secondary">Color</span>
        <div className="flex flex-wrap gap-ui-xs">
          {EPAPER_COLORS.map(({ id, swatch }) => {
            const active = id === value.color;
            return (
              <button
                key={id}
                type="button"
                aria-label={`Color ${id}`}
                aria-pressed={active}
                onClick={() => onChange({ ...value, color: id })}
                className={`flex h-9 w-9 items-center justify-center rounded-ui-s border transition-colors duration-ui-fast ${
                  active ? "border-ui-accent" : "border-transparent hover:border-ui-border"
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
