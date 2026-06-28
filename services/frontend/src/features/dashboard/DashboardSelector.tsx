import { type DashboardOption, type DashboardType } from "@/lib/api";

interface Props {
  options: DashboardOption[];
  selected: DashboardType | undefined;
  onSelect: (t: DashboardType) => void;
  disabled?: boolean;
}

export function DashboardSelector({ options, selected, onSelect, disabled }: Props) {
  return (
    <div className="grid gap-m grid-cols-1 sm:grid-cols-2">
      {options.map((opt) => {
        const active = selected === opt.type;
        return (
          <button
            key={opt.type}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(opt.type)}
            className={`text-left p-m rounded-n border transition-all duration-fast ease-out flex flex-col gap-xs ${
              active
                ? "bg-highlight-soft border-highlight"
                : "bg-bg-1-light border-border-1 hover:border-border-2"
            } disabled:opacity-50`}
          >
            <div className="font-semibold text-fg-1">{opt.title}</div>
            <div className="text-s text-fg-2">{opt.description}</div>
            <div className="text-s font-mono text-fg-2 mt-s">
              dashboard/{opt.type}
            </div>
          </button>
        );
      })}
    </div>
  );
}
